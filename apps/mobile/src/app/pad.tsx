import { firstLook, leapCard, longDutchDate, possessive, todayInAmsterdam, TRAIL_WEEKS, trailWeek, weekSpan, type CalendarDate } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Banner, border, Button, Callout, Character, color, fontFamily, Icon, MomentCard, NextUp, radius, space, text, useAnnounce, useFocusRing } from '@teddysteps/ui';
import { Doodles } from '@/components/Doodles';
import { Photo } from '@/components/Photo';
import { TextLink } from '@/components/TextLink';
import { Tabs } from '@/components/Tabs';
import { TrailHeader } from '@/components/TrailHeader';
import { UploadStatus } from '@/components/UploadStatus';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { myPartnerInvite } from '@/lib/family';
import { restoreMoment } from '@/lib/moments';
import { byWeek, dayOf, useQueue, useTrailMoments, type TrailMoment } from '@/lib/trail';

// T1 Pad (board "T1 · Pad 3.0, grote foto’s"), with X1 (empty trail), X2/X4 (uploads waiting
// or failed), the one-line "Wat komt eraan" leap card (copy in packages/core/src/leaps.ts,
// checked by child-development-reviewer) and, right after T8 "Moment verwijderen", a way back.
// A timeline of weeks with the moments as album pages; every photo opens the big view (T2b).
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
          <View style={styles.gutter}>
            <Timeline moments={shown} week={week} birthDate={trail.birthDate} />
          </View>
        </ScrollView>
      )}
      <Tabs active="trail" />
    </View>
  );
}

/** T2b, the big view, at one photo of a moment. */
const openPhoto = (week: number, moment: string, photo: number) =>
  router.push({ pathname: '/weekweergave/[week]', params: { week: String(week), moment, foto: String(photo) } });

/**
 * The trail as a timeline, like a travel diary (owner, 25 October 2026): a dotted path down the
 * left with a stop for every week that has moments (Bo stands on this week's), the moments as
 * album pages beside it. A tap on a photo opens the big view there.
 */
function Timeline({ moments, week, birthDate }: { moments: TrailMoment[]; week: number; birthDate: CalendarDate }) {
  const { width } = useWindowDimensions();
  const weeks = byWeek(moments);
  if (!weeks.some(([w]) => w === week)) weeks.unshift([week, []]);
  // Card width is the screen minus the gutters and the path's column.
  const photoHeight = Math.round((width - space.space4 * 2 - RAIL) * 0.82);
  return (
    <View style={styles.timeline}>
      <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      {weeks.map(([w, list]) => (
        <View key={w} style={styles.week}>
          <View style={styles.weekHeading}>
            <View style={styles.marker} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {w === week ? (
                <View style={styles.bo}>
                  <Character name="bo" size={30} decorative />
                </View>
              ) : null}
              <View style={[styles.dot, w === week && styles.dotNow]} />
            </View>
            <Text accessibilityRole="header" style={styles.weekLabel}>
              {w === week ? `Week ${w} · nu` : `Week ${w}`}
            </Text>
            <Text style={styles.weekMeta}>{weekSpan(birthDate, w)}</Text>
          </View>
          <View style={styles.weekBody}>
            {list.length ? (
              list.map((m) => <Card key={m.key} moment={m} photoHeight={photoHeight} onOpen={(photo) => openPhoto(w, m.key, photo)} />)
            ) : (
              <EmptyWeek />
            )}
          </View>
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
        <Icon name="plus" size={18} weight={3.2} color={color.onBluebird} />
      </View>
      <Text style={styles.emptyText}>Deze week is nog leeg!</Text>
    </Pressable>
  );
}

function Card({ moment: m, photoHeight, onOpen }: { moment: TrailMoment; photoHeight: number; onOpen: (photo: number) => void }) {
  const first = m.isFirst && m.firstLabel ? { label: m.firstLabel, ...firstLook(m.firstLabel) } : undefined;
  return (
    <MomentCard
      photos={m.photos.slice(0, 3).map((p, i) => (
        <Photo key={i} source={p.view} />
      ))}
      photoCount={m.photos.length}
      photoHeight={photoHeight}
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
  // Invited as a parent after starting an own (still empty) trail: that invite comes first.
  const [invite, setInvite] = useState<{ inviter: string | null; child: string } | null>(null);
  useEffect(() => {
    myPartnerInvite().then(setInvite, () => undefined);
  }, []);
  return (
    <View style={styles.center}>
      {invite ? (
        <Callout title={`${invite.inviter ?? 'De andere ouder'} nodigde je uit`} tone="lilac">
          {`Doe mee met ${possessive(invite.child)} pad. Je eigen lege pad verdwijnt dan.`}
        </Callout>
      ) : null}
      {invite ? (
        <Button block onPress={() => router.push('/ouder-uitnodiging')}>
          Bekijk de uitnodiging
        </Button>
      ) : null}
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

/** The path's column on the left of the timeline. */
const RAIL = 32;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingTop: 4, paddingBottom: 28, gap: 12 },
  gutter: { paddingHorizontal: space.space4, gap: space.space3 },
  timeline: { gap: space.space5, paddingBottom: 4 },
  // The path: a 0-wide box with a dotted border all round (one-sided dotted borders draw
  // unreliably on phones), from the first stop down.
  rail: { position: 'absolute', left: RAIL / 2 - 1, top: 28, bottom: 0, width: 0, borderWidth: 1, borderStyle: 'dotted', borderColor: color.ink, opacity: 0.5 },
  week: { gap: space.space3 },
  weekHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingTop: 6 },
  marker: { width: RAIL, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  // Bo stands on this week's stop.
  bo: { position: 'absolute', bottom: 28 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.white },
  dotNow: { backgroundColor: color.ink },
  weekLabel: { ...text('eyebrow'), fontSize: 12, textTransform: 'uppercase' },
  weekMeta: { ...text('meta'), fontSize: 13, color: color.inkMuted },
  weekBody: { marginLeft: RAIL, gap: space.space4 },
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
