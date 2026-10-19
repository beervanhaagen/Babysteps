// The nightly purge: moments deleted more than 30 days ago (or stuck uploading for 30 days) lose
// their files first, through the storage API, and then their rows. Called by pg_cron with the
// shared secret. Safe to run twice: files already gone are fine, and purge_moment checks again.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CRON_SECRET = Deno.env.get('CRON_SECRET');

type Candidate = { moment: string; view_paths: string[]; print_paths: string[] };

Deno.serve(async (request) => {
  if (!CRON_SECRET || request.headers.get('x-cron-secret') !== CRON_SECRET) return new Response(null, { status: 403 });
  const { data, error } = await service.rpc('purge_candidates');
  if (error) {
    console.error('purge: selection failed');
    return new Response(null, { status: 500 });
  }
  const counts = { purged: 0, failed: 0 };
  for (const item of (data ?? []) as Candidate[]) {
    const views = item.view_paths.length ? await service.storage.from('view').remove(item.view_paths) : { error: null };
    const prints = item.print_paths.length ? await service.storage.from('print').remove(item.print_paths) : { error: null };
    // Rows only go once the files are gone, so nothing is ever left without a way to find it.
    if (views.error || prints.error) {
      counts.failed++;
      console.error(`purge: files of ${item.moment} not removed`);
      continue;
    }
    const { error: rowError } = await service.rpc('purge_moment', { moment: item.moment });
    if (rowError) console.error(`purge: row of ${item.moment} not removed`);
    counts[rowError ? 'failed' : 'purged']++;
  }
  console.log(`purge: ${JSON.stringify(counts)}`);
  return Response.json(counts);
});
