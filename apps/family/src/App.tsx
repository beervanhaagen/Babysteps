import { useCallback, useEffect, useState } from 'react';
import { useTeddyFonts } from '@teddysteps/ui';
import { api, NoAccess as NoAccessError, type FamilyPage } from './api';
import { usePath } from './route';
import { Cards } from './views/Cards';
import { Join } from './views/Join';
import { NoAccess } from './views/NoAccess';
import { Sent } from './views/Sent';

// The family page (F1 to F7) is one light web page without a router package: every
// kilobyte counts on Oma's old phone. /j#<code> signs in once; then:
//   /             F3 Kaartjes (or F2 first, until Oma has said who she is)
//   /instellingen F2 again, to change name, e-mail or how often
//   /verstuurd    F4 after a hug
// The code is read and removed from the address bar before React renders anything, so it
// never ends up in history, screenshots or a forwarded link (docs/family-email.md).
const linkCode = (() => {
  if (window.location.pathname !== '/j') return undefined;
  const code = window.location.hash.slice(1);
  window.history.replaceState(null, '', '/');
  return code;
})();

type Problem = 'no-link' | 'unknown-link' | 'offline';

// The first request starts right away, before fonts and React are ready.
const firstPage: Promise<FamilyPage> | null =
  linkCode === '' ? null : linkCode ? api.claim(linkCode).then(() => api.page()) : api.page();

function problemOf(error: unknown, claiming: boolean): Problem {
  if (!(error instanceof NoAccessError)) return 'offline';
  return claiming ? 'unknown-link' : 'no-link';
}

export default function App() {
  const fontsReady = useTeddyFonts();
  const path = usePath();
  const [page, setPage] = useState<FamilyPage | null>(null);
  const [problem, setProblem] = useState<Problem | null>(linkCode === '' ? 'no-link' : null);

  const load = useCallback(async () => {
    try {
      setPage(await api.page());
      setProblem(null);
    } catch (error) {
      setProblem(problemOf(error, false));
    }
  }, []);

  useEffect(() => {
    firstPage?.then(setPage, (error) => setProblem(problemOf(error, !!linkCode)));
  }, []);

  if (!fontsReady) return null;
  if (problem) return <NoAccess reason={problem} />;
  if (!page) return null;
  if (!page.me.joined || path === '/instellingen') {
    return <Join page={page} editing={page.me.joined} onSaved={load} />;
  }
  if (path === '/verstuurd') return <Sent page={page} onChange={load} />;
  return <Cards page={page} onChange={load} />;
}
