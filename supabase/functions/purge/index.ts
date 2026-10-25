// The purge, every hour (pg_cron, with the shared secret). Three kinds of things, each files
// first (through the storage API) and only then the rows, so nothing is ever left without a way
// to find it. Safe to run twice; stops after ~100 seconds and carries on in the next run.
//   1. moments deleted more than 30 days ago (or stuck uploading for 30 days);
//   2. trails whose 30 days are over (M7), or that asked to be wiped right away;
//   3. accounts whose 30 days are over, once their trail is gone: a last mail, then the Auth API.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { C, COMPANY, frame, send, SERIF, SIGN_OFF } from '../_shared/mail.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CRON_SECRET = Deno.env.get('CRON_SECRET');
const BUDGET_MS = 100_000;

type Candidate = { moment: string; view_paths: string[]; print_paths: string[] };

/**
 * The last mail, after everything is gone (Apple asks for a confirmation). `trailStays`: only this
 * account went, and the trail and its photos stay with the other parent.
 */
function goneMail(trailStays: boolean) {
  const line = trailStays
    ? 'Je account bij TeddySteps is nu gewist. Het pad en de foto’s blijven bij de andere ouder.'
    : 'Je account en je pad zijn nu helemaal gewist, met alle foto’s en momenten.';
  const text = `Hoi,

${line} Dit is de laatste mail die je van ons krijgt.

Bedankt dat we een stukje van jullie eerste tijd mochten bewaren.

Liefs, TeddySteps

${COMPANY}`;
  const html = frame(
    'Gewist',
    `<p style="margin:0 0 14px;">Hoi,</p>
<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:32px;font-weight:bold;color:${C.ink};">${trailStays ? 'Je account is gewist' : 'Alles is gewist'}</h1>
<p style="margin:0 0 14px;">${line} Dit is de laatste mail die je van ons krijgt.</p>
<p style="margin:0;">Bedankt dat we een stukje van jullie eerste tijd mochten bewaren.</p>
${SIGN_OFF}`,
    COMPANY,
    'Dit is de laatste mail die je van ons krijgt.',
  );
  return { subject: 'Je account bij TeddySteps is gewist', text, html };
}

Deno.serve(async (request) => {
  if (!CRON_SECRET || request.headers.get('x-cron-secret') !== CRON_SECRET) return new Response(null, { status: 403 });
  const started = Date.now();
  const late = () => Date.now() - started > BUDGET_MS;
  const counts = { purged: 0, failed: 0, trails: 0, accounts: 0 };

  // 1. Moments.
  const { data, error } = await service.rpc('purge_candidates');
  if (error) {
    console.error('purge: selection failed');
    return new Response(null, { status: 500 });
  }
  for (const item of (data ?? []) as Candidate[]) {
    if (late()) break;
    const views = item.view_paths.length ? await service.storage.from('view').remove(item.view_paths) : { error: null };
    const prints = item.print_paths.length ? await service.storage.from('print').remove(item.print_paths) : { error: null };
    if (views.error || prints.error) {
      counts.failed++;
      console.error(`purge: files of ${item.moment} not removed`);
      continue;
    }
    const { error: rowError } = await service.rpc('purge_moment', { moment: item.moment });
    if (rowError) console.error(`purge: row of ${item.moment} not removed`);
    counts[rowError ? 'failed' : 'purged']++;
  }

  // 2. Trails: from here on "Toch bewaren" no longer works for them.
  const { data: trails } = await service.rpc('trails_to_purge');
  for (const trail of (trails ?? []) as string[]) {
    // One stuck trail never holds up the others or the accounts: on to the next, try again next hour.
    let stuck = false;
    for (;;) {
      if (late() || stuck) break;
      const { data: files, error: listError } = await service.rpc('trail_files', { trail });
      if (listError) {
        stuck = true;
        break;
      }
      const list = (files ?? []) as { bucket: string; name: string }[];
      if (!list.length) break;
      for (const bucket of ['view', 'print']) {
        const names = list.filter((f) => f.bucket === bucket).map((f) => f.name);
        if (names.length) {
          const { error: removeError } = await service.storage.from(bucket).remove(names);
          if (removeError) {
            console.error(`purge: files of trail ${trail} not removed`);
            counts.failed++;
            stuck = true;
          }
        }
      }
    }
    if (late()) break;
    if (stuck) continue;
    const { data: gone } = await service.rpc('purge_trail', { trail });
    if (gone) counts.trails++;
  }

  // 3. Accounts, once their trail is gone.
  if (!late()) {
    const { data: accounts } = await service.rpc('accounts_to_purge');
    for (const account of (accounts ?? []) as { user_id: string; email: string | null; trail_stays: boolean }[]) {
      if (late()) break;
      const { error: releaseError } = await service.rpc('release_account', { account: account.user_id });
      if (releaseError) {
        console.error(`purge: account ${account.user_id} not released`);
        counts.failed++;
        continue;
      }
      const { error: deleteError } = await service.auth.admin.deleteUser(account.user_id);
      if (deleteError) {
        console.error(`purge: account ${account.user_id} not deleted: ${deleteError.message}`);
        counts.failed++;
        continue;
      }
      counts.accounts++;
      // Its own "user deleted" log line goes too, and no trail is ever left without a parent.
      await service.rpc('after_account_purge', { account: account.user_id });
      if (account.email) await send({ to: account.email, idempotencyKey: `gone:${account.user_id}`, ...goneMail(account.trail_stays) }).catch(() => false);
    }
  }

  console.log(`purge: ${JSON.stringify(counts)}`);
  return Response.json(counts);
});
