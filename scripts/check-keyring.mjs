// End-to-end test of the keyring: one browser following two grandchildren, against the local
// stack. Needs `npx supabase start`. Run: node scripts/check-keyring.mjs
import { execFileSync } from 'node:child_process';

const API = 'http://127.0.0.1:55321/functions/v1';
const stamp = Date.now();
let failures = 0;

function check(ok, label) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}

function sql(query) {
  return execFileSync('docker', ['exec', 'supabase_db_teddysteps', 'psql', '-U', 'postgres', '-tA', '-c', query], { encoding: 'utf8' }).trim();
}

/** One browser: keeps the cookie the way a browser does. */
let jar = '';
async function family(path, { body, kring } = {}) {
  const response = await fetch(`${API}/family-api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'sec-fetch-site': 'same-origin',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(jar ? { cookie: jar } : {}),
      ...(kring ? { 'x-kring': kring } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = response.headers.get('set-cookie');
  if (set) jar = /Max-Age=0/.test(set) ? '' : set.split(';')[0];
  return { status: response.status, json: await response.json().catch(() => ({})) };
}

function trailWithOma(child) {
  const parent = crypto.randomUUID();
  sql(`insert into auth.users (instance_id, id, aud, role, email) values ('00000000-0000-0000-0000-000000000000', '${parent}', 'authenticated', 'authenticated', 'e2e-ring-${child}-${stamp}@voorbeeld.nl')`);
  const asParent = `set role authenticated; set request.jwt.claims = '{"sub": "${parent}", "role": "authenticated"}';`;
  sql(`${asParent} select public.create_trail('${child}', '2026-04-02', '2026-04-10');`);
  const [member, code] = sql(`${asParent} select member_id || '|' || code from public.invite_family('Oma Ria', 'oma');`).split('\n').pop().split('|');
  return { parent, asParent, member, code };
}

const lotte = trailWithOma('Lotte');
const noa = trailWithOma('Noa');

const first = await family('/claim', { body: { code: lotte.code } });
check(first.status === 200 && first.json.member === lotte.member, 'Oma opens Lottes link');
const second = await family('/claim', { body: { code: noa.code } });
check(second.status === 200 && second.json.member === noa.member, 'then Noa’s, on the same phone');
check(jar.split('=')[1].split('.').length === 2, 'the cookie now holds two keys');

const ring = await family('/kinderen');
check(ring.status === 200 && ring.json.children.map((c) => c.firstName).sort().join() === 'Lotte,Noa', 'the start page lists both children');

const asLotte = await family('/page?wide=0', { kring: lotte.member });
check(asLotte.status === 200 && asLotte.json.child.firstName === 'Lotte' && asLotte.json.member === lotte.member, 'asking for Lotte shows Lotte');
const asNoa = await family('/page?wide=0', { kring: noa.member });
check(asNoa.status === 200 && asNoa.json.child.firstName === 'Noa', 'asking for Noa shows Noa');

// Switching back and forth with the links never makes a new device.
for (let i = 0; i < 6; i++) await family('/claim', { body: { code: i % 2 ? noa.code : lotte.code } });
check(sql(`select count(*) from private.family_sessions where circle_member_id in ('${lotte.member}', '${noa.member}')`) === '2', 'switching links six times keeps two sessions, not twelve');

// The main test: a member id whose key is not on this browser gets nothing.
const stranger = trailWithOma('Sam');
const forged = await family('/page?wide=0', { kring: stranger.member });
check(forged.status === 401, 'a made-up child id gets no page');
const forgedHug = await family('/views', { body: { skip: 0, count: 5 }, kring: stranger.member });
check(forgedHug.status === 401, 'nor anything else');

// A parent takes Oma off Noa's circle: Noa's key drops out of the cookie, Lotte stays.
sql(`${noa.asParent} select public.revoke_family('${noa.member}');`);
const after = await family('/kinderen');
check(after.json.children?.length === 1 && after.json.children[0].firstName === 'Lotte', 'a revoked circle leaves the start page');
check(jar.split('=')[1].split('.').length === 1, 'and its key leaves the cookie');
const stillLotte = await family('/page?wide=0');
check(stillLotte.status === 200 && stillLotte.json.child.firstName === 'Lotte', 'Lotte still opens');

// Reacting with icons, as Oma on Lotte's page.
const moment = crypto.randomUUID();
sql(`insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status) select '${moment}', trail_id, user_id, gen_random_uuid(), 1, 1, 'ready' from public.trail_parents where user_id = '${lotte.parent}'`);
const heart = await family('/react', { body: { moment, kind: 'heart' }, kring: lotte.member });
check(heart.status === 200 && heart.json.reactions?.heart?.mine === 1, 'Oma sends a heart');
const odd = await family('/react', { body: { moment, kind: 'poop' }, kring: lotte.member });
check(odd.status === 422, 'only our own icons');
const shown = await family('/page?wide=0', { kring: lotte.member });
check(shown.json.moments?.find((m) => m.id === moment)?.reactions?.heart?.total === 1, 'the page shows the heart');

// "Ik wil niet meer meekijken" for Lotte takes only Lotte's key.
await family('/claim', { body: { code: stranger.code } });
await family('/leave', { body: {}, kring: lotte.member });
const left = await family('/kinderen');
check(left.json.children?.length === 1 && left.json.children[0].firstName === 'Sam', 'leaving one child keeps the other key');

console.log(failures ? `${failures} keyring check(s) failed.` : 'All keyring checks passed.');
process.exit(failures ? 1 : 0);
