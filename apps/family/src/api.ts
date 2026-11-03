// Talks to family-api on the same address (/api/*), so the HttpOnly session cookie goes along.
// No other host is ever called from this page (connect-src 'self').
import { childLook, type ChildLook, type ReactionKind } from '@teddysteps/ui';

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
  /** Per kind (hug and the icons), the total and my own; only kinds that were sent. */
  reactions: Partial<Record<ReactionKind, { total: number; mine: number }>>;
}

/** A child this browser follows (the keyring's start page). */
export interface KeyringChild {
  member: string;
  /** How the child calls this person there ("Oma Ria"). */
  label: string;
  firstName: string;
  birthDate: string | null;
  look: ChildLook;
  newThisWeek: number;
}

export interface FamilyPage {
  /** The circle member this page is for: the child chosen on this browser. */
  member?: string;
  child: { firstName: string; birthDate: string | null; look: ChildLook };
  me: { label: string; relation: string | null; email: string | null; frequency: 'each' | 'weekly' | 'never'; joined: boolean; onBookList: boolean };
  moments: FamilyMoment[];
  /** Older moments exist ("Eerdere momenten"). */
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

// The child this tab is looking at, sent as X-Kring. Kept for this tab only: a new tab starts at
// the start page again when the browser follows more than one child.
const KRING = 'teddysteps.kring';
let kring: string | null = (() => {
  try {
    return sessionStorage.getItem(KRING);
  } catch {
    return null;
  }
})();

export const chosenChild = () => kring;
export function chooseChild(member: string | null) {
  kring = member;
  try {
    if (member) sessionStorage.setItem(KRING, member);
    else sessionStorage.removeItem(KRING);
  } catch {
    // Private mode without storage: the choice lasts until the page reloads.
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (kring) headers['X-Kring'] = kring;
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 404) throw new NoAccess();
  if (response.status === 409) throw new TooManyDevices();
  if (response.status === 403) throw new NotAllowed();
  if (!response.ok) throw new Error(`family-api ${response.status}`);
  return response.json() as Promise<T>;
}

export const api = {
  claim: (code: string) => call<{ ok: true; member?: string }>('/claim', { code }),
  kinderen: () =>
    call<{ children: KeyringChild[] }>('/kinderen').then((r) => r.children.map((c) => ({ ...c, look: childLook(c.look?.animal, c.look?.tone) }))),
  // A missing or unknown look (an older or newer family-api) shows Bo on lilac.
  page: (wide: boolean, skip = 0) =>
    call<FamilyPage>(`/page?wide=${wide ? 1 : 0}${skip ? `&skip=${skip}` : ''}`).then((p) => ({
      ...p,
      child: { ...p.child, look: childLook(p.child.look?.animal, p.child.look?.tone) },
      moments: p.moments.map((m) => ({ ...m, reactions: m.reactions ?? {} })),
    })),
  join: (label: string, email: string, frequency: string) => call<{ ok: true; confirm: boolean | 'limited' }>('/join', { label, email, frequency }),
  confirm: (code: string) => call<{ ok: true }>('/confirm', { code }),
  unsubscribe: (token: string) => call<{ ok: true }>(`/afmelden/${token}`, {}),
  hug: (moment: string) => call<{ mine: number; total: number }>('/hug', { moment }),
  react: (moment: string, kind: ReactionKind) => call<{ reactions: FamilyMoment['reactions'] }>('/react', { moment, kind }),
  bookList: () => call<{ ok: true }>('/book', {}),
  keep: (moment: string, position: number) => call<{ url: string }>('/keep', { moment, position }),
  /** The big view on a phone: view versions of a block of at most 25 postcards, by moment. */
  views: (skip: number, count: number) => call<{ moments: { id: string; views: (string | null)[] }[] }>('/views', { skip, count }),
  leave: () => call<{ ok: true }>('/leave', {}),
};
