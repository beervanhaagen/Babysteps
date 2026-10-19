// End-to-end test of the family mail (step 7) against the local stack, with Mailpit as the
// inbox. Needs `npx supabase start`. Run: node scripts/check-family-mail.mjs
import { execFileSync } from 'node:child_process';

const API = 'http://127.0.0.1:55321/functions/v1';
const MAILPIT = 'http://127.0.0.1:55324';
const stamp = Date.now();
const oma = `e2e-oma-${stamp}@voorbeeld.nl`;
const parent = crypto.randomUUID();
let failures = 0;

function check(ok, label) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}

function sql(query) {
  return execFileSync('docker', ['exec', 'supabase_db_teddysteps', 'psql', '-U', 'postgres', '-tA', '-c', query], { encoding: 'utf8' }).trim();
}

async function family(path, body, cookie) {
  const response = await fetch(`${API}/family-api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const set = response.headers.get('set-cookie');
  return { status: response.status, json: await response.json().catch(() => ({})), cookie: set ? set.split(';')[0] : cookie };
}

async function mailTo(address, subject) {
  for (let i = 0; i < 30; i++) {
    const found = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`)).json()).messages ?? [];
    const message = found.find((m) => m.Subject.startsWith(subject));
    if (message) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const headers = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}/headers`)).json();
      return { ...full, headers, count: found.filter((m) => m.Subject.startsWith(subject)).length };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

// A parent with Noor's trail and an invite for Oma Ria.
sql(`insert into auth.users (instance_id, id, aud, role, email) values ('00000000-0000-0000-0000-000000000000', '${parent}', 'authenticated', 'authenticated', 'e2e-parent-${stamp}@voorbeeld.nl')`);
const asParent = `set role authenticated; set request.jwt.claims = '{"sub": "${parent}", "role": "authenticated"}';`;
sql(`${asParent} select public.create_trail('Noor', '2026-04-02', '2026-04-10');`);
const code = sql(`${asParent} select code from public.invite_family('Oma Ria', 'oma');`).split('\n').pop();
const trail = sql(`select trail_id from public.trail_parents where user_id = '${parent}'`);

// F2: Oma opens her link and gives her address.
const claim = await family('/claim', { code });
check(claim.status === 200, 'Oma opens her invite link');
const join = await family('/join', { label: 'Oma Ria', email: oma, frequency: 'each' }, claim.cookie);
check(join.json.confirm === true, 'a new address asks for confirmation');
const confirmMail = await mailTo(oma, 'Bevestig je e-mailadres');
check(Boolean(confirmMail), 'the confirmation mail arrives');
check(!confirmMail.Text.includes('Noor') && !confirmMail.Text.includes('Oma Ria'), 'it names no child and no label');
const confirmCode = confirmMail.Text.match(/\/bevestig#([A-Za-z0-9_-]+)/)?.[1];
check((await family('/confirm', { code: 'x'.repeat(43) })).status === 404, 'a wrong code confirms nothing');
check((await family('/confirm', { code: confirmCode })).status === 200, '"Ja, dit is mijn adres" confirms');
check(sql(`select email_frequency || ' ' || (email_confirmed_at is not null) from public.circle_members where email = '${oma}'`) === 'weekly true', 'confirmed, and "each" became weekly');

// A ready moment this week, with a caption that tries HTML; then Sunday 20:30.
const sunday = new Date('2026-11-08T19:30:00Z');
sql(`insert into public.moments (trail_id, created_by, client_id, trail_week, caption, photo_count, status, ready_at) values ('${trail}', '${parent}', gen_random_uuid(), 31, '<b>Geklapt</b>', 1, 'ready', '${new Date(sunday - 3600e3).toISOString()}')`);
const run = async () => (await fetch(`${API}/family-mail`, { method: 'POST', headers: { 'x-cron-secret': 'local-cron-secret', 'content-type': 'application/json' }, body: JSON.stringify({ at: sunday.toISOString() }) })).json();
check((await fetch(`${API}/family-mail`, { method: 'POST' })).status === 403, 'the Sunday run needs the secret');
const first = await run();
check(first.sent >= 1, 'the Sunday run sends');
const f8 = await mailTo(oma, 'Deze week bij Noor');
check(Boolean(f8) && f8.Subject === 'Deze week bij Noor: 1 nieuw moment', 'F8 arrives: "Deze week bij Noor: 1 nieuw moment"');
check(f8.HTML.includes('&lt;b&gt;Geklapt&lt;/b&gt;') && !f8.HTML.includes('<b>Geklapt'), 'the caption is plain text, not HTML');
check(!/<img/i.test(f8.HTML), 'no images');
check(f8.HTML.includes('Hoi Oma Ria,') && f8.From.Name === 'Noor via TeddySteps', 'from "Noor via TeddySteps", to "Oma Ria"');
const hosts = [...f8.HTML.matchAll(/https?:\/\/([^/"]+)/g)].map((m) => m[1]);
check(hosts.every((h) => h === 'localhost:8090'), 'links only to the family page');
const unsubscribeHeader = f8.headers['List-Unsubscribe']?.[0] ?? '';
check(/\/api\/afmelden\/[0-9a-f-]{36}\.[0-9a-f]{32}>$/.test(unsubscribeHeader) && f8.headers['List-Unsubscribe-Post']?.[0] === 'List-Unsubscribe=One-Click', 'one-click unsubscribe headers');
await run();
check((await mailTo(oma, 'Deze week bij Noor')).count === 1, 'a second run sends nothing more');

// The link in the mail opens the trail on a new device.
const mailCode = f8.Text.match(/\/m#([A-Za-z0-9_-]+)/)?.[1];
check((await family('/claim', { code: mailCode })).status === 200, 'the link in the mail opens the trail on another device');

// One click from the mail app: no origin header, just the sealed token.
const token = unsubscribeHeader.match(/afmelden\/([^>]+)>/)[1];
const forged = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
const post = (t) => fetch(`${API}/family-api/afmelden/${t}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
check((await post(forged)).status === 404, 'a forged unsubscribe link does nothing');
check((await post(token)).status === 200, 'one-click unsubscribe works');
check(sql(`select coalesce(email, 'weg') || ' ' || email_frequency from public.circle_members where label = 'Oma Ria' and trail_id = '${trail}'`) === 'weg never', 'the address is wiped');

sql(`delete from public.trails where id = '${trail}'; delete from auth.users where id = '${parent}'`);
console.log(failures ? `${failures} failed` : 'All family mail checks passed.');
process.exit(failures ? 1 : 0);
