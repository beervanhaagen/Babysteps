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

// Through the Auth admin API, as real accounts are made, so the purge can delete it the same way.
const made = await fetch(`${API}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { authorization: `Bearer ${key}`, apikey: key, 'content-type': 'application/json' },
  body: JSON.stringify({ id: parent, email: `purge-${parent.slice(0, 8)}@voorbeeld.nl`, email_confirm: true }),
});
if (!made.ok) throw new Error(`could not make the test user: ${made.status} ${await made.text()}`);
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

// M7: the whole trail and then the account, once their 30 days are over.
const moment2 = crypto.randomUUID();
const path2 = (name) => `${trail}/${moment2}/${name}`;
sql(`insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status, ready_at) values ('${moment2}', '${trail}', '${parent}', gen_random_uuid(), 4, 1, 'ready', now())`);
sql(`insert into public.moment_photos (moment_id, trail_id, position, width, height, print_long_edge, print_path, view_path, small_path) values ('${moment2}', '${trail}', 0, 10, 10, 3600, '${path2('0-print.jpg')}', '${path2('0-view.webp')}', '${path2('0-small.jpg')}')`);
for (const [bucket, name] of [['print', '0-print.jpg'], ['view', '0-view.webp'], ['view', '0-small.jpg']]) await storage('POST', `${bucket}/${path2(name)}`, jpeg);
const trailFiles = () => Number(sql(`select count(*) from storage.objects where name like '${trail}/%'`));
check(trailFiles() === 3, 'three files on the trail that is being deleted');
sql(`update public.trails set delete_requested_at = now(), purge_after = now() - interval '1 minute' where id = '${trail}'; update public.profiles set delete_requested_at = now(), purge_after = now() - interval '1 minute' where id = '${parent}'`);
const third = await run();
check(third.trails === 1, 'the purge wipes the trail');
check(trailFiles() === 0, 'with every file');
check(sql(`select count(*) from public.trails where id = '${trail}'`) === '0', 'and its rows');
// The account goes in the same run once its trail is gone, or the next.
if (third.accounts !== 1) await run();
check(sql(`select count(*) from auth.users where id = '${parent}'`) === '0', 'then the account itself');

sql(`delete from public.trails where id = '${trail}'; delete from auth.users where id = '${parent}'`);
console.log(failures ? `${failures} failed` : 'All purge checks passed.');
process.exit(failures ? 1 : 0);
