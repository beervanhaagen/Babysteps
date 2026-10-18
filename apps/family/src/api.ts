// Talks to family-api on the same address (/api/*), so the HttpOnly session cookie goes along.
// No other host is ever called from this page (connect-src 'self').

export interface FamilyPhoto {
  width: number;
  height: number;
  view?: string;
  small?: string;
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
}

export class NoAccess extends Error {}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 404) throw new NoAccess();
  if (!response.ok) throw new Error(`family-api ${response.status}`);
  return response.json() as Promise<T>;
}

export const api = {
  claim: (code: string) => call<{ ok: true }>('/claim', { code }),
  page: () => call<FamilyPage>('/page'),
  join: (label: string, email: string, frequency: string) => call<{ ok: true }>('/join', { label, email, frequency }),
  hug: (moment: string) => call<{ mine: number }>('/hug', { moment }),
  bookList: () => call<{ ok: true }>('/book', {}),
};
