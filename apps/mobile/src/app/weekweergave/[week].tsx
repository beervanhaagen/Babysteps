import { firstLook, todayInAmsterdam, trailWeek, weekSpan } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, border, Button, Character, color, FirstLabel, fontFamily, Icon, IconButton, radius, Scallop, shadow, space, text, useAnnounce, useFocusRing } from '@teddysteps/ui';
import { Photo } from '@/components/Photo';
import { useAuth } from '@/lib/auth';
import { byWeek, dayOf, useTrailMoments, type TrailMoment } from '@/lib/trail';

// T2b Weekweergave (board "T2b · Weekweergave", Pad 3.0): one week full screen, photo by photo
// like a story. Tap right for the next photo, left for the previous one; past the end it goes
// on to the next week. The weeks around it sit as stops in the header.
export default function WeekView() {
  const params = useLocalSearchParams<{ week: string; foto?: string }>();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const { moments, source } = useTrailMoments();
  const [week, setWeek] = useState(Number(params.week) || 1);
  const [photo, setPhoto] = useState(Number(params.foto) || 0);
  const birth = state.status === 'ready' ? state.trail.birthDate : null;
  const now = birth ? Math.min(trailWeek(birth, todayInAmsterdam()), 104) : 1;
  const weeks = new Map(byWeek(moments.filter((m) => !m.queued || m.queued.stage === 'visible')));
  // Every photo of a week, in the order of the trail, with the moment it belongs to.
  const photosOf = (w: number) => (weeks.get(w) ?? []).flatMap((m) => m.photos.map((p, i) => ({ moment: m, photo: p, index: i })));
  const photos = photosOf(week);
  const at = Math.min(photo, Math.max(0, photos.length - 1));
  const current = photos[at];
  // Only the server says a week is really empty; before that, or offline, we don't know yet.
  const known = source === 'server' || photos.length > 0;
  useAnnounce(
    current
      ? `Week ${week}, foto ${at + 1} van ${photos.length}${current.moment.caption ? `: ${current.moment.caption}` : ''}`
      : known
        ? `Week ${week}, nog leeg`
        : undefined,
  );
  if (!birth) return null;

  const go = (w: number, p: number) => {
    setWeek(w);
    setPhoto(p);
  };
  const next = () => (at < photos.length - 1 ? go(week, at + 1) : week < now ? go(week + 1, 0) : undefined);
  const previous = () => (at > 0 ? go(week, at - 1) : week > 1 ? go(week - 1, Math.max(0, photosOf(week - 1).length - 1)) : undefined);
  // Six stops around this week, ending at the current week at the latest.
  const last = Math.min(now, Math.max(week + 1, 6));
  const stops = Array.from({ length: Math.min(6, last) }, (_, i) => last - Math.min(6, last) + 1 + i);
  const count = photos.length;

  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + 8 }]}>
        <View style={styles.bar}>
          <IconButton icon="back" label="Terug naar het pad" tone="white" onPress={router.back} />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Week {week}
            </Text>
            <Text style={styles.meta}>{count ? `${weekSpan(birth, week)} · ${count === 1 ? '1 foto' : `${count} foto’s`}` : weekSpan(birth, week)}</Text>
          </View>
          <IconButton icon="timeline" label="Alle weken als tijdlijn" tone="white" onPress={() => router.dismissTo('/pad')} />
        </View>
        <View role="group" aria-label="Kies een week" style={styles.stops}>
          <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          {stops.map((w) => (
            <Stop key={w} week={w} now={w === now} on={w === week} empty={!weeks.has(w)} onPress={() => go(w, 0)} />
          ))}
        </View>
      </View>
      <Scallop color="cornflower" />
      {source === 'failed' || (source === 'cached' && !current) ? (
        <View style={styles.offline}>
          <Banner tone="sunshine" character="bizzy" title="Je bent offline">
            Deze week verschijnt zodra je weer verbinding hebt.
          </Banner>
        </View>
      ) : null}

      {!current && !known ? (
        <View style={styles.waiting}>
          <Text style={styles.emptyText}>Even laden…</Text>
        </View>
      ) : current ? (
        <View style={styles.card}>
          <View style={styles.photo}>
            <Photo source={current.photo.view} />
            <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {photos.map((_, i) => (
                <View key={i} style={[styles.segment, i < at && styles.segmentSeen, i === at && styles.segmentOn]} />
              ))}
            </View>
            <TapZone label="Vorige foto" side="left" onPress={previous} />
            <TapZone label="Volgende foto" side="right" onPress={next} />
            {current.moment.isFirst && current.moment.firstLabel ? (
              <View style={styles.first}>
                <FirstLabel label={current.moment.firstLabel} {...firstLook(current.moment.firstLabel)} />
              </View>
            ) : null}
            <Actions moment={current.moment} />
          </View>
          <View style={styles.words}>
            {current.moment.caption ? <Text style={styles.caption}>{current.moment.caption}</Text> : null}
            <Text style={styles.when}>{`${dayOf(current.moment)} · foto ${at + 1} van ${count}`}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Deze week is nog leeg!</Text>
          <Text style={styles.emptyText}>Een foto en één zin is genoeg.</Text>
          <Button onPress={() => router.push('/toevoegen')}>Moment toevoegen</Button>
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(18, insets.bottom) }]}>
        {week > 1 ? <WeekStep label={`Week ${week - 1}`} back onPress={() => go(week - 1, 0)} /> : <View />}
        {week < now ? <WeekStep label={`Week ${week + 1}`} onPress={() => go(week + 1, 0)} /> : <View />}
      </View>
    </View>
  );
}

