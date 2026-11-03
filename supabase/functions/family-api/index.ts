// The family page's only door to the data (docs/family-email.md, "Family page sign-in").
// Family has no database login: a personal link code is swapped once for a session cookie
// (__Host-ts, HttpOnly), and every request after that is checked here with the service role.
// Family only ever gets the view or small version of moments that are ready, 12 at a time (/views: at most 25),
// through signed links that expire after 15 minutes; never a print version. When the parents
// allow keeping photos (M6), /keep gives a 60-second download link to the view version. A phone
// gets the small version on the postcards; only when the big view (T2b) opens does /views sign the
// view versions of the postcards already on screen.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ipHash } from '../_shared/ip.ts';
import { button, C, COMPANY, frame, send, SERIF, SIGN_OFF, unsubscribeMember } from '../_shared/mail.ts';

// Supabase's edge runtime: work that may finish after the response has gone out.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// Locally SUPABASE_URL is Docker-internal; there PUBLIC_SUPABASE_URL is "relative" and photo
// links go without a host, through the local family page's proxy.
const PUBLIC_URL = Deno.env.get('PUBLIC_SUPABASE_URL') ?? SUPABASE_URL;
const publicLink = (url: string) => (PUBLIC_URL === 'relative' ? url.slice(SUPABASE_URL.length) : url.replace(SUPABASE_URL, PUBLIC_URL));
const ORIGINS = (Deno.env.get('FAMILY_ORIGIN') ?? '').split(',').map((o) => o.trim()).filter(Boolean);
const service = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
// Links in mails go to the family page itself.
const FAMILY_URL = ORIGINS[0] ?? 'https://familie.teddysteps.nl';

const COOKIE = '__Host-ts';
const SESSION_DAYS = 180;
const LINK_SECONDS = 15 * 60;
const FREQUENCIES = ['each', 'weekly', 'never'];

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// The keyring (docs/family-email.md): the cookie holds up to six session tokens, joined by dots,
// one per child this browser follows. Each is still one person in one circle.
const KEYRING = 6;

function cookie(request: Request): string[] {
  const match = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return (match?.[1] ?? '')
    .split('.')
    .filter((t) => /^[A-Za-z0-9_-]{20,100}$/.test(t))
    .slice(-KEYRING);
}

/** Writes only from the family page itself: blocks other sites posting on Oma's behalf. */
function fromFamilyPage(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  return !!origin && ORIGINS.includes(origin);
}

/** "iPhone · Safari": enough to recognise a device in M3, nothing more. */
function deviceHint(userAgent: string): string {
  const device = /iPhone/.test(userAgent) ? 'iPhone' : /iPad/.test(userAgent) ? 'iPad' : /Android/.test(userAgent) ? 'Android' : /Mac/.test(userAgent) ? 'Mac' : /Windows/.test(userAgent) ? 'Windows' : 'Browser';
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /CriOS|Chrome/.test(userAgent) ? 'Chrome' : /Firefox|FxiOS/.test(userAgent) ? 'Firefox' : /Safari/.test(userAgent) ? 'Safari' : '';
  return browser ? `${device} · ${browser}` : device;
}

type Who = { member: string; trail: string; token: string; tokens: string[]; changed: boolean };

/**
 * The person this request is for: the child asked for in X-Kring (a circle member id), if its
 * token is on this browser, else the last one opened. A made-up id gets nothing. Tokens that no
 * longer work are dropped from the cookie (`changed`).
 */
async function member(request: Request): Promise<{ who: Who | null; tokens: string[]; changed: boolean; failed?: boolean }> {
  const tokens = cookie(request);
  if (!tokens.length) return { who: null, tokens, changed: false };
  const hashes = await Promise.all(tokens.map(sha256));
  const asked = request.headers.get('x-kring');
  const wanted = asked && /^[0-9a-f-]{36}$/.test(asked) ? asked : null;
  const { data, error } = await service.rpc('family_member_in', { session_hashes: hashes, wanted });
  // A hiccup on our side never touches the cookie: Oma would lose every child on the ring.
  if (error) return { who: null, tokens, changed: false, failed: true };
  const rows = (data ?? []) as { member: string; member_trail: string; session_hash: string; chosen: boolean }[];
  const valid = tokens.filter((_, i) => rows.some((r) => r.session_hash === hashes[i]));
  const changed = valid.length !== tokens.length;
  const pick = rows.find((r) => r.chosen);
  if (!pick) return { who: null, tokens: valid, changed };
  return { who: { member: pick.member, trail: pick.member_trail, token: tokens[hashes.indexOf(pick.session_hash)], tokens: valid, changed }, tokens: valid, changed };
}

