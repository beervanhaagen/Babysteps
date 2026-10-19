// End-to-end test of the nightly purge (T8) against the local stack: a moment deleted more than
// 30 days ago loses its files in both buckets and its rows; a second run is harmless.
// Needs `npx supabase start`. Run: node scripts/check-purge.mjs
import { execFileSync } from 'node:child_process';

const API = 'http://127.0.0.1:55321';
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_teddysteps', 'psql', '-U', 'postgres', '-tA', '-c', q], { encoding: 'utf8' }).trim();
const key = JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' })).SERVICE_ROLE_KEY;
const parent = crypto.randomUUID();
const moment = crypto.randomUUID();
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
};
const storage = (method, path, body) =>
  fetch(`${API}/storage/v1/object/${path}`, { method, headers: { authorization: `Bearer ${key}`, apikey: key, 'content-type': 'image/jpeg', 'x-upsert': 'true' }, body });

sql(`insert into auth.users (instance_id, id, aud, role, email) values ('00000000-0000-0000-0000-000000000000', '${parent}', 'authenticated', 'authenticated', 'purge-${parent.slice(0, 8)}@voorbeeld.nl')`);
sql(`set role authenticated; set request.jwt.claims = '{"sub": "${parent}", "role": "authenticated"}'; select public.create_trail('Purge', '2026-01-01', '2026-01-01');`);
const trail = sql(`select trail_id from public.trail_parents where user_id = '${parent}'`);
const path = (name) => `${trail}/${moment}/${name}`;
sql(`insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status, ready_at, deleted_at) values ('${moment}', '${trail}', '${parent}', gen_random_uuid(), 3, 1, 'ready', now(), now() - interval '31 days')`);
sql(`insert into public.moment_photos (moment_id, trail_id, position, width, height, print_long_edge, print_path, view_path, small_path) values ('${moment}', '${trail}', 0, 10, 10, 3600, '${path('0-print.jpg')}', '${path('0-view.webp')}', '${path('0-small.jpg')}')`);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
for (const [bucket, name] of [['print', '0-print.jpg'], ['view', '0-view.webp'], ['view', '0-small.jpg']]) await storage('POST', `${bucket}/${path(name)}`, jpeg);
const count = () => Number(sql(`select count(*) from storage.objects where name like '${trail}/${moment}/%'`));
check(count() === 3, 'three files stored for the deleted moment');

const run = () => fetch(`${API}/functions/v1/purge`, { method: 'POST', headers: { 'x-cron-secret': 'local-cron-secret' } }).then((r) => r.json());
check((await fetch(`${API}/functions/v1/purge`, { method: 'POST' })).status === 403, 'the purge needs the secret');
const first = await run();
check(first.purged >= 1, 'the purge runs');
check(count() === 0, 'the files are gone from both buckets');
check(sql(`select count(*) from public.moments where id = '${moment}'`) === '0', 'and the moment itself');
const second = await run();
check(second.failed === 0, 'a second run is harmless');

sql(`delete from public.trails where id = '${trail}'; delete from auth.users where id = '${parent}'`);
console.log(failures ? `${failures} failed` : 'All purge checks passed.');
process.exit(failures ? 1 : 0);
