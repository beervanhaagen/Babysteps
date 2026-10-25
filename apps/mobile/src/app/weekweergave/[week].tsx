import { firstLook, todayInAmsterdam, trailWeek, weekSpan } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, border, Button, Character, color, FirstLabel, fontFamily, Icon, IconButton, radius, Scallop, shadow, space, text, useAnnounce, useFocusRing, useReducedMotion } from '@teddysteps/ui';
import { Photo } from '@/components/Photo';
import { useAuth } from '@/lib/auth';
import { byWeek, dayOf, useTrailMoments, type PhotoSource, type TrailMoment } from '@/lib/trail';

// T2b Weekweergave (board "T2b · Weekweergave", Pad 3.0): every photo of the trail in a row,
// full screen. Swipe (or tap the arrows) photo by photo; at the end of a week it runs straight on
// to the next week with photos, so empty weeks never stop you. The week strip at the top scrolls
// through all weeks and follows along; tap a week to jump there.

/** One page: a photo of a moment, or, when this week is still empty, a slot to add one. */
type Page = { key: string; week: number; index: number; count: number; moment: TrailMoment; photo: PhotoSource } | { key: string; week: number; add: true };

const STOP = 44;
const GAP_STOP = 14;

export default function WeekView() {
  const params = useLocalSearchParams<{ week: string; moment?: string; foto?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const { state } = useAuth();
  const { moments, source } = useTrailMoments();
  // Where we are: a page (moment and photo), or else a week.
  const [pos, setPos] = useState<{ week: number; key?: string }>({
    week: Number(params.week) || 1,
    key: params.moment ? `${params.moment}-${Number(params.foto) || 0}` : undefined,
  });
  const [height, setHeight] = useState(0);
  const list = useRef<FlatList<Page>>(null);
  // The page the list was last sent to (or swiped to), so only a shift in the data moves it.
  const shown = useRef(-1);
  const strip = useRef<ScrollViewInstance>(null);
  const birth = state.status === 'ready' ? state.trail.birthDate : null;
  const now = birth ? Math.min(trailWeek(birth, todayInAmsterdam()), 104) : 1;

  // Oldest first, weeks and moments in them, so swiping on goes forward in time, like the strip.
  const weeks = byWeek(moments.filter((m) => !m.queued || m.queued.stage === 'visible')).reverse();
  const pages: Page[] = weeks.flatMap(([week, ms]) => {
    const photos = [...ms].reverse().flatMap((m) => m.photos.map((p, i) => ({ key: `${m.key}-${i}`, moment: m, photo: p.view })));
    return photos.map((p, index) => ({ ...p, week, index, count: photos.length }));
  });
  const full = new Set(weeks.map(([w]) => w));
  // Only the server says this week is really empty; before that, or offline, we don't know yet.
  if (source === 'server' && !full.has(now)) pages.push({ key: 'add', week: now, add: true });

  const exact = pos.key ? pages.findIndex((p) => p.key === pos.key) : -1;
  const later = pages.findIndex((p) => p.week >= pos.week);
  const at = exact >= 0 ? exact : later >= 0 ? later : pages.length - 1;
  const page = pages[at];
  const week = page?.week ?? pos.week;

  // New data (the server after the cache) can shift the pages: keep the same photo in view.
  useEffect(() => {
    if (at < 0 || at === shown.current) return;
    if (shown.current >= 0) list.current?.scrollToIndex({ index: at, animated: false });
    shown.current = at;
  }, [at]);

  // The strip follows the week, with the week in the middle where it can be.
  const offsets: number[] = [];
  let x = space.space3;
  for (let w = 1; w <= now; w++) {
    offsets[w] = x;
    x += full.has(w) || w === now ? STOP : GAP_STOP;
  }
  const middle = (offsets[week] ?? 0) + STOP / 2 - width / 2;
  // Straight there when the screen opens, gliding after that.
  const centred = useRef(false);
  useEffect(() => {
    strip.current?.scrollTo({ x: Math.max(0, middle), animated: centred.current && !reduced });
    centred.current = true;
  }, [middle, reduced]);

  useAnnounce(
    page && 'moment' in page
      ? `Week ${page.week}, foto ${page.index + 1} van ${page.count}${page.moment.caption ? `: ${page.moment.caption}` : ''}`
      : page
        ? `Week ${page.week}, nog leeg`
        : undefined,
  );
  if (!birth) return null;

  const show = (i: number) => {
    const p = pages[i];
    if (!p) return;
    // One step glides; a jump from the strip goes straight there, not past every photo between.
    const glide = Math.abs(i - shown.current) === 1 && !reduced;
    shown.current = i;
    setPos({ week: p.week, key: p.key });
    list.current?.scrollToIndex({ index: i, animated: glide });
  };
  const settled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    const p = pages[i];
    shown.current = i;
    if (p) setPos({ week: p.week, key: p.key });
  };
  const jump = (w: number) => show(pages.findIndex((p) => p.week === w));
  const before = pages[at - 1];
  const after = pages[at + 1];

  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + 8 }]}>
        <View style={styles.bar}>
          <IconButton icon="back" label="Terug naar het pad" tone="white" onPress={router.back} />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Week {week}
            </Text>
            <Text style={styles.meta}>
              {page && 'moment' in page ? `${weekSpan(birth, week)} · ${page.count === 1 ? '1 foto' : `foto ${page.index + 1} van ${page.count}`}` : weekSpan(birth, week)}
            </Text>
          </View>
          <View style={styles.side} />
        </View>
      </View>
      <View style={styles.stripBand}>
        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.strip, { width: x + space.space3 }]}
          role="group"
          aria-label="Kies een week"
        >
          <View style={[styles.rail, { left: space.space3, width: x - space.space3 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          {Array.from({ length: now }, (_, i) => i + 1).map((w) =>
            full.has(w) || w === now ? (
              <Stop
                key={w}
                week={w}
                now={w === now}
                on={w === week}
                empty={!full.has(w)}
                // An empty week has no page until the server has said so: then it opens A1 straight away.
                onPress={() => (pages.some((p) => p.week === w) ? jump(w) : router.push('/toevoegen'))}
              />
            ) : (
              <View key={w} style={styles.gap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            ),
          )}
        </ScrollView>
      </View>
      <Scallop color="cornflower" />
      {source === 'failed' || (source === 'cached' && !pages.length) ? (
        <View style={styles.offline}>
          <Banner tone="sunshine" character="bizzy" title="Je bent offline">
            Je foto’s verschijnen zodra je weer verbinding hebt.
          </Banner>
        </View>
      ) : null}

      {!pages.length ? (
        source === 'failed' ? null : (
          <View style={styles.waiting}>
            <Text style={styles.emptyText}>Even laden…</Text>
          </View>
        )
      ) : (
        <FlatList
          ref={list}
          data={pages}
          keyExtractor={(p) => p.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={at}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={settled}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          style={styles.pager}
          onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
          extraData={`${height}-${at}`}
          renderItem={({ item, index }) => (
            <View
              style={[styles.page, { width, height: height || undefined }]}
              // Only the page in view is there for a screen reader, not the ones rendered beside it.
              accessibilityElementsHidden={index !== at}
              importantForAccessibility={index === at ? 'auto' : 'no-hide-descendants'}
            >{'moment' in item ? <PhotoPage page={item} /> : <AddPage />}</View>
          )}
        />
      )}

      {pages.length ? (
        <View style={[styles.footer, { paddingBottom: Math.max(14, insets.bottom) }]}>
          {before ? (
            <Button variant="paper" size="md" icon="back" accessibilityLabel={before.week === week ? 'Vorige foto' : `Naar week ${before.week}`} onPress={() => show(at - 1)}>
              {before.week === week ? 'Vorige' : `Week ${before.week}`}
            </Button>
          ) : (
            <View />
          )}
          {after ? (
            <Button variant="paper" size="md" iconAfter="chevron-right" accessibilityLabel={after.week === week ? 'Volgende foto' : `Naar week ${after.week}`} onPress={() => show(at + 1)}>
              {after.week === week ? 'Volgende' : `Week ${after.week}`}
            </Button>
          ) : (
            <View />
          )}
        </View>
      ) : null}
    </View>
  );
}

/** A photo with its moment: the week's progress on top, the first and hugs on the photo, the words below. */
function PhotoPage({ page }: { page: Extract<Page, { moment: TrailMoment }> }) {
  const m = page.moment;
  return (
    <View style={styles.card}>
      <View style={styles.photo}>
        <Photo source={page.photo} />
        {page.count > 1 ? (
          <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: page.count }, (_, i) => (
              <View key={i} style={[styles.segment, i <= page.index && styles.segmentOn]} />
            ))}
          </View>
        ) : null}
        {m.isFirst && m.firstLabel ? (
          <View style={styles.first}>
            <FirstLabel label={m.firstLabel} {...firstLook(m.firstLabel)} />
          </View>
        ) : null}
        <Actions moment={m} />
      </View>
      <View style={styles.words}>
        {m.caption ? <Text style={styles.caption}>{m.caption}</Text> : null}
        <Text style={styles.when}>{dayOf(m)}</Text>
      </View>
    </View>
  );
}