async function signed(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (!paths.length) return urls;
  const { data } = await service.storage.from('view').createSignedUrls(paths, LINK_SECONDS);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, publicLink(item.signedUrl));
  }
  return urls;
}

const PAGE_SIZE = 12;

/** One page of postcards: at most 12, links only for the version this screen shows. */
async function page(who: { member: string; trail: string }, skip: number, wide: boolean) {
  const [{ data: child }, { data: trail }, { data: me }, { data: rows }] = await Promise.all([
    service.from('children').select('first_name, birth_date, avatar_animal, avatar_tone').eq('trail_id', who.trail).single(),
    service.from('trails').select('family_may_keep_photos').eq('id', who.trail).single(),
    service.from('circle_members').select('label, relation, email, email_frequency, joined_at, book_list_at').eq('id', who.member).single(),
    // One more than shown, to know whether there are older ones.
    service.rpc('family_page', { member: who.member, skip, page_size: PAGE_SIZE + 1 }),
  ]);
  type Photo = { position: number; width: number; height: number; view_path: string; small_path: string };
  type Row = {
    id: string;
    trail_week: number;
    caption: string | null;
    is_first: boolean;
    first_label: string | null;
    day: string;
    hugs: number;
    my_hugs: number;
    photos: Photo[] | null;
    reactions: Record<string, { total: number; mine: number }> | null;
  };
  const all = (rows ?? []) as Row[];
  const moments = all.slice(0, PAGE_SIZE);
  // One version per screen: phones the small one, laptops the view one. On a phone, /views adds
  // the view version only when the big view (T2b) opens. Never print.
  const pathOf = (p: Photo) => (wide ? p.view_path : p.small_path);
  const urls = await signed(moments.flatMap((m) => (m.photos ?? []).map(pathOf)));
  return {
    child: { firstName: child?.first_name, birthDate: child?.birth_date, look: { animal: child?.avatar_animal ?? 'bo', tone: child?.avatar_tone ?? 'lilac' } },
    me: {
      label: me?.label,
      relation: me?.relation,
      email: me?.email,
      frequency: me?.email_frequency,
      joined: !!me?.joined_at,
      onBookList: !!me?.book_list_at,
    },
    moments: moments.map((m) => ({
      id: m.id,
      week: m.trail_week,
      caption: m.caption,
      isFirst: m.is_first,
      firstLabel: m.first_label,
      day: m.day,
      photos: (m.photos ?? []).map((p) => ({ width: p.width, height: p.height, url: urls.get(pathOf(p)) })),
      hugs: m.hugs,
      myHugs: m.my_hugs,
      reactions: m.reactions ?? {},
    })),
    more: all.length > PAGE_SIZE,
    // M6 "Familie mag foto's bewaren": shows the "Bewaar" button; /keep checks it again.
    mayKeep: !!trail?.family_may_keep_photos,
  };
}

/** F2: "Klopt dit adres?" Names no child and no label, so a typo in the address leaks nothing. */
function confirmMail(code: string) {
  const link = `${FAMILY_URL}/bevestig#${code}`;
  const text = `Hoi!

Iemand heeft dit adres opgegeven om elke zondag een mailtje met de nieuwe momenten van TeddySteps te krijgen. Was jij dat? Bevestig het hier:

${link}

Was jij dit niet? Dan hoef je niets te doen: zonder bevestiging wissen we het adres na 7 dagen.

Liefs, TeddySteps

${COMPANY}`;
  const html = frame(
    'Bevestig je e-mailadres',
    `<p style="margin:0 0 6px;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};">Nog één tik</p>
<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:32px;font-weight:bold;color:${C.ink};">Klopt dit adres?</h1>
<p style="margin:0 0 22px;">Iemand heeft dit adres opgegeven om elke zondag een mailtje met de nieuwe momenten van TeddySteps te krijgen. Was jij dat? Tik dan op de knop.</p>
${button(link, 'Ja, dit is mijn adres')}
<p style="margin:22px 0 0;font-size:14px;line-height:21px;color:${C.inkMuted};">Was jij dit niet? Dan hoef je niets te doen: zonder bevestiging wissen we het adres na 7 dagen.</p>
${SIGN_OFF}`,
    COMPANY,
    'Eén tik, dan krijg je elke zondag de nieuwe momenten.',
  );
  return { subject: 'Bevestig je e-mailadres voor de nieuwe momenten', text, html };
}

