import { firstLook, leapCard, longDutchDate, shortDutchDate, todayInAmsterdam, TRAIL_WEEKS, trailWeek, weekSpan, type CalendarDate } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Banner, border, Button, Character, color, FirstIcon, fontFamily, Icon, MomentCard, NextUp, radius, Segmented, space, text, useAnnounce, useFocusRing } from '@teddysteps/ui';
import { Doodles } from '@/components/Doodles';
import { Photo } from '@/components/Photo';
import { TextLink } from '@/components/TextLink';
import { Tabs } from '@/components/Tabs';
import { TrailHeader } from '@/components/TrailHeader';
import { UploadStatus } from '@/components/UploadStatus';
import { useAuth } from '@/lib/auth';
import { startMoment } from '@/lib/draft';
import { friendlyError } from '@/lib/errors';
import { restoreMoment } from '@/lib/moments';
import { useQueue, useTrailMoments, type TrailMoment } from '@/lib/trail';

// T1 Pad (board "T1 · Trail home 2.0", spec "Pad 2.0"), with X1 (empty trail), X2/X4 (uploads
// waiting or failed), the folded "Wat komt eraan" leap card (copy in packages/core/src/leaps.ts,
// checked by child-development-reviewer) and, right after T8 "Moment verwijderen", a way back.
// Two views: the timeline (weeks with straight cards) and the grid (every photo, by week).
export default function Trail() {
  const { state } = useAuth();
  const { moments, source, refresh } = useTrailMoments();
  const { queue, online } = useQueue();
  const [view, setView] = useState<'tijdlijn' | 'raster'>('tijdlijn');
  const [leapOpen, setLeapOpen] = useState(false);
  if (state.status !== 'ready') return null;
  const { trail } = state;
  const today = todayInAmsterdam();
  const week = trail.birthDate ? trailWeek(trail.birthDate, today) : null;
  const leap = trail.birthDate && trail.leapCardsOn ? leapCard(trail.childName, trail.dueDate, trail.birthDate, today) : null;
  // A moment still uploading shows in the upload status above, not twice.
  const shown = moments.filter((m) => !m.queued || m.queued.stage === 'visible');

  return (
    <View style={styles.screen}>
      <TrailHeader childName={trail.childName} week={week ? `Week ${week} van ${TRAIL_WEEKS}` : null} />
      {!week || !trail.birthDate ? (
        <OnTheWay dueDate={longDutchDate(trail.dueDate, { weekday: false, year: true })} />
      ) : source === 'server' && !moments.length ? (
        <EmptyTrail week={week} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {source === 'failed' || (source === 'cached' && !queue.length) ? (
            <Banner tone="sunshine" character="bizzy" title="Je bent offline">
              {source === 'failed'
                ? 'Je pad verschijnt zodra je weer verbinding hebt.'
                : 'Dit is je pad zoals we het kenden. Nieuwe dingen zie je zodra je weer verbinding hebt.'}
            </Banner>
          ) : null}
          <Undo onRestored={refresh} />
          <UploadStatus queue={queue} online={online && source !== 'failed'} />
          <Segmented
            label="Weergave"
            options={[
              { value: 'tijdlijn', label: 'Tijdlijn', icon: 'timeline' },
              { value: 'raster', label: 'Raster', icon: 'grid' },
            ]}
            value={view}
            onChange={setView}
          />
          {leap ? (
            <NextUp
              title={leap.title}
              when={leap.when}
              summary={leap.kind === 'leap' && !leapOpen ? LEAP_SUMMARY : undefined}
              items={[leap.notice, leap.capture]}
              tone="lilac"
              // The huisarts line stays visible, folded or not.
              footnote={leap.safety ?? undefined}
              open={leapOpen}
              onToggle={() => setLeapOpen(!leapOpen)}
            >
              {leap.disclaimer}
            </NextUp>
          ) : null}
          {view === 'tijdlijn' ? <Timeline moments={shown} week={week} birthDate={trail.birthDate} /> : <Grid moments={shown} birthDate={trail.birthDate} />}
        </ScrollView>
      )}
      <Tabs active="trail" />
    </View>
  );
}

/** The folded leap card's one line (board Trail-2-0, wording child-development-reviewer). Only on a
 *  real leap, and hidden once open, where the disclaimer says the same. */
const LEAP_SUMMARY = 'Een ruwe schatting, geen deadline. Het kan ook eerder, later of nauwelijks merkbaar zijn.';

/** Moments by week, newest first. */
function byWeek(moments: TrailMoment[]): [number, TrailMoment[]][] {
  const weeks = new Map<number, TrailMoment[]>();
  for (const m of moments) weeks.set(m.trailWeek, [...(weeks.get(m.trailWeek) ?? []), m]);
  return [...weeks.entries()].sort((a, b) => b[0] - a[0]);
}

