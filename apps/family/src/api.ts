// Talks to family-api on the same address (/api/*), so the HttpOnly session cookie goes along.
// No other host is ever called from this page (connect-src 'self').

export interface FamilyPhoto {
  width: number;
  height: number;
  /** Signed for 15 minutes: the small version on a phone, the view version on a laptop. */
  url?: string;
}

export interface FamilyMoment {
  id: string;
  week: number;
  caption: string | null;
  isFirst: boolean;
  firstLabel: string | null;
  day: string;
  photos: FamilyPhoto[];
  hugs: number;
  myHugs: number;
}

export interface FamilyPage {
  child: { firstName: string; birthDate: string | null };
  me: { label: string; relation: string | null; email: string | null; frequency: 'each' | 'weekly' | 'never'; joined: boolean; onBookList: boolean };
  moments: FamilyMoment[];
  /** Older postcards exist ("Eerdere kaartjes"). */
  more: boolean;
  /** The parents allow keeping photos (M6): show "Bewaar foto". */
  mayKeep: boolean;
}

/** No session, or the link doesn't (or no longer) work. */
export class NoAccess extends Error {}
/** The link is already in use on five devices. */
export class TooManyDevices extends Error {}
/** Not allowed (any more), e.g. the parents just switched keeping photos off. */
export class NotAllowed extends Error {}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 404) throw new NoAccess();
  if (response.status === 409) throw new TooManyDevices();
  if (response.status === 403) throw new NotAllowed();
  if (!response.ok) throw new Error(`family-api ${response.status}`);
  return response.json() as Promise<T>;
}

export const api = {
  claim: (code: string) => call<{ ok: true }>('/claim', { code }),
  page: (wide: boolean, skip = 0) => call<FamilyPage>(`/page?wide=${wide ? 1 : 0}${skip ? `&skip=${skip}` : ''}`),
  join: (label: string, email: string, frequency: string) => call<{ ok: true; confirm: boolean | 'limited' }>('/join', { label, email, frequency }),
  confirm: (code: string) => call<{ ok: true }>('/confirm', { code }),
  unsubscribe: (token: string) => call<{ ok: true }>(`/afmelden/${token}`, {}),
  hug: (moment: string) => call<{ mine: number; total: number }>('/hug', { moment }),
  bookList: () => call<{ ok: true }>('/book', {}),
  keep: (moment: string, position: number) => call<{ url: string }>('/keep', { moment, position }),
  /** The big view on a phone: view versions of a block of at most 25 postcards, by moment. */
  views: (skip: number, count: number) => call<{ moments: { id: string; views: (string | null)[] }[] }>('/views', { skip, count }),
  leave: () => call<{ ok: true }>('/leave', {}),
};
