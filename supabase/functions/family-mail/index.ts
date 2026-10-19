// F8, the Sunday mail for family (step 7 at launch). pg_cron calls this every hour with a shared
// secret; public.family_sunday_mail decides whether it's Sunday after 20:00 and who gets one.
// Text only: no photos until the parents' M6 switch exists (step 8), and nothing that loads.
// One 7-day sign-in link per mail, one-click unsubscribe, sent once (row first, then the mail).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { button, C, COMPANY, escapeHtml, frame, send, SERIF, sha256, SIGN_OFF, signinCode, unsubscribeToken } from '../_shared/mail.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CRON_SECRET = Deno.env.get('CRON_SECRET');
const FAMILY_URL = (Deno.env.get('FAMILY_ORIGIN') ?? 'https://familie.teddysteps.nl').split(',')[0].trim();
const SHOWN = 5;
// Locally only (config.toml): the end-to-end test may pass a Sunday evening as "now".
const TEST_CLOCK = Deno.env.get('FAMILY_MAIL_TEST_CLOCK') === '1';

type Moment = { week: number; first: boolean; label: string | null; caption: string | null };
type Row = { send_id: string; member: string; email: string; label: string; child: string; moment_count: number; moments: Moment[] };

function sundayMail(row: Row, code: string, unsubscribe: string) {
  const count = row.moment_count === 1 ? '1 nieuw moment' : `${row.moment_count} nieuwe momenten`;
  const open = `${FAMILY_URL}/m#${code}`;
  const stop = `${FAMILY_URL}/afmelden#${unsubscribe}`;
  const more = row.moment_count > SHOWN ? row.moment_count - SHOWN : 0;
  const andMore = more === 1 ? 'En nog 1 moment.' : `En nog ${more} momenten.`;
  const title = (m: Moment) => (m.first ? m.label : m.caption) || 'Een moment';
  const eyebrow = (m: Moment) => `Week ${m.week}${m.first ? ' · eerste keer!' : ''}`;

  const text = `Hoi ${row.label},

Deze week bij ${row.child}: ${count}.

${row.moments.map((m) => `${eyebrow(m)}\n${title(m)}`).join('\n\n')}${more ? `\n\n${andMore}` : ''}

Bekijk ze en stuur een knuffel:
${open}

Liefs, TeddySteps

Je krijgt dit mailtje omdat je meekijkt met ${row.child} op TeddySteps. De link is persoonlijk: stuur dit mailtje liever niet door. Afmelden: ${stop}
${COMPANY}`;

  const cards = row.moments
    .map(
      (m, i) => `<tr><td style="padding:${i ? '12px' : '0'} 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${m.first ? C.butter : C.card};border:2px solid ${C.ink};border-radius:16px;padding:12px 14px;">
<p style="margin:0;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};">${escapeHtml(eyebrow(m))}</p>
<p style="margin:2px 0 0;font-family:${SERIF};font-size:18px;line-height:24px;font-weight:bold;color:${C.ink};">${escapeHtml(title(m))}</p>
</td></tr></table>
</td></tr>`,
    )
    .join('');

  const html = frame(
    `Deze week bij ${escapeHtml(row.child)}`,
    `<p style="margin:0 0 10px;font-size:18px;line-height:26px;">Hoi ${escapeHtml(row.label)},</p>
<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:28px;line-height:32px;font-weight:bold;color:${C.ink};">Deze week bij ${escapeHtml(row.child)}: ${count}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
${more ? `<p style="margin:12px 0 0;color:${C.inkMuted};">${andMore}</p>` : ''}
<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
${button(open, 'Bekijk en stuur een knuffel')}
${SIGN_OFF}`,
    `Je krijgt dit mailtje omdat je meekijkt met ${escapeHtml(row.child)} op TeddySteps. De knop is persoonlijk: stuur dit mailtje liever niet door. <a href="${stop}" style="color:${C.inkMuted};">Afmelden</a><br>Geen reclame, nooit. ${COMPANY}`,
    `Stuur ${escapeHtml(row.child)} een knuffel.`,
  );
  return { subject: `Deze week bij ${row.child}: ${count}`, text, html };
}

Deno.serve(async (request) => {
  if (!CRON_SECRET || request.headers.get('x-cron-secret') !== CRON_SECRET) return new Response(null, { status: 403 });
  const at = TEST_CLOCK ? ((await request.json().catch(() => ({}))) as { at?: string }).at : undefined;
  const { data, error } = await service.rpc('family_sunday_mail', at ? { at } : {});
  if (error) {
    console.error('family-mail: selection failed');
    return new Response(null, { status: 500 });
  }
  const counts = { sent: 0, failed: 0 };
  const deliver = async (row: Row) => {
    const code = await signinCode(row.send_id);
    const { error } = await service.rpc('family_mail_key', { member: row.member, code_hash: await sha256(code) });
    // Never a mail with a link that doesn't work.
    if (error) throw new Error('mail key');
    const token = await unsubscribeToken(row.member);
    const sent = await send({
      to: row.email,
      fromName: `${row.child} via TeddySteps`,
      idempotencyKey: row.send_id,
      headers: {
        'List-Unsubscribe': `<${FAMILY_URL}/api/afmelden/${token}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      ...sundayMail(row, code, token),
    });
    // Not marked sent: the next run (until midnight) tries again; the idempotency key stops doubles.
    if (sent) await service.rpc('family_mail_sent', { send: row.send_id });
    counts[sent ? 'sent' : 'failed']++;
  };
  const rows = (data ?? []) as Row[];
  for (let i = 0; i < rows.length; i += 20) await Promise.all(rows.slice(i, i + 20).map((row) => deliver(row).catch(() => counts.failed++)));
  // Counts only: never addresses or names in the logs.
  console.log(`family-mail: ${JSON.stringify(counts)}`);
  return Response.json(counts);
});