const sessionCookie = (tokens: string[]) =>
  tokens.length
    ? `${COOKIE}=${tokens.slice(-KEYRING).join('.')}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`
    : `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

Deno.serve(async (request) => {
  const route = new URL(request.url).pathname.split('/family-api')[1] || '/';
  // One-click unsubscribe (RFC 8058): the mail app posts here itself, so no origin check, and the
  // sealed token is all it takes. The family page's own button posts here too.
  const unsubscribe = route.match(/^\/afmelden\/([0-9a-f-]{36}\.[0-9a-f]{32})$/);
  if (unsubscribe && request.method === 'POST') {
    const member = await unsubscribeMember(unsubscribe[1]);
    if (!member) return json(404, { error: 'unknown link' });
    await service.rpc('family_unsubscribe', { member });
    return json(200, { ok: true });
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  if (request.method === 'POST' && !fromFamilyPage(request)) return json(403, { error: 'not from the family page' });

  // "Ja, dit is mijn adres": works on any device, also without having opened the family link there.
  if (route === '/confirm' && request.method === 'POST') {
    const code = typeof body.code === 'string' ? body.code : '';
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(code)) return json(404, { error: 'unknown link' });
    const { data } = await service.rpc('family_confirm_email', { code_hash: await sha256(code) });
    return data === 'ok' ? json(200, { ok: true }) : json(404, { error: 'unknown link' });
  }

  if (route === '/claim' && request.method === 'POST') {
    const code = typeof body.code === 'string' ? body.code : '';
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(code)) return json(404, { error: 'unknown link' });
    const existing = cookie(request);
    const token = newToken();
    const { data } = await service.rpc('family_claim', {
      code_hash: await sha256(code),
      session_hash: await sha256(token),
      device: deviceHint(request.headers.get('user-agent') ?? ''),
      ip: await ipHash(request),
      existing_session_hashes: await Promise.all(existing.map(sha256)),
    });
    const result = (data as { member: string | null; status: string }[] | null)?.[0];
    // The same device opening its link again keeps its session (and renews the cookie).
    if (result?.status === 'same') return json(200, { ok: true, member: result.member }, { 'Set-Cookie': sessionCookie(existing) });
    if (result?.status === 'ok') {
      // A link for another child adds a key to the ring, next to the keys that still exist. Past
      // six the oldest goes, and its session ends, so it no longer counts as a device.
      const hashes = await Promise.all(existing.map(sha256));
      const { data: alive, error: aliveError } = await service.rpc('family_keys_alive', { session_hashes: hashes });
      const kept = aliveError ? existing : existing.filter((_, i) => ((alive ?? []) as string[]).includes(hashes[i]));
      const ring = [...kept, token];
      for (const old of ring.slice(0, Math.max(0, ring.length - KEYRING))) {
        await service.rpc('family_forget_session', { session_hash: await sha256(old) });
      }
      return json(200, { ok: true, member: result.member }, { 'Set-Cookie': sessionCookie(ring.slice(-KEYRING)) });
    }
    if (result?.status === 'full') return json(409, { error: 'five devices' });
    return json(404, { error: 'unknown link' });
  }

  const found = await member(request);
  if (found.failed) return json(503, { error: 'try again' });
  // Dead keys leave the cookie with any answer.
  const tidy = (response: Response) => {
    if (found.changed && !response.headers.has('Set-Cookie')) response.headers.set('Set-Cookie', sessionCookie(found.tokens));
    return response;
  };

  // The start page: every child this browser follows. Opening it is no visit to any trail.
  if (route === '/kinderen' && request.method === 'GET') {
    if (!found.tokens.length) return tidy(json(401, { error: 'no access' }));
    const { data } = await service.rpc('family_keyring', { session_hashes: await Promise.all(found.tokens.map(sha256)) });
    type Child = { member: string; label: string; first_name: string; birth_date: string | null; avatar_animal: string; avatar_tone: string; new_this_week: number };
    return tidy(
      json(200, {
        children: ((data ?? []) as Child[]).map((c) => ({
          member: c.member,
          label: c.label,
          firstName: c.first_name,
          birthDate: c.birth_date,
          look: { animal: c.avatar_animal, tone: c.avatar_tone },
          newThisWeek: c.new_this_week,
        })),
      }),
    );
  }

  const who = found.who;
  if (!who) return tidy(json(401, { error: 'no access' }));

  if (route === '/page' && request.method === 'GET') {
    const params = new URL(request.url).searchParams;
    const skip = Number(params.get('skip'));
    const data = await page(who, Number.isInteger(skip) && skip > 0 ? Math.min(skip, 10_000) : 0, params.get('wide') === '1');
    // Every visit renews the cookie, so a session lasts 180 days after its last use.
    return json(200, { ...data, member: who.member }, { 'Set-Cookie': sessionCookie(who.tokens) });
  }

  if (route === '/join' && request.method === 'POST') {
    const frequency = FREQUENCIES.includes(body.frequency) ? body.frequency : 'weekly';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (frequency !== 'never' && email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json(422, { error: 'email' });
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 40) : '';
    const { data } = await service.rpc('family_join', { member: who.member, member_label: label, member_email: email, frequency });
    if (data !== 'confirm') return json(200, { ok: true, confirm: false });
    // A new address gets a confirmation mail first; postcards only go to confirmed addresses.
    const code = newToken();
    const { data: key } = await service.rpc('family_email_key', { member: who.member, code_hash: await sha256(code) });
    // Too many tries today: say so, instead of "kijk in je mail" for a mail that never comes.
    if (key !== 'ok') return json(200, { ok: true, confirm: 'limited' });
    EdgeRuntime.waitUntil(send({ to: email.toLowerCase(), ...confirmMail(code) }).catch(() => false));
    return json(200, { ok: true, confirm: true });
  }

  // The big view on a phone: view versions (1280px) of a block of postcards the page has loaded,
  // at most 25 (the database's own limit). The same database function as /page decides what this
  // member may see.
  if (route === '/views' && request.method === 'POST') {
    const count = typeof body.count === 'number' && Number.isInteger(body.count) ? Math.min(Math.max(body.count, 1), 25) : 0;
    const skip = typeof body.skip === 'number' && Number.isInteger(body.skip) && body.skip > 0 ? Math.min(body.skip, 10_000) : 0;
    if (!count) return json(422, { error: 'bad request' });
    const { data: rows } = await service.rpc('family_page', { member: who.member, skip, page_size: count });
    const moments = (rows ?? []) as { id: string; photos: { position: number; view_path: string }[] | null }[];
    const urls = await signed(moments.flatMap((m) => (m.photos ?? []).map((p) => p.view_path)));
    return json(200, { moments: moments.map((m) => ({ id: m.id, views: (m.photos ?? []).map((p) => urls.get(p.view_path) ?? null) })) });
  }

  // A hug or one of the icons (heart, laugh, wow, star, sun): the counts per kind come back.
  if (route === '/react' && request.method === 'POST') {
    const kinds = ['hug', 'heart', 'laugh', 'wow', 'star', 'sun'];
    if (typeof body.moment !== 'string' || !/^[0-9a-f-]{36}$/.test(body.moment) || !kinds.includes(body.kind)) return json(422, { error: 'bad request' });
    const { data, error } = await service.rpc('family_react', { member: who.member, reacted_moment: body.moment, reaction: body.kind });
    if (error) return json(404, { error: 'unknown moment' });
    const reactions: Record<string, { total: number; mine: number }> = {};
    for (const r of (data ?? []) as { kind: string; mine: number; total: number }[]) reactions[r.kind] = { total: r.total, mine: r.mine };
    return json(200, { reactions });
  }

  if (route === '/hug' && request.method === 'POST') {
    const { data, error } = await service.rpc('family_hug', { member: who.member, hugged_moment: body.moment });
    if (error) return json(404, { error: 'unknown moment' });
    const counts = (data as { mine: number; total: number }[])[0];
    return json(200, counts);
  }

  // M6: a 5-minute download link to the view version (1280px), never print, only while the
  // parents allow it (checked in the database on every tap).
  if (route === '/keep' && request.method === 'POST') {
    const position = typeof body.position === 'number' ? body.position : NaN;
    if (typeof body.moment !== 'string' || !/^[0-9a-f-]{36}$/.test(body.moment) || !Number.isInteger(position) || position < 0 || position > 9) {
      return json(422, { error: 'bad request' });
    }
    const { data: path, error: keepError } = await service.rpc('family_keep_photo', { member: who.member, kept_moment: body.moment, photo_position: position });
    if (keepError) return json(500, { error: 'failed' });
    if (!path) return json(403, { error: 'not allowed' });
    // A name to find it back by ("lotte-week-31-1.webp"), not twenty "teddysteps-foto (3)" files.
    const [{ data: child }, { data: week }] = await Promise.all([
      service.from('children').select('first_name').eq('trail_id', who.trail).single(),
      service.from('moments').select('trail_week').eq('id', body.moment).single(),
    ]);
    const base = (child?.first_name ?? 'teddysteps').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'teddysteps';
    const name = `${base}-week-${week?.trail_week ?? 0}-${position + 1}.webp`;
    const { data } = await service.storage.from('view').createSignedUrl(path as string, 60, { download: name });
    if (!data) return json(500, { error: 'no link' });
    return json(200, { url: publicLink(data.signedUrl) });
  }

  if (route === '/book' && request.method === 'POST') {
    await service.rpc('family_book_list', { member: who.member });
    return json(200, { ok: true });
  }

  if (route === '/leave' && request.method === 'POST') {
    await service.rpc('family_leave', { member: who.member });
    // Only this child's key goes; the others on the ring stay.
    return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(who.tokens.filter((t) => t !== who.token)) });
  }

  return tidy(json(404, { error: 'not found' }));
});
