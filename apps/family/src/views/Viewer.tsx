import { firstLook, longDutchDate, possessive, weekName, weekShort, todayInAmsterdam, trailWeek, weekSpan, type CalendarDate } from '@teddysteps/core';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { PhotoViewer, ReactionCounts, type ReactionKind, type ViewerPhoto } from '@teddysteps/ui';
import { api, type FamilyMoment, type FamilyPage } from '../api';
import { Love } from './Love';
import { Photo } from './shared';

const WIDE = 900;
const BLOCK = 25;
// The view links last 15 minutes: fetch fresh ones well before that while the big view is open.
const REFRESH_MS = 12 * 60 * 1000;

// T2b on the family page: the postcards' photos big, oldest first, to swipe or tap through, with
// a hug button under each. Opens over the postcards, so going back keeps your place there.
interface ViewerProps {
  page: FamilyPage;
  start: { moment: string; photo: number };
  onReacted: (id: string, kind: ReactionKind, reactions: FamilyMoment['reactions']) => void;
  onClose: () => void;
}

export function Viewer({ page, start, onReacted, onClose }: ViewerProps) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const birth = page.child.birthDate as CalendarDate | null;
  const name = page.child.firstName;
  // A phone has the small versions; the view versions come when the big view opens.
  const [views, setViews] = useState<Map<string, (string | null)[]>>(new Map());
  // Fetched again when older postcards come in (not on a hug), and every 12 minutes.
  const loaded = page.moments.length;
  useEffect(() => {
    if (wide || !loaded) return;
    const load = () =>
      Promise.all(Array.from({ length: Math.ceil(loaded / BLOCK) }, (_, i) => api.views(i * BLOCK, BLOCK))).then(
        (blocks) => setViews(new Map(blocks.flatMap((r) => r.moments.map((m) => [m.id, m.views] as const)))),
        () => undefined,
      );
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [wide, loaded]);
  // Over the postcards: its own title, focus on its heading, and the page underneath stays put.
  useEffect(() => {
    const before = document.title;
    document.title = `${possessive(name)} foto’s · TeddySteps`;
    const heading = document.querySelector<HTMLElement>('[role="heading"][aria-level="1"]');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      document.title = before;
      root.style.overflow = overflow;
    };
  }, [name]);
  if (!birth) return null;
  const now = Math.min(trailWeek(birth, todayInAmsterdam()), 104);

  // Oldest first, weeks and the moments in them.
  const oldest = [...page.moments].reverse();
  const photos: ViewerPhoto[] = [];
  for (const m of oldest) {
    m.photos.forEach((p, i) => {
      photos.push({
        key: `${m.id}-${i}`,
        week: m.week,
        index: i,
        count: m.photos.length,
        photo: <Big uri={views.get(m.id)?.[i] ?? undefined} small={p.url} label={m.caption ? `Foto: ${m.caption}` : `Foto uit ${weekName(m.week).toLowerCase()}`} />,
        caption: m.caption,
        first: m.isFirst && m.firstLabel ? { label: m.firstLabel, ...firstLook(m.firstLabel) } : undefined,
        date: longDutchDate(m.day as CalendarDate),
        below: <Hug moment={m} onReacted={onReacted} />,
      });
    });
  }

  return (
    <PhotoViewer
      photos={photos}
      // Older postcards that aren't loaded yet would look like empty weeks: start at the oldest loaded.
      from={page.more && oldest.length ? oldest[0].week : 1}
      start={{ key: `${start.moment}-${start.photo}`, week: now }}
      now={Math.max(now, ...photos.map((p) => p.week))}
      span={(w) => weekSpan(birth, w)}
      weekName={weekName}
      weekShort={weekShort}
      character={page.child.look.animal}
      onClose={onClose}
      closeLabel={`Terug naar ${possessive(name)} pad`}
    />
  );
}

/** The view version, or the small one while it isn't there or when it doesn't load. */
function Big({ uri, small, label }: { uri?: string; small?: string; label: string }): ReactNode {
  const [failed, setFailed] = useState<string>();
  const big = uri && uri !== failed ? uri : undefined;
  return <Photo uri={big ?? small} label={label} fit="contain" onError={big ? () => setFailed(big) : undefined} />;
}

/** Under the big photo: what's been sent, and a hug or an icon right there. */
function Hug({ moment: m, onReacted }: { moment: FamilyMoment; onReacted: ViewerProps['onReacted'] }) {
  return (
    <View style={styles.hug}>
      <ReactionCounts counts={Object.fromEntries(Object.entries(m.reactions).map(([k, v]) => [k, v?.total ?? 0]))} />
      <Love moment={m} onReacted={onReacted} />
    </View>
  );
}

const styles = StyleSheet.create({
  hug: { gap: 10, paddingTop: 4 },
});
