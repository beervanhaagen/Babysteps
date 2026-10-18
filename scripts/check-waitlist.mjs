// End-to-end test of the pre-registration against the local stack. Needs `npx supabase start`
// and the landing page with the form: SIGNUP=local npm run landing (port 8095).
// Run: node scripts/check-waitlist.mjs
import { execFileSync } from 'node:child_process';

const SITE = 'http://localhost:8095';
const MAILPIT = 'http://127.0.0.1:55324';
const stamp = Date.now();
let failures = 0;

function check(ok, label) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}

function sql(query) {
  return execFileSync('docker', ['exec', 'supabase_db_teddysteps', 'psql', '-U', 'postgres', '-tAc', query], { encoding: 'utf8' }).trim();
}

async function post(path, fields, headers = { 'sec-fetch-site': 'same-origin' }, type = 'application/x-www-form-urlencoded') {
  const response = await fetch(SITE + path, { method: 'POST', redirect: 'manual', headers: { 'content-type': type, ...headers }, body: new URLSearchParams(fields).toString() });
  return response.headers.get('location');
}

async function mailsTo(address) {
  const search = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`)).json();
  return search.messages ?? [];
}

async function linkFor(address) {
  for (let i = 0; i < 20; i++) {
    const [message] = await mailsTo(address);
    if (message) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      return full.Text.match(/http:\/\/localhost:8095\/bevestig\/[A-Za-z0-9_-]+/)?.[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

sql('delete from private.signup_attempts');
const ria = `e2e-ria-${stamp}@voorbeeld.nl`;
const kim = `e2e-kim-${stamp}@voorbeeld.nl`;

check((await post('/api/aanmelden', { email: ria, soort: 'nieuws' }, { origin: 'https://elders.example' })) === '/aanmelden-mislukt', 'a form on another site is refused');
check((await post('/api/aanmelden', { email: ria, soort: 'nieuws' }, undefined, 'text/plain')) === '/aanmelden-mislukt', 'only a plain form post is accepted');
check((await post('/api/aanmelden', { email: `bot-${stamp}@voorbeeld.nl`, soort: 'nieuws', website: 'spam' })) === '/aangemeld', 'a bot sees the normal thank-you page');
check(sql(`select count(*) from private.waitlist where email = 'bot-${stamp}@voorbeeld.nl'`) === '0', 'but nothing of the bot is stored');

check((await post('/api/aanmelden', { email: ria, soort: 'testen', maand: '2026-05' })) === '/aangemeld', 'signing up leads to "kijk in je mailbox"');
check(sql(`select wants_test || ' ' || baby_month from private.waitlist where email = '${ria}'`) === 'true 2026-05-01', 'wanting to test and the month are stored');
const link = await linkFor(ria);
check(Boolean(link), 'the confirmation mail arrives with a link');
const code = link.split('/').pop();
const page = await (await fetch(link)).text();
check(page.includes('Was jij dit') && !page.includes(code), 'the link opens the button page, which does not repeat the code');
check(sql(`select confirmed_at is null from private.waitlist where email = '${ria}'`) === 't', 'just opening the link confirms nothing');
check((await post(new URL(link).pathname, { actie: 'ja' })) === '/bevestigd', '"Ja, zet me op de lijst" confirms');
check(sql(`select confirmed_at is not null from private.waitlist where email = '${ria}'`) === 't', 'and the address is confirmed');
check((await post(new URL(link).pathname, { actie: 'ja' })) === '/link-verlopen', 'the link works only once');

check((await post('/api/aanmelden', { email: ria, soort: 'nieuws' })) === '/aangemeld', 'signing up again looks the same');
check((await mailsTo(ria)).length === 1, 'but sends no second mail');
check((await post(new URL(link).pathname, { actie: 'wis' })) === '/gewist', 'after confirming, the link from the mail still wipes the address');
check(sql(`select count(*) from private.waitlist where email = '${ria}'`) === '0', 'and it is gone');

check((await post('/api/aanmelden', { email: kim, soort: 'nieuws' })) === '/aangemeld', 'another sign-up');
const kimLink = await linkFor(kim);
check((await post(new URL(kimLink).pathname, { actie: 'wis' })) === '/gewist', '"Niet ik, wis mijn adres" wipes');
check(sql(`select count(*) from private.waitlist where email = '${kim}'`) === '0', 'and the address is gone');
check(sql('select count(*) from private.signup_attempts where length(ip_hash) = 64') === sql('select count(*) from private.signup_attempts'), 'attempts keep only an HMAC of the IP');

// Three attempts so far from this IP; the limit is five per ten minutes.
await post('/api/aanmelden', { email: `e2e-a-${stamp}@voorbeeld.nl`, soort: 'nieuws' });
await post('/api/aanmelden', { email: `e2e-b-${stamp}@voorbeeld.nl`, soort: 'nieuws' });
check((await post('/api/aanmelden', { email: `e2e-c-${stamp}@voorbeeld.nl`, soort: 'nieuws' })) === '/aanmelden-mislukt', 'the sixth attempt within ten minutes is stopped');

sql(`delete from private.waitlist where email like 'e2e-%-${stamp}@voorbeeld.nl'`);
sql('delete from private.signup_attempts');
console.log(failures ? `${failures} failed` : 'All sign-up checks passed.');
process.exit(failures ? 1 : 0);