const countLine = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/** The day of the photo, or else the Dutch day it was pinned. */
const dayOf = (m: TrailMoment) => shortDutchDate(m.happenedOn ?? todayInAmsterdam(new Date(m.createdAt)));

/** Above a week's photos: a small sticker with the week (sunshine for this week) and its days. */
function WeekHeading({ week, now, meta }: { week: number; now?: boolean; meta: string }) {
  return (
    <View style={styles.weekHeading}>
      <View style={[styles.weekTag, now && styles.weekTagNow]}>
        <Text accessibilityRole="header" style={styles.weekLabel}>
          {now ? `Week ${week} · nu` : `Week ${week}`}
        </Text>
      </View>
      <Text style={styles.weekMeta}>{meta}</Text>
    </View>
  );
}

/** Tijdlijn: this week first (with a slot if it's still empty), then every week with moments. */
function Timeline({ moments, week, birthDate }: { moments: TrailMoment[]; week: number; birthDate: CalendarDate }) {
  const weeks = byWeek(moments);
  if (!weeks.some(([w]) => w === week)) weeks.unshift([week, []]);
  return (
    <View style={styles.timeline}>
      {weeks.map(([w, list]) => (
        <View key={w} style={styles.week}>
          <WeekHeading week={w} now={w === week} meta={list.length ? `${weekSpan(birthDate, w)} · ${countLine(list.length, 'moment', 'momenten')}` : weekSpan(birthDate, w)} />
          {list.length ? (
            list.map((m, i) => <Card key={m.key} moment={m} layout={i === 0 || m.isFirst || m.photos.length > 1 ? 'large' : 'compact'} />)
          ) : (
            <EmptyWeek />
          )}
        </View>
      ))}
    </View>
  );
}

/** "Deze week is nog leeg!": a dashed slot that opens A1. */
function EmptyWeek() {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Deze week is nog leeg. Moment toevoegen"
      onPress={() => router.push('/toevoegen')}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.emptyWeek, focus.ring]}
    >
      <View style={styles.emptyPlus}>
        <Icon name="plus" size={16} weight={3.2} color={color.onBluebird} />
      </View>
      <Text style={styles.emptyText}>Deze week is nog leeg!</Text>
      <Text style={styles.emptyAction}>Toevoegen</Text>
    </Pressable>
  );
}

function Card({ moment: m, layout }: { moment: TrailMoment; layout: 'large' | 'compact' }) {
  const first = m.isFirst && m.firstLabel ? { label: m.firstLabel, ...firstLook(m.firstLabel) } : undefined;
  const photos = layout === 'large' ? m.photos.slice(0, 3) : m.photos.slice(0, 1);
  return (
    <MomentCard
      layout={layout}
      // The large first photo fills the card's width, so it takes the sharper view version.
      photos={photos.map((p, i) => (
        <Photo key={i} source={layout === 'large' && i === 0 ? p.view : p.small} />
      ))}
      photoCount={m.photos.length}
      alt={m.photos.length === 1 ? 'Foto' : `${m.photos.length} foto’s`}
      caption={m.caption ?? (first ? null : 'Een moment')}
      first={first}
      date={dayOf(m)}
      hugs={m.hugs || undefined}
      context={`Week ${m.trailWeek}`}
      onPress={m.momentId ? () => router.push(`/moment/${m.momentId}`) : undefined}
    />
  );
}

