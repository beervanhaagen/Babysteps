import { useCallback, useEffect, useState } from 'react';
import { useTeddyFonts } from '@teddysteps/ui';
import { api, NoAccess as NoAccessError, TooManyDevices, type FamilyMoment, type FamilyPage } from './api';
import { usePath } from './route';
import { Cards } from './views/Cards';
import { Join } from './views/Join';
import { ConfirmEmail, OpenFromMail, Unsubscribe } from './views/MailLinks';
import { NoAccess, type Problem } from './views/NoAccess';
import { Sent } from './views/Sent';
import { Loading } from './views/shared';

// The family page (F1 to F7) is one light web page without a router package: every
// kilobyte counts on Oma's old phone. /j#<code> signs in once. Links in mails (step 7):
//   /m#<code>          from the Sunday mail: opens the trail, after a tap on a new device
//   /bevestig#<code>   "Ja, dit is mijn adres"
//   /afmelden#<token>  no more Sunday mails
// Then:
//   /             F3 Kaartjes (or F2 first, until Oma has said who she is)
//   /instellingen F2 again, to change name, e-mail or how often, or to stop
//   /verstuurd    F4 after a hug

// The code is read and removed from the address bar before React renders anything, so it
// never ends up in history, screenshots or a forwarded link (docs/family-email.md). It stays
// in memory until the claim worked, so "Probeer opnieuw" can use it after a dropped connection.
const startPath = window.location.pathname;
const hashCode = (() => {
  if (!['/j', '/m', '/bevestig', '/afmelden'].includes(startPath)) return undefined;
  const code = window.location.hash.slice(1);
  window.history.replaceState(null, '', startPath === '/j' || startPath === '/m' ? '/' : startPath);
  return code;
})();
let linkCode = startPath === '/j' ? hashCode : undefined;
// The Sunday mail's code waits for a tap, so a mail scanner never takes one of the 5 device places.
const mailCode = startPath === '/m' ? hashCode : undefined;
// These pages need no session at all.
const mailPage = startPath === '/bevestig' || startPath === '/afmelden';

const WIDE = 900;
const isWide = () => window.innerWidth >= WIDE;
// Signed photo links last 15 minutes; refresh well before that when Oma comes back to the tab.
const STALE_MS = 10 * 60 * 1000;

async function open(): Promise<FamilyPage> {
  if (linkCode) {
    try {
      await api.claim(linkCode);
    } catch (error) {
      // An old link on a device that is already in: just show the page.
      if (!(error instanceof NoAccessError)) throw error;
      return api.page(isWide()).catch(() => {
        throw error;
      });
    }
    linkCode = undefined;
  }
  return api.page(isWide());
}

function problemOf(error: unknown): Problem {
  if (error instanceof TooManyDevices) return 'full';
  if (!(error instanceof NoAccessError)) return 'offline';
  return linkCode ? 'unknown-link' : 'no-link';
}

// Starts before fonts and React are ready.
const first = linkCode === '' || mailPage ? null : open();

export default function App() {
  const fontsReady = useTeddyFonts();
  const path = usePath();
  const [page, setPage] = useState<FamilyPage | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(linkCode === '' ? 'no-link' : null);

  const show = useCallback((next: FamilyPage) => {
    setPage(next);
    setLoadedAt(Date.now());
    setProblem(null);
  }, []);

  const reload = useCallback(() => {
    open().then(show, (error) => setProblem(problemOf(error)));
  }, [show]);

  useEffect(() => {
    first?.then(show, (error) => setProblem(problemOf(error)));
  }, [show]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - loadedAt > STALE_MS) reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadedAt, reload]);

  // A hug updates its own card; nothing else is loaded again.
  const hugged = useCallback((id: string, counts: { mine: number; total: number }) => {
    setPage((current) =>
      current && { ...current, moments: current.moments.map((m) => (m.id === id ? { ...m, myHugs: counts.mine, hugs: counts.total } : m)) },
    );
  }, []);

  const older = useCallback(async () => {
    if (!page?.moments.length) return;
    const next = await api.page(isWide(), page.moments.length);
    setPage(
      (current) =>
        current && {
          ...current,
          moments: [...current.moments, ...next.moments.filter((m: FamilyMoment) => !current.moments.some((c) => c.id === m.id))],
          more: next.more,
        },
    );
  }, [page]);


  if (!fontsReady) return <Loading />;
  if (startPath === '/bevestig') return <ConfirmEmail code={hashCode ?? ''} />;
  if (startPath === '/afmelden') return <Unsubscribe token={hashCode ?? ''} />;
  // From the Sunday mail on a device that isn't in yet: one tap, then the trail.
  if (problem && mailCode && !page) {
    return (
      <OpenFromMail
        onOpen={async () => {
          await api.claim(mailCode);
          show(await api.page(isWide()));
        }}
      />
    );
  }
  if (problem) return <NoAccess reason={problem} onRetry={problem === 'offline' ? reload : undefined} />;
  if (!page) return <Loading />;
  if (!page.me.joined || path === '/instellingen') {
    return <Join page={page} editing={page.me.joined} onSaved={reload} onLeft={() => setProblem('left')} />;
  }
  if (path === '/verstuurd') return <Sent />;
  return <Cards page={page} onHugged={hugged} onOlder={older} />;
}