/** A week in the header: this one a sunshine sticker with Bo, the others a dot (dashed when empty). */
function Stop({ week, now, on, empty, onPress }: { week: number; now: boolean; on: boolean; empty: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Week ${week}${now ? ', deze week' : ''}${empty ? ', nog leeg' : ''}`}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.stop, focus.ring]}
    >
      {on ? (
        <View style={styles.stopOn}>
          <Character name="bo" size={34} decorative />
        </View>
      ) : (
        <View style={[styles.stopDot, empty && styles.stopEmpty]} />
      )}
      <Text style={[styles.stopLabel, on && { fontFamily: fontFamily('sans', 800) }]}>{now ? 'nu' : String(week)}</Text>
    </Pressable>
  );
}

/** Invisible halves of the photo: left goes back, right goes on (like a story). */
function TapZone({ label, side, onPress }: { label: string; side: 'left' | 'right'; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.tap, side === 'left' ? styles.tapLeft : styles.tapRight, focus.ring]}
    />
  );
}

/** On the photo: the hugs it got (when it got any) and the moment's options (T8). */
function Actions({ moment: m }: { moment: TrailMoment }) {
  if (!m.hugs && !m.momentId) return null;
  return (
    <View style={styles.actions}>
      {m.hugs ? (
        <View style={styles.hugs} accessible accessibilityLabel={m.hugs === 1 ? '1 knuffel' : `${m.hugs} knuffels`}>
          <Icon name="heart" size={20} weight={2.6} color={color.tomato} />
          <Text style={styles.hugsText}>{m.hugs}</Text>
        </View>
      ) : null}
      {m.momentId ? <IconButton icon="more" label="Opties voor dit moment" onPress={() => router.push(`/opties/${m.momentId}`)} /> : null}
    </View>
  );
}

function WeekStep({ label, back, onPress }: { label: string; back?: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur} style={[styles.step, focus.ring]}>
      {back ? <Icon name="back" size={18} weight={2.6} /> : null}
      <Text style={styles.stepText}>{label}</Text>
      {back ? null : <Icon name="chevron-right" size={18} weight={2.6} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  band: { backgroundColor: color.cornflower, paddingHorizontal: space.space4 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { flex: 1, alignItems: 'center' },
  title: { ...text('titleM'), fontSize: 22, lineHeight: 26 },
  meta: { fontFamily: fontFamily('sans', 800), fontSize: 13, lineHeight: 18, color: color.ink },
  stops: { height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 6 },
  // A 0-high box with a dotted border all round: one-sided dotted borders draw unreliably on phones.
  rail: { position: 'absolute', left: 24, right: 24, top: 41, height: 0, borderWidth: 1.25, borderStyle: 'dotted', borderColor: color.ink },
  stop: { width: 52, height: 70, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  stopOn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.sunshine,
    boxShadow: shadow.shadowSm,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  stopDot: { width: 24, height: 24, borderRadius: 12, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.white, marginBottom: 10 },
  stopEmpty: { backgroundColor: color.cornflower, borderStyle: 'dashed' },
  stopLabel: { fontFamily: fontFamily('sans', 700), fontSize: 12, lineHeight: 16, color: color.ink },
  card: {
    flex: 1,
    marginTop: 2,
    marginHorizontal: 12,
    borderWidth: border.edge,
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    boxShadow: shadow.shadowSm,
    overflow: 'hidden',
    backgroundColor: color.white,
  },
  photo: { flex: 1, backgroundColor: color.ink },
  segments: { position: 'absolute', left: 14, right: 14, top: 12, flexDirection: 'row', gap: 4 },
  // A thin ink ring keeps the bars visible on light photos.
  segment: { flex: 1, height: 4, borderRadius: 2, borderWidth: 0.5, borderColor: `${color.ink}59`, backgroundColor: `${color.white}80` },
  segmentSeen: { backgroundColor: color.white },
  segmentOn: { backgroundColor: color.sunshine },
  tap: { position: 'absolute', top: 24, bottom: 70 },
  tapLeft: { left: 0, width: '35%' },
  tapRight: { right: 0, width: '65%' },
  first: { position: 'absolute', left: 12, bottom: 14 },
  actions: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRadius: radius.radiusPill,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
    boxShadow: shadow.shadowSm,
  },
  hugs: { minWidth: 44, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6 },
  hugsText: { fontFamily: fontFamily('sans', 800), fontSize: 13, color: color.ink },
  words: { paddingVertical: 14, paddingHorizontal: 18, gap: 6, borderTopWidth: border.edge, borderTopColor: color.ink },
  caption: { fontFamily: fontFamily('display', 700), fontSize: 21, lineHeight: 26, color: color.ink },
  when: { ...text('meta'), fontSize: 13, color: color.inkMuted },
  empty: {
    flex: 1,
    marginTop: 2,
    marginHorizontal: 12,
    borderWidth: border.edgeBold,
    borderStyle: 'dashed',
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  offline: { paddingHorizontal: 12, paddingBottom: 8 },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...text('titleM'), fontSize: 24, lineHeight: 28, textAlign: 'center' },
  emptyText: { ...text('body'), fontSize: 15, color: color.inkMuted, textAlign: 'center', maxWidth: 260 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingHorizontal: 12 },
  step: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  stepText: { fontFamily: fontFamily('sans', 800), fontSize: 14, color: color.ink },
});
