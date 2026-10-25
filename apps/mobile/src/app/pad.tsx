import { firstLook, leapCard, longDutchDate, todayInAmsterdam, TRAIL_WEEKS, trailWeek, weekSpan, type CalendarDate } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, border, Button, Character, color, fontFamily, Icon, MomentCard, NextUp, radius, space, text, useAnnounce, useFocusRing } from '@teddysteps/ui';
import { Doodles } from '@/components/Doodles';
import { Photo } from '@/components/Photo';
import { TextLink } from '@/components/TextLink';
import { Tabs } from '@/components/Tabs';
import { TrailHeader } from '@/components/TrailHeader';
import { UploadStatus } from '@/components/UploadStatus';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { restoreMoment } from '@/lib/moments';
import { byWeek, dayOf, useQueue, useTrailMoments, type TrailMoment } from '@/lib/trail';

// T1 Pad (board "T1 · Pad 3.0, grote foto’s"), with X1 (empty trail), X2/X4 (uploads waiting
// or failed), the one-line "Wat komt eraan" leap card (copy in packages/core/src/leaps.ts,
// checked by child-development-reviewer) and, right after T8 "Moment verwijderen", a way back.
// Week by week, each moment as one big photo to swipe through; "Bekijk week" and every photo
// open the week (T2b) full screen.
export default function Trail() {
  const { state } = useAuth();
  const { moments, source, refresh } = useTrailMoments();
  const { queue, online } = useQueue();
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
        <ScrollView contentContainerStyle={styles.content} alwaysBounceHorizontal={false} showsHorizontalScrollIndicator={false}>
          <View style={styles.gutter}>
            {source === 'failed' || (source === 'cached' && !queue.length) ? (
              <Banner tone="sunshine" character="bizzy" title="Je bent offline">
                {source === 'failed'
                  ? 'Je pad verschijnt zodra je weer verbinding hebt.'
                  : 'Dit is je pad zoals we het kenden. Nieuwe dingen zie je zodra je weer verbinding hebt.'}
              </Banner>
            ) : null}
            <Undo onRestored={refresh} />
            <UploadStatus queue={queue} online={online && source !== 'failed'} />
            {leap ? (
              <NextUp
                title={leap.title}
                when={leap.when}
                summary={leap.kind === 'leap' && leap.when ? `${leap.title}, ${leap.when}` : leap.title}
                items={[leap.notice, leap.capture]}
                tone="lilac"
                footnote={leap.safety ?? undefined}
                open={leapOpen}
                onToggle={() => setLeapOpen(!leapOpen)}
              >
                {leap.disclaimer}
              </NextUp>
            ) : null}
          </View>
          <Timeline moments={shown} week={week} birthDate={trail.birthDate} />
        </ScrollView>
      )}
      <Tabs active="trail" />
    </View>
  );
}

const openWeek = (week: number, photo = 0) => router.push({ pathname: '/weekweergave/[week]', params: { week: String(week), foto: String(photo) } });

/** Above a week's photos: the week, its days, and "Bekijk week". */
function WeekHeading({ week, now, days, onOpen }: { week: number; now?: boolean; days: string; onOpen?: () => void }) {
  const focus = useFocusRing();
  return (
    <View style={styles.weekHeading}>
      <Text accessibilityRole="header" style={styles.weekLabel}>
        {now ? `Week ${week} · nu` : `Week ${week}`}
      </Text>
      <Text style={styles.weekMeta}>{days}</Text>
      {onOpen ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Bekijk week ${week}`}
          onPress={onOpen}
          onFocus={focus.onFocus}
          onBlur={focus.onBlur}
          style={[styles.weekOpen, focus.ring]}
        >
          <Text style={styles.weekOpenText}>Bekijk week</Text>
          <Icon name="chevron-right" size={16} weight={2.6} color={color.bluebird} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** This week first (with a slot if it's still empty), then every week with moments. */
function Timeline({ moments, week, birthDate }: { moments: TrailMoment[]; week: number; birthDate: CalendarDate }) {
  const weeks = byWeek(moments);
  if (!weeks.some(([w]) => w === week)) weeks.unshift([week, []]);
  return (
    <View style={styles.timeline}>
      {weeks.map(([w, list]) => {
        // Where each moment's photos start in the week, so a tap opens T2b at that photo.
        const starts = list.map((_, i) => list.slice(0, i).reduce((n, m) => n + m.photos.length, 0));
        return (
          <View key={w} style={styles.week}>
            <View style={styles.gutter}>
              <WeekHeading week={w} now={w === week} days={weekSpan(birthDate, w)} onOpen={list.length ? () => openWeek(w) : undefined} />
            </View>
            {list.length ? (
              // The photos run edge to edge, like a travel diary; everything else keeps the gutter.
              list.map((m, i) => <Card key={m.key} moment={m} onOpen={(photo) => openWeek(w, starts[i] + photo)} />)
            ) : (
              <View style={styles.gutter}>
                <EmptyWeek />
              </View>
            )}
          </View>
        );
      })}
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
        <Icon name="plus" size={18} weight={3.2} color={color.onBluebird} />
      </View>
      <Text style={styles.emptyText}>Deze week is nog leeg!</Text>
    </Pressable>
  );
}

function Card({ moment: m, onOpen }: { moment: TrailMoment; onOpen: (photo: number) => void }) {
  const first = m.isFirst && m.firstLabel ? { label: m.firstLabel, ...firstLook(m.firstLabel) } : undefined;
  return (
    <MomentCard
      layout="album"
      photos={m.photos.map((p, i) => (
        <Photo key={i} source={p.view} />
      ))}
      alt={m.photos.length === 1 ? (m.caption ? `Foto: ${m.caption}` : 'Foto van dit moment') : m.caption ? `Foto’s: ${m.caption}` : 'Foto’s van dit moment'}
      caption={m.caption ?? (first ? null : 'Een moment')}
      first={first}
      date={dayOf(m)}
      hugs={m.hugs || undefined}
      context={`Week ${m.trailWeek}`}
      onPress={m.momentId ? onOpen : undefined}
    />
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
        {week > 1 ? (
          <Button block variant="paper" onPress={() => router.push('/inhalen')}>
            Haal oudere foto’s op
          </Button>
        ) : null}
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
  content: { paddingTop: 4, paddingBottom: 28, gap: 12 },
  gutter: { paddingHorizontal: space.space4, gap: space.space3 },
  timeline: { gap: space.space5 },
  week: { gap: space.space4 },
  weekHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingHorizontal: 4, minHeight: 44 },
  weekLabel: { ...text('eyebrow'), fontSize: 12, textTransform: 'uppercase' },
  weekMeta: { ...text('meta'), fontSize: 13, color: color.inkMuted },
  weekOpen: { marginLeft: 'auto', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  // Ink text (bluebird on paper is too light for small text); the chevron stays bluebird.
  weekOpenText: { fontFamily: fontFamily('sans', 800), fontSize: 13, color: color.ink },
  emptyWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: radius.radiusL,
    borderWidth: border.edge,
    borderStyle: 'dashed',
    borderColor: color.ink,
  },
  emptyPlus: { width: 36, height: 36, borderRadius: 18, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.bluebird, alignItems: 'center', justifyContent: 'center' },
  emptyText: { flex: 1, fontFamily: fontFamily('sans', 800), fontSize: 15, color: color.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: space.space6, paddingBottom: 12 },
  centerText: { textAlign: 'center' },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
  actions: { alignSelf: 'stretch', gap: 10 },
  undo: { gap: 8, alignItems: 'flex-start' },
  undoActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
