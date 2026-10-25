// M7 "Pad en account verwijderen" (supabase/migrations/20261025140000_deletion.sql). The app calls
// this with the parent's own session; the database functions run as that parent and hold every
// rule. This function adds the mails at the moment of asking:
//   POST { action: 'request', scope: 'account' | 'trail', rightAway?: boolean }
//     -> request_deletion; a mail to the parent ("on <date>, log in to bring it back"), and when the
//        trail goes and there is another parent, a mail to them ("Toch bewaren? Open de app").
// "Toch bewaren" needs no mail: the app calls restore_deletion itself.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { C, COMPANY, escapeHtml, frame, send, SERIF, SIGN_OFF } from '../_shared/mail.ts';
import { possessive } from '../_shared/names.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const service = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const day = (iso: string) => new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

function mail(title: string, lines: string[]) {
  const text = `Hoi,\n\n${lines.join('\n\n')}\n\nLiefs, TeddySteps\n\n${COMPANY}`;
  const html = frame(
    escapeHtml(title),
    `<p style="margin:0 0 14px;">Hoi,</p>
<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:32px;font-weight:bold;color:${C.ink};">${escapeHtml(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 14px;">${escapeHtml(l)}</p>`).join('\n')}
${SIGN_OFF}`,
    COMPANY,
    escapeHtml(lines[0]),
  );
  return { subject: title.replace(/[\r\n]/g, ''), text, html };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const authorization = request.headers.get('Authorization') ?? '';
  const asParent = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'request' || !['account', 'trail'].includes(body.scope)) return json(400, { error: 'bad request' });

  const { data: me } = await service.auth.getUser(authorization.replace(/^Bearer /, ''));
  if (!me.user) return json(401, { error: 'not signed in' });
  const rightAway = body.rightAway === true;
  // Read before asking: afterwards the other parent's answer still counts them as staying.
  const [{ data: others }, { data: profile }, { data: kid }] = await Promise.all([
    service.rpc('deletion_other_parent', { requester: me.user.id }),
    service.from('profiles').select('first_name').eq('id', me.user.id).single(),
    asParent.from('children').select('first_name').limit(1).maybeSingle(),
  ]);
  const { data: asked, error } = await service.rpc('request_deletion', { requester: me.user.id, scope: body.scope, right_away: rightAway });
  if (error) return json(422, { error: error.code });
  const result = (asked as { account_until: string; trail_until: string | null }[])[0];
  const other = (others as { email: string; child: string }[] | null)?.[0];
  const child = kid?.first_name ?? other?.child ?? null;
  const trailGoes = !!result.trail_until;
  const accountWhen = rightAway ? 'binnen een uur' : `op ${day(result.account_until)}`;
  const trailWhen = result.trail_until ? (new Date(result.trail_until).getTime() <= Date.now() + 60_000 ? 'binnen een uur' : `op ${day(result.trail_until)}`) : '';

  if (me.user.email) {
    const pad = child ? `${possessive(child)} pad` : 'je pad';
    const lines = [
      trailGoes
        ? accountWhen === trailWhen
          ? `Je vroeg om ${pad} en je account te verwijderen. We wissen alles ${accountWhen}.`
          : `Je vroeg om ${pad} en je account te verwijderen. Je account wissen we ${accountWhen}, ${pad} ${trailWhen}, zodat de andere ouder het nog kan bewaren.`
        : `Je vroeg om je account te verwijderen. We wissen het ${accountWhen}.${child && other ? ` ${possessive(child)} pad blijft bij de andere ouder.` : ''}`,
      rightAway ? 'Daarna krijg je nog één mail.' : 'Bedenk je je? Log tot die tijd in de TeddySteps-app in en kies Toch bewaren.',
    ];
    const title = trailGoes ? `${pad.charAt(0).toUpperCase()}${pad.slice(1)} wordt verwijderd` : 'Je account wordt verwijderd';
    await send({ to: me.user.email, idempotencyKey: `leave:${me.user.id}:${result.account_until}`, ...mail(title, lines) }).catch(() => false);
  }
  // The other parent, when the trail goes: a mail, because it also arrives with pushes off. A
  // shared trail always keeps its 30 days, so this parent can always still save it.
  if (other && trailGoes) {
    const who = profile?.first_name ?? 'De andere ouder';
    const lines = [
      `${who} vroeg om ${possessive(other.child)} pad te verwijderen, met alle foto's en momenten. Dat gebeurt ${trailWhen}.`,
      'Toch bewaren? Open de TeddySteps-app en kies Toch bewaren. Je kunt ook eerst alles downloaden.',
    ];
    await send({ to: other.email, idempotencyKey: `leave-other:${me.user.id}:${result.trail_until}`, ...mail(`${possessive(other.child)} pad wordt verwijderd`, lines) }).catch(() => false);
  }
  return json(200, { ok: true, accountUntil: result.account_until, trailUntil: result.trail_until });
});