/** Raster: every photo by week, three in a row; a first shows its icon on its first photo. */
function Grid({ moments, birthDate }: { moments: TrailMoment[]; birthDate: CalendarDate }) {
  const { width } = useWindowDimensions();
  const cell = Math.floor((Math.min(width - space.space5 * 2, 342) - border.edge * 2 - 6) / 3);
  return (
    <View style={styles.grid}>
      {byWeek(moments).map(([w, list]) => {
        const count = list.reduce((n, m) => n + m.photos.length, 0);
        return (
          <View key={w} style={styles.gridWeek}>
            <WeekHeading week={w} meta={`${weekSpan(birthDate, w)} · ${countLine(count, 'foto', 'foto’s')}`} />
            <View style={styles.gridPhotos}>
              {list.flatMap((m) =>
                m.photos.map((p, i) => (
                  <GridPhoto key={`${m.key}-${i}`} moment={m} index={i} source={p.small} size={cell} />
                )),
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function GridPhoto({ moment: m, index, source, size: side }: { moment: TrailMoment; index: number; source: TrailMoment['photos'][number]['small']; size: number }) {
  const focus = useFocusRing();
  const first = m.isFirst && m.firstLabel && index === 0 ? firstLook(m.firstLabel) : null;
  const label = [first ? `Eerste keer: ${m.firstLabel}` : null, m.caption, `foto ${index + 1} van ${m.photos.length}`].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={m.momentId ? () => router.push(`/moment/${m.momentId}`) : undefined}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[{ width: side, height: side }, styles.gridPhoto, focus.ring]}
    >
      <Photo source={source} />
      {first ? (
        <View style={styles.gridFirst}>
          <FirstIcon icon={first.icon} tone={first.tone} size={26} iconSize={16} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** After T8 "Moment verwijderen": the moment can come back right here, and for 30 days under Ik. */
function Undo({ onRestored }: { onRestored: () => Promise<void> }) {
  const { verwijderd } = useLocalSearchParams<{ verwijderd?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(verwijderd ? 'Moment verwijderd. Je kunt het terugzetten.' : undefined);
  // No time limit: the banner stays until the parent restores it, closes it or leaves the trail.
  if (!verwijderd) return null;

  async function restore() {
    setBusy(true);
    try {
      await restoreMoment(verwijderd!);
      await onRestored();
      router.setParams({ verwijderd: undefined });
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <View style={styles.undo}>
      <Banner tone="butter" icon="trash" title="Moment verwijderd">
        {error ?? 'Ook weg bij je familie. Je kunt het 30 dagen terugzetten, ook via Ik.'}
      </Banner>
      <View style={styles.undoActions}>
        <Button variant="paper" size="md" icon="back" onPress={restore} busy={busy}>
          Terugzetten
        </Button>
        {busy ? null : <TextLink onPress={() => router.setParams({ verwijderd: undefined })}>Sluiten</TextLink>}
      </View>
    </View>
  );
}

/** X1 Leeg pad. */
function EmptyTrail({ week }: { week: number }) {
  return (
    <View style={styles.center}>
      <Doodles />
      <Character name="bo" size={130} decorative />
      <Text accessibilityRole="header" style={[text('titleL'), styles.centerText]}>
        Week {week} wacht op je!
      </Text>
      <Text style={[styles.body, styles.centerText]}>Elk pad begint met één moment. Een slaperige foto telt helemaal mee.</Text>
      <View style={styles.actions}>
        <Button block icon="plus" onPress={() => router.push('/toevoegen')}>
          Voeg je eerste moment toe
        </Button>
        <Button block variant="paper" onPress={() => void startMoment('older')}>
          Haal oudere foto’s op
        </Button>
      </View>
    </View>
  );
}

/** Before the birth there is nothing to pin yet (decided 17 October 2026). */
function OnTheWay({ dueDate }: { dueDate: string }) {
  return (
    <View style={styles.center}>
      <Doodles />
      <Character name="bo" size={130} mood="happy" decorative />
      <Text accessibilityRole="header" style={[text('titleL'), styles.centerText]}>
        Nog even geduld!
      </Text>
      <Text style={[styles.body, styles.centerText]}>
        Het pad begint bij de geboorte. Uitgerekend: {dueDate}. Is je kleintje er al? Dan kun je meteen het eerste moment vastpinnen.
      </Text>
      <View style={styles.actions}>
        <Button block onPress={() => router.push('/geboren')}>
          Mijn kleintje is geboren!
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingTop: 2, paddingHorizontal: space.space5, paddingBottom: space.space6, gap: space.space4 },
  timeline: { gap: 22 },
  week: { gap: 10 },
  weekHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekTag: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: radius.radiusS, borderWidth: 1.5, borderColor: color.ink, backgroundColor: color.card },
  weekTagNow: { backgroundColor: color.sunshine },
  weekLabel: { fontFamily: fontFamily('sans', 800), fontSize: 12, lineHeight: 18, color: color.ink },
  weekMeta: { ...text('meta'), fontSize: 13, color: color.inkMuted },
  emptyWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: radius.radiusM,
    borderWidth: border.edge,
    borderStyle: 'dashed',
    borderColor: color.ink,
  },
  emptyPlus: { width: 32, height: 32, borderRadius: 16, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.bluebird, alignItems: 'center', justifyContent: 'center' },
  emptyText: { flex: 1, fontFamily: fontFamily('sans', 800), fontSize: 14, color: color.ink },
  emptyAction: { ...text('meta'), fontSize: 13, color: color.inkMuted },
  grid: { gap: 10 },
  gridWeek: { gap: 10, marginTop: 6 },
  gridPhotos: {
    maxWidth: 342,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    borderRadius: radius.radiusM,
    borderWidth: border.edge,
    borderColor: color.ink,
    overflow: 'hidden',
    backgroundColor: color.white,
  },
  gridPhoto: { backgroundColor: color.lilac },
  gridFirst: { position: 'absolute', left: 6, bottom: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: space.space6, paddingBottom: 12 },
  centerText: { textAlign: 'center' },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
  actions: { alignSelf: 'stretch', gap: 10 },
  undo: { gap: 8, alignItems: 'flex-start' },
  undoActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
