// The family page's only door to the data (docs/family-email.md, "Family page sign-in").
// Family has no database login: a personal link code is swapped once for a session cookie
// (__Host-ts, HttpOnly), and every request after that is checked here with the service role.
// Family only ever gets the view or small version of moments that are ready, 12 at a time,
// through signed links that expire after 15 minutes; never a print version.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ipHash } from '../_shared/ip.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// Locally SUPABASE_URL is Docker-internal; there PUBLIC_SUPABASE_URL is "relative" and photo
// links go without a host, through the local family page's proxy.
const PUBLIC_URL = Deno.env.get('PUBLIC_SUPABASE_URL') ?? SUPABASE_URL;
const publicLink = (url: string) => (PUBLIC_URL === 'relative' ? url.slice(SUPABASE_URL.length) : url.replace(SUPABASE_URL, PUBLIC_URL));
const ORIGINS = (Deno.env.get('FAMILY_ORIGIN') ?? '').split(',').map((o) => o.trim()).filter(Boolean);
const service = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

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

function cookie(request: Request): string | null {
  const match = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? match[1] : null;
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

async function member(request: Request): Promise<{ member: string; trail: string } | null> {
  const token = cookie(request);
  if (!token) return null;
  const { data } = await service.rpc('family_member', { session_hash: await sha256(token) });
  const row = (data as { member: string; member_trail: string }[] | null)?.[0];
  return row ? { member: row.member, trail: row.member_trail } : null;
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
  const [{ data: child }, { data: me }, { data: rows }] = await Promise.all([
    service.from('children').select('first_name, birth_date').eq('trail_id', who.trail).single(),
    service.from('circle_members').select('label, relation, email, email_frequency, joined_at, book_list_at').eq('id', who.member).single(),
    // One more than shown, to know whether there are older ones.
    service.rpc('family_page', { member: who.member, skip, page_size: PAGE_SIZE + 1 }),
  ]);
  type Photo = { position: number; width: number; height: number; view_path: string; small_path: string };
  type Row = { id: string; trail_week: number; caption: string | null; is_first: boolean; first_label: string | null; day: string; hugs: number; my_hugs: number; photos: Photo[] | null };
  const all = (rows ?? []) as Row[];
  const moments = all.slice(0, PAGE_SIZE);
  // Phones get the small version, laptops the view version; never both, never print.
  const pathOf = (p: Photo) => (wide ? p.view_path : p.small_path);
  const urls = await signed(moments.flatMap((m) => (m.photos ?? []).map(pathOf)));
  return {
    child: { firstName: child?.first_name, birthDate: child?.birth_date },
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
    })),
    more: all.length > PAGE_SIZE,
  };
}

const sessionCookie = (token: string) => `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;

Deno.serve(async (request) => {
  const route = new URL(request.url).pathname.split('/family-api')[1] || '/';
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  if (request.method === 'POST' && !fromFamilyPage(request)) return json(403, { error: 'not from the family page' });

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
      existing_session_hash: existing ? await sha256(existing) : null,
    });
    const result = (data as { member: string | null; status: string }[] | null)?.[0];
    // The same device opening its link again keeps its session (and renews the cookie).
    if (result?.status === 'same' && existing) return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(existing) });
    if (result?.status === 'ok') return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(token) });
    if (result?.status === 'full') return json(409, { error: 'five devices' });
    return json(404, { error: 'unknown link' });
  }

  const who = await member(request);
  if (!who) return json(401, { error: 'no access' });

  if (route === '/page' && request.method === 'GET') {
    const params = new URL(request.url).searchParams;
    const skip = Number(params.get('skip'));
    const data = await page(who, Number.isInteger(skip) && skip > 0 ? Math.min(skip, 10_000) : 0, params.get('wide') === '1');
    // Every visit renews the cookie, so a session lasts 180 days after its last use.
    return json(200, data, { 'Set-Cookie': sessionCookie(cookie(request)!) });
  }

  if (route === '/join' && request.method === 'POST') {
    const frequency = FREQUENCIES.includes(body.frequency) ? body.frequency : 'weekly';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (frequency !== 'never' && email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json(422, { error: 'email' });
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 40) : '';
    await service.rpc('family_join', { member: who.member, member_label: label, member_email: email, frequency });
    return json(200, { ok: true });
  }

  if (route === '/hug' && request.method === 'POST') {
    const { data, error } = await service.rpc('family_hug', { member: who.member, hugged_moment: body.moment });
    if (error) return json(404, { error: 'unknown moment' });
    const counts = (data as { mine: number; total: number }[])[0];
    return json(200, counts);
  }

  if (route === '/book' && request.method === 'POST') {
    await service.rpc('family_book_list', { member: who.member });
    return json(200, { ok: true });
  }

  if (route === '/leave' && request.method === 'POST') {
    await service.rpc('family_leave', { member: who.member });
    return json(200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
  }

  return json(404, { error: 'not found' });
});
