import { useCallback, useEffect, useRef, useState } from 'react';
import { Dwarrel, useTeddyFonts, type ReactionKind } from '@teddysteps/ui';
import { api, chooseChild, chosenChild, NoAccess as NoAccessError, TooManyDevices, type FamilyMoment, type FamilyPage, type KeyringChild } from './api';
import { navigate, usePath } from './route';
import { Cards } from './views/Cards';
import { Join } from './views/Join';
import { ConfirmEmail, OpenFromMail, Unsubscribe } from './views/MailLinks';
import { NoAccess, type Problem } from './views/NoAccess';
import { Sent } from './views/Sent';
import { Loading } from './views/shared';
import { Picker } from './views/Picker';
import { Viewer } from './views/Viewer';
import { View } from 'react-native';

// The family page (F1 to F7) is one light web page without a router package: every
// kilobyte counts on Oma's old phone. /j#<code> signs in once. Links in mails (step 7):
//   /m#<code>          from the Sunday mail: opens the trail, after a tap on a new device
//   /bevestig#<code>   "Ja, dit is mijn adres"
//   /afmelden#<token>  no more Sunday mails
// Then:
//   /             F3 the moments (or F2 first, until Oma has said who she is)
//   /instellingen F2 again as "Jouw profiel": name, e-mail, how often, or stop
//   /verstuurd    F4 after a hug
//   /foto         T2b, the photos big, over the postcards (back returns to the same place)
//   /kies         "Wie wil je zien?" when this browser follows more than one child

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

/** The page, or the keyring's start page when this browser follows several children. */
type Opened = FamilyPage | { choose: KeyringChild[] };

async function open(): Promise<Opened> {
  if (linkCode) {
    try {
      // The link just opened is the child to show.
      const claimed = await api.claim(linkCode);
      chooseChild(claimed.member ?? null);
    } catch (error) {
      // An old link on a device that is already in: we can't tell whose it was, so with several
      // children the start page asks; with one, that child's page.
      if (!(error instanceof NoAccessError)) throw error;
      chooseChild(null);
      return chooseOrPage().catch(() => {
        throw error;
      });
    }
    linkCode = undefined;
  }
  return chooseOrPage();
}

