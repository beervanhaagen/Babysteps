// M3, inviting the other parent (supabase/migrations/20261025120000_parent_invites.sql). The app
// calls this with the parent's own session; the database functions run as that parent and hold
// every rule. This function only adds the mails:
//   POST { action: 'invite', email }  -> invite_parent, then a mail to that address that names no child
//   POST { action: 'accept', invite } -> accept_parent_invite, then a mail to the inviter saying who joined
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { button, C, COMPANY, escapeHtml, frame, send, SERIF, SIGN_OFF } from '../_shared/mail.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const service = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const LANDING = Deno.env.get('LANDING_ORIGIN') ?? 'https://teddysteps.nl';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Database refusals as plain answers for the app.
const STATUS: Record<string, number> = { '22023': 422, '23514': 409, '54000': 429, P0002: 404, '42501': 403 };

/** To the invited address: no child, no names, so a typo leaks nothing. */
function inviteMail() {
  const text = `Hoi!

Iemand wil samen met jou een pad bijhouden in TeddySteps: een plek voor de foto's en momenten van het eerste jaar, alleen voor jullie eigen kring.

Open de TeddySteps-app en log in met je e-mailadres (je krijgt een code), met precies dit adres. Dan zie je de uitnodiging.

Verwachtte je dit niet? Dan hoef je niets te doen: de uitnodiging verloopt na 7 dagen.

Liefs, TeddySteps

${COMPANY}`;
  const html = frame(
    'Je bent uitgenodigd',
    `<p style="margin:0 0 6px;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};">Samen een pad</p>
<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:32px;font-weight:bold;color:${C.ink};">Je bent uitgenodigd</h1>
<p style="margin:0 0 14px;">Iemand wil samen met jou een pad bijhouden in TeddySteps: een plek voor de foto's en momenten van het eerste jaar, alleen voor jullie eigen kring.</p>
<p style="margin:0 0 22px;">Open de TeddySteps-app en log in met je e-mailadres (je krijgt een code), met precies dit adres. Dan zie je de uitnodiging.</p>
${button(LANDING, 'Wat is TeddySteps?')}
<p style="margin:22px 0 0;font-size:14px;line-height:21px;color:${C.inkMuted};">Verwachtte je dit niet? Dan hoef je niets te doen: de uitnodiging verloopt na 7 dagen.</p>
${SIGN_OFF}`,
    COMPANY,
    'Log in met dit e-mailadres, dan zie je de uitnodiging.',
  );
  return { subject: 'Je bent uitgenodigd op TeddySteps', text, html };
}

/** To the inviter: who joined, with the full address, so a mistake is caught at once. */
function joinedMail(child: string, joinerEmail: string, joinerName: string | null) {
  const who = joinerName ? `${joinerName} (${joinerEmail})` : joinerEmail;
  const text = `Hoi!

${who} doet nu mee als ouder op het pad van ${child}. Jullie kunnen nu allebei momenten vastpinnen en alles zien.

Klopt dit niet? Mail ons meteen op hallo@teddysteps.nl, dan halen we diegene eraf.

Liefs, TeddySteps

${COMPANY}`;
  const html = frame(
    'Er doet iemand mee',
    `<p style="margin:0 0 6px;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};">Samen een pad</p>
<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:32px;font-weight:bold;color:${C.ink};">Jullie zijn met z'n tweeën</h1>
<p style="margin:0 0 14px;"><b>${escapeHtml(who)}</b> doet nu mee als ouder op het pad van ${escapeHtml(child)}. Jullie kunnen nu allebei momenten vastpinnen en alles zien.</p>
<p style="margin:0;font-size:14px;line-height:21px;color:${C.inkMuted};">Klopt dit niet? Mail ons meteen op hallo@teddysteps.nl, dan halen we diegene eraf.</p>
${SIGN_OFF}`,
    COMPANY,
    escapeHtml(`${who} doet nu mee.`),
  );
  return { subject: `Er doet een tweede ouder mee op het pad van ${child}`.replace(/[\r\n]/g, ''), text, html };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const authorization = request.headers.get('Authorization') ?? '';
  // As the signed-in parent: every rule is checked by the database functions themselves.
  const asParent = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
  const body = await request.json().catch(() => ({}));

  if (body.action === 'invite' && typeof body.email === 'string' && body.email.length <= 254) {
    const { data, error } = await asParent.rpc('invite_parent', { email: body.email });
    if (error) return json(STATUS[error.code] ?? 500, { error: error.code });
    // The address as the database stored it; no second mail to the same address within 7 days.
    const row = (data as { id: string; sent_to: string; mail: boolean }[])[0];
    const sent = row.mail ? await send({ to: row.sent_to, idempotencyKey: `parent-invite:${row.id}`, ...inviteMail() }).catch(() => false) : true;
    return json(200, { ok: true, sent });
  }

  if (body.action === 'accept' && typeof body.invite === 'string' && /^[0-9a-f-]{36}$/.test(body.invite)) {
    const { data: trail, error } = await asParent.rpc('accept_parent_invite', { invite: body.invite });
    if (error) return json(STATUS[error.code] ?? 500, { error: error.code });
    const { data } = await service.rpc('parent_invite_joined', { invite: body.invite });
    const row = (data as { inviter_email: string; child: string; joiner_email: string; joiner_name: string | null }[] | null)?.[0];
    if (row) await send({ to: row.inviter_email, idempotencyKey: `parent-joined:${body.invite}`, ...joinedMail(row.child, row.joiner_email, row.joiner_name) }).catch(() => false);
    return json(200, { ok: true, trail });
  }

  return json(400, { error: 'bad request' });
});
