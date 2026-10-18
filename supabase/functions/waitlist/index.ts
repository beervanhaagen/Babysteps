// Pre-registration on teddysteps.nl, without any script in the browser: plain forms post here
// through Vercel rewrites (apps/landing/vercel.json), and every answer is a 303 to a static page.
//   POST /aanmelden          email, soort (nieuws|testen), maand (YYYY-MM, optional), website (honeypot)
//   POST /bevestig/<code>    actie (ja|wis), from the button page the confirmation mail links to
// Codes travel in the path, never in a query string, and only their hash is stored.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ipHash } from '../_shared/ip.ts';

// Supabase's edge runtime: work that may finish after the response has gone out.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const LANDING = Deno.env.get('LANDING_ORIGIN') ?? 'https://teddysteps.nl';
const LETTERMINT_TOKEN = Deno.env.get('LETTERMINT_API_TOKEN');
const MAIL_DEV_URL = Deno.env.get('MAIL_DEV_URL');
const FROM = Deno.env.get('MAIL_FROM') ?? 'TeddySteps <hallo@post.teddysteps.nl>';

// Always a relative Location, so the browser stays on teddysteps.nl.
const go = (page: string) => new Response(null, { status: 303, headers: { Location: page, 'Cache-Control': 'no-store' } });

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Only the forms on teddysteps.nl itself: blocks other sites signing people up. */
function fromLanding(request: Request): boolean {
  return request.headers.get('sec-fetch-site') === 'same-origin' || request.headers.get('origin') === LANDING;
}

async function form(request: Request): Promise<URLSearchParams | null> {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return null;
  const text = await request.text();
  return text.length > 2048 ? null : new URLSearchParams(text);
}

function confirmationMail(code: string, wantsTest: boolean) {
  const link = `${LANDING}/bevestig/${code}`;
  const test = wantsTest ? 'Je wilt ook meetesten: wat fijn! We kiezen een klein groepje gezinnen. Zitten jullie erbij, dan mailen we je.\n\n' : '';
  const text = `Hoi!

Wat leuk dat je erbij wilt zijn. Heb jij je met dit adres aangemeld? Open dan deze link en tik op ja, dan sta je op de lijst:

${link}

${test}Verder mailen we je alleen als de app er is. Uiterlijk na 12 maanden wissen we je adres.

Was jij dit niet? Dan hoef je niets te doen: zonder bevestiging wissen we je adres na 7 dagen. Via dezelfde link kun je het ook meteen wissen.

Groetjes,
TeddySteps

Haagen Trade · KvK 97569089 · hallo@teddysteps.nl`;
  const html = `<!doctype html><html lang="nl"><body style="margin:0;padding:24px;background:#F2ECE1;color:#2D1E2F;font:16px/1.5 system-ui,sans-serif">
<div style="max-width:480px;margin:0 auto">
<p style="font-size:20px;font-weight:800;margin:0 0 16px">Hoi!</p>
<p>Wat leuk dat je erbij wilt zijn. Heb jij je met dit adres aangemeld? Tik dan op de knop, dan sta je op de lijst.</p>
<p style="margin:24px 0"><a href="${link}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#3D6AE0;color:#FFFFFF;font-weight:800;text-decoration:none;border:2.5px solid #2D1E2F">Bevestig mijn aanmelding</a></p>
${wantsTest ? '<p>Je wilt ook meetesten: wat fijn! We kiezen een klein groepje gezinnen. Zitten jullie erbij, dan mailen we je.</p>' : ''}
<p>Verder mailen we je alleen als de app er is. Uiterlijk na 12 maanden wissen we je adres.</p>
<p style="color:#5E4D5C;font-size:14px">Was jij dit niet? Dan hoef je niets te doen: zonder bevestiging wissen we je adres na 7 dagen. Via dezelfde link kun je het ook meteen wissen.</p>
<p>Groetjes,<br>TeddySteps</p>
<p style="color:#5E4D5C;font-size:12px">Haagen Trade · KvK 97569089 · hallo@teddysteps.nl</p>
</div></body></html>`;
  return { subject: 'Bevestig je aanmelding bij TeddySteps', text, html };
}

async function send(to: string, mail: { subject: string; text: string; html: string }): Promise<boolean> {
  if (LETTERMINT_TOKEN) {
    // Tracking stays off on the route in Lettermint (docs/family-email.md).
    const response = await fetch('https://api.lettermint.co/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-lettermint-token': LETTERMINT_TOKEN },
      body: JSON.stringify({ route: 'transactional', from: FROM, to: [to], reply_to: ['hallo@teddysteps.nl'], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    return response.ok;
  }
  if (MAIL_DEV_URL) {
    const response = await fetch(`${MAIL_DEV_URL}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ From: { Email: 'hallo@post.teddysteps.nl', Name: 'TeddySteps' }, To: [{ Email: to }], Subject: mail.subject, Text: mail.text, HTML: mail.html }),
    });
    return response.ok;
  }
  return false;
}

/** "2026-05" from the form becomes the first of that month; anything else is no month. */
function month(value: string | null): string | null {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? `${value}-01` : null;
}

/** Sends in the background, so every answer takes the same time; a failed mail is undone. */
function sendLater(to: string, code: string, hash: string, wantsTest: boolean) {
  EdgeRuntime.waitUntil(
    send(to, confirmationMail(code, wantsTest))
      .catch(() => false)
      .then(async (sent) => {
        if (sent) return;
        console.error('waitlist: confirmation mail failed');
        await service.rpc('waitlist_mail_failed', { code_hash: hash });
      }),
  );
}

async function handle(request: Request): Promise<Response> {
  const route = new URL(request.url).pathname.split('/waitlist')[1] || '/';
  if (request.method !== 'POST' || !fromLanding(request)) return go('/aanmelden-mislukt');
  const fields = await form(request);
  if (!fields) return go('/aanmelden-mislukt');

  if (route === '/aanmelden') {
    // Bots fill in the hidden field; they get the same page as everyone, and nothing is stored.
    if (fields.get('website')) return go('/aangemeld');
    const email = (fields.get('email') ?? '').trim();
    const wantsTest = fields.get('soort') === 'testen';
    const code = newCode();
    const hash = await sha256(code);
    const { data, error } = await service.rpc('waitlist_signup', {
      address: email,
      wants_test: wantsTest,
      baby_month: month(fields.get('maand')),
      ip_hash: await ipHash(request),
      confirm_hash: hash,
    });
    if (data === 'limited') console.error('waitlist: limit reached');
    if (error || data === 'invalid' || data === 'limited') return go('/aanmelden-mislukt');
    if (data === 'mail') sendLater(email.toLowerCase(), code, hash, wantsTest);
    // 'mail' and 'quiet' look and take the same: nobody learns whether an address is on the list.
    return go('/aangemeld');
  }

  const confirm = route.match(/^\/bevestig\/([A-Za-z0-9_-]{40,50})$/);
  if (confirm) {
    const hash = await sha256(confirm[1]);
    if (fields.get('actie') === 'wis') {
      const { data } = await service.rpc('waitlist_forget', { code_hash: hash });
      return go(data === 'ok' ? '/gewist' : '/link-verlopen');
    }
    const { data } = await service.rpc('waitlist_confirm', { code_hash: hash });
    return go(data === 'ok' ? '/bevestigd' : '/link-verlopen');
  }
  return go('/aanmelden-mislukt');
}

Deno.serve(async (request) => {
  try {
    return await handle(request);
  } catch {
    console.error('waitlist: request failed');
    return go('/aanmelden-mislukt');
  }
});
