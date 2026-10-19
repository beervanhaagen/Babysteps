// Pre-registration on teddysteps.nl, without any script in the browser: plain forms post here
// through Vercel rewrites (apps/landing/vercel.json), and every answer is a 303 to a static page.
//   POST /aanmelden          email, soort (nieuws|testen), maand (YYYY-MM, optional), website (honeypot)
//   POST /bevestig/<code>    actie (ja|wis), from the button page the confirmation mail links to
// Codes travel in the path, never in a query string, and only their hash is stored.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ipHash } from '../_shared/ip.ts';
import { button, C, COMPANY, frame, newCode, send, SERIF, sha256, SIGN_OFF } from '../_shared/mail.ts';

// Supabase's edge runtime: work that may finish after the response has gone out.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const LANDING = Deno.env.get('LANDING_ORIGIN') ?? 'https://teddysteps.nl';

// Always a relative Location, so the browser stays on teddysteps.nl.
const go = (page: string) => new Response(null, { status: 303, headers: { Location: page, 'Cache-Control': 'no-store' } });

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

${test}Verder mailen we je alleen als de app er is. Geen nieuwsbrief, geen reclame. Uiterlijk na 12 maanden wissen we je adres.

Was jij dit niet? Dan hoef je niets te doen: zonder bevestiging wissen we je adres na 7 dagen. Via dezelfde link kun je het ook meteen wissen.

Liefs, TeddySteps

Haagen Trade · KvK 97569089 · hallo@teddysteps.nl`;
  const html = frame(
    'Bevestig je aanmelding',
    `<p style="margin:0 0 6px;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};">Nog één tik</p>
<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:32px;font-weight:bold;color:${C.ink};">Wat leuk dat je <i style="color:${C.plum};">erbij wilt zijn.</i></h1>
<p style="margin:0 0 22px;">Heb jij je met dit adres aangemeld op teddysteps.nl? Tik dan op de knop, dan sta je op de lijst.</p>
${button(link, 'Ja, zet me op de lijst')}
${wantsTest ? `<p style="margin:22px 0 0;padding:14px 16px;background:${C.lilac};border:2px solid ${C.ink};border-radius:16px;">Je wilt ook meetesten: wat fijn! We kiezen een klein groepje gezinnen. Zitten jullie erbij, dan mailen we je.</p>` : ''}
<p style="margin:22px 0 0;">Verder mailen we je alleen als de app er is. Geen nieuwsbrief, geen reclame. Uiterlijk na 12 maanden wissen we je adres.</p>
<p style="margin:14px 0 0;font-size:14px;line-height:21px;color:${C.inkMuted};">Was jij dit niet? Dan hoef je niets te doen: zonder bevestiging wissen we je adres na 7 dagen. Op de pagina achter de knop kun je je adres ook meteen wissen.</p>
${SIGN_OFF}`,
    `Het eerste jaar gaat zo snel. Hou elk moment vast.<br>${COMPANY}`,
    'Eén tik, dan sta je op de lijst.',
  );
  return { subject: 'Bevestig je aanmelding bij TeddySteps', text, html };
}

/** "2026-05" from the form becomes the first of that month; anything else is no month. */
function month(value: string | null): string | null {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? `${value}-01` : null;
}

/** Sends in the background, so every answer takes the same time; a failed mail is undone. */
function sendLater(to: string, code: string, hash: string, wantsTest: boolean) {
  EdgeRuntime.waitUntil(
    send({ to, ...confirmationMail(code, wantsTest) })
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