async function chooseOrPage(): Promise<Opened> {
  if (!chosenChild()) {
    const children = await api.kinderen().catch(() => []);
    if (children.length > 1) return { choose: children };
  }
  try {
    return await api.page(isWide());
  } catch (error) {
    // The child chosen in this tab is no longer there (taken off the circle): start over.
    if (error instanceof NoAccessError && chosenChild()) {
      chooseChild(null);
      return chooseOrPage();
    }
    throw error;
  }
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
  const [viewing, setViewing] = useState<{ moment: string; photo: number } | null>(null);
  // The keyring: the start page while choosing, and the children for "Ander kindje".
  const [choosing, setChoosing] = useState<KeyringChild[] | null>(null);
  const [ring, setRing] = useState<KeyringChild[]>([]);
  // The photo that opened the big view gets focus back when it closes.
  const opener = useRef<HTMLElement | null>(null);
  const showing = path === '/foto' && !!viewing;
  useEffect(() => {
    if (showing || !opener.current) return;
    opener.current.focus({ preventScroll: true });
    opener.current = null;
  }, [showing]);

  const show = useCallback((next: Opened) => {
    setProblem(null);
    if ('choose' in next) {
      setRing(next.choose);
      return setChoosing(next.choose);
    }
    // From now on this tab asks for this child, also after a link for another one was opened.
    if (next.member) chooseChild(next.member);
    setChoosing(null);
    setPage(next);
    setLoadedAt(Date.now());
    api.kinderen().then(setRing, () => undefined);
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

  // A hug or an icon updates its own card (nothing else is loaded again) and floats up the screen.
  const [burst, setBurst] = useState<{ kind: ReactionKind; count: number; id: number } | null>(null);
  const reacted = useCallback((id: string, kind: ReactionKind, reactions: FamilyMoment['reactions']) => {
    setPage(
      (current) =>
        current && {
          ...current,
          moments: current.moments.map((m) =>
            m.id === id ? { ...m, reactions, hugs: reactions.hug?.total ?? m.hugs, myHugs: reactions.hug?.mine ?? m.myHugs } : m,
          ),
        },
    );
    setBurst({ kind, count: 8, id: Date.now() });
  }, []);

  // A reactie written or deleted: only that card changes.
  const commentsChanged = useCallback((id: string, change: { comments: FamilyMoment['comments']; commentCount: number }) => {
    setPage((current) => current && { ...current, moments: current.moments.map((m) => (m.id === id ? { ...m, ...change } : m)) });
  }, []);
  // "Reageren" in the big view: back to the postcards, at that card's field.
  const [writeOn, setWriteOn] = useState<string>();

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

  // A month chip further back: load older moments (12 at a time) until that week is in.
  const olderUntil = useCallback(
    async (week: number) => {
      if (!page) return;
      let moments = page.moments;
      let more = page.more;
      while (more && moments.length && moments[moments.length - 1].week > week && moments.length < 2000) {
        const next = await api.page(isWide(), moments.length);
        moments = [...moments, ...next.moments.filter((m: FamilyMoment) => !moments.some((c) => c.id === m.id))];
        more = next.more;
        if (!next.moments.length) break;
      }
      setPage((current) => current && { ...current, moments, more });
    },
    [page],
  );

  if (!fontsReady) return <Loading />;
  if (startPath === '/bevestig') return <ConfirmEmail code={hashCode ?? ''} />;
  if (startPath === '/afmelden') return <Unsubscribe token={hashCode ?? ''} />;
  // From the Sunday mail on a device that isn't in yet: one tap, then the trail.
  if (problem && mailCode && !page) {
    return (
      <OpenFromMail
        onOpen={async () => {
          const claimed = await api.claim(mailCode);
          chooseChild(claimed.member ?? null);
          show(await api.page(isWide()));
        }}
      />
    );
  }
  if (problem) return <NoAccess reason={problem} onRetry={problem === 'offline' ? reload : undefined} />;
  // Another child: its page loads fresh; the same child just goes back.
  const pick = (member: string) => {
    setChoosing(null);
    if (page && member === page.member) return navigate('/', true);
    chooseChild(member);
    setPage(null);
    navigate('/', true);
    reload();
  };
  if (choosing) return <Picker choices={choosing} onPick={pick} />;
  if (!page) return <Loading />;
  // "Ander kindje kiezen": its own address, so the browser's Back returns to the child.
  if (path === '/kies' && ring.length > 1) return <Picker choices={ring} current={page.member} onPick={pick} />;
  if (!page.me.joined || path === '/instellingen') {
    return <Join page={page} editing={page.me.joined} onSaved={reload} onLeft={() => setProblem('left')} />;
  }
  if (path === '/verstuurd') return <Sent name={page.child.firstName} />;
  const openPhoto = (moment: string, photo: number) => {
    opener.current = document.activeElement as HTMLElement | null;
    setViewing({ moment, photo });
    navigate('/foto', false, false);
  };
  // The postcards always stay in the same place, so opening and closing the big view keeps their
  // state and scroll. After a reload on /foto there is nothing to show big yet: just the postcards.
  return (
    <>
      {/* First in the page, so its heading is the one that gets focus; the postcards stay underneath, inert. */}
      {showing ? (
        <View style={{ position: 'fixed' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, overscrollBehavior: 'contain' } as object}>
          <Viewer
            page={page}
            start={viewing!}
            onReacted={reacted}
            onClose={() => window.history.back()}
            onWrite={(id) => {
              // The field gets focus, not the photo that opened the big view.
              opener.current = null;
              setWriteOn(id);
              window.history.back();
            }}
          />
        </View>
      ) : null}
      <View style={{ flex: 1 }} aria-hidden={showing || undefined} {...(showing ? ({ inert: '' } as object) : {})}>
        <Cards
          page={page}
          onReacted={reacted}
          onOlder={older}
          onOlderUntil={olderUntil}
          onOpen={openPhoto}
          onSwitch={ring.length > 1 ? () => navigate('/kies') : undefined}
          onCommentsChanged={commentsChanged}
          writeOn={showing ? undefined : writeOn}
        />
      </View>
      <View pointerEvents="none" style={{ position: 'fixed' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}>
        <Dwarrel burst={burst} />
      </View>
    </>
  );
}