/** This week is still empty: the last page invites one more moment. */
function AddPage() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Deze week is nog leeg!</Text>
      <Text style={styles.emptyText}>Een foto en één zin is genoeg.</Text>
      <Button icon="plus" onPress={() => router.push('/toevoegen')}>
        Moment toevoegen
      </Button>
    </View>
  );
}

/** A week in the strip: a dot on the trail, Bo standing on the one you're looking at. */
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
      <View style={styles.bo}>{on ? <Character name="bo" size={30} decorative /> : null}</View>
      <View style={[styles.dot, on && styles.dotOn, empty && !on && styles.dotEmpty]} />
      <Text style={[styles.stopLabel, on && styles.stopLabelOn]}>{now ? 'nu' : String(week)}</Text>
    </Pressable>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  band: { backgroundColor: color.cornflower, paddingHorizontal: space.space4 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { width: 44 },
  heading: { flex: 1, alignItems: 'center' },
  title: { ...text('titleM'), fontSize: 22, lineHeight: 26 },
  meta: { fontFamily: fontFamily('sans', 800), fontSize: 13, lineHeight: 18, color: color.ink },
  stripBand: { backgroundColor: color.cornflower },
  strip: { height: 68, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.space3 },
  // A 0-high box with a dotted border all round: one-sided dotted borders draw unreliably on phones.
  rail: { position: 'absolute', top: 43, height: 0, borderWidth: 1, borderStyle: 'dotted', borderColor: color.ink, opacity: 0.6 },
  gap: { width: GAP_STOP },
  stop: { width: STOP, height: 68, alignItems: 'center', justifyContent: 'flex-end' },
  bo: { height: 30, justifyContent: 'flex-end' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.white, marginTop: -1 },
  dotOn: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.ink },
  dotEmpty: { backgroundColor: color.cornflower, borderStyle: 'dashed' },
  stopLabel: { fontFamily: fontFamily('sans', 700), fontSize: 12, lineHeight: 18, color: color.ink },
  stopLabelOn: { fontFamily: fontFamily('sans', 900) },
  pager: { flex: 1 },
  page: { paddingHorizontal: 12, paddingTop: 2 },
  card: {
    flex: 1,
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
  segmentOn: { backgroundColor: color.white },
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
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingHorizontal: 12 },
});
