import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Button, IconButton } from './actions';
import { useAnnounce, webAria } from './a11y';
import { Character, Icon } from './brand';
import { FirstLabel, type FirstMark } from './content';
import { useFocusRing } from './focus';
import { useReducedMotion } from './motion';
import { Scallop } from './navigation';
import { fontFamily, text } from './text';
import { border, color, radius, shadow, space } from './tokens';

// T2b, the big view (owner, 25 October 2026), for the parents' app and the family page alike:
// every photo of the trail in one row, oldest first. Swipe, tap the left or right edge of the
// photo, or use the buttons below; at the end of a week it runs straight on to the next week with
// photos, so empty weeks never stop you. The strip on top scrolls through all weeks and follows.

export interface ViewerPhoto {
  key: string;
  week: number;
  /** Its place in the week, and how many photos the week has. */
  index: number;
  count: number;
  /** The photo itself, filling its box (the app passes an expo-image, the family page an <img>). */
  photo: ReactNode;
  caption: string | null;
  first?: FirstMark;
  date: string;
  hugs?: number;
  /** On the photo, bottom right: the moment's options (T8). */
  overlay?: ReactNode;
  /** Under the words: a hug button on the family page. */
  below?: ReactNode;
}

export interface PhotoViewerProps {
  /** Oldest first. */
  photos: ViewerPhoto[];
  /** Where to open: a photo, or else the first photo from this week on. */
  start: { key?: string; week: number };
  /** This week: the strip runs from week 1 (or `from`) to here. */
  now: number;
  /** The first week in the strip, when the weeks before it aren't loaded (family page). */
  from?: number;
  /** "3 – 9 mrt": the days of a week. */
  span: (week: number) => string;
  /** When this week has no photos yet: a last page, e.g. to add a moment. */
  addPage?: ReactNode;
  /** A tap on this week while it has no page (yet). */
  onEmptyNow?: () => void;
  onClose: () => void;
  closeLabel: string;
  /** Above the photos, e.g. "Je bent offline". */
  banner?: ReactNode;
  /** While there are no photos: "Even laden…" (or nothing, when a banner explains). */
  waiting?: string;
  topInset?: number;
  bottomInset?: number;
}

type Page = ViewerPhoto | { key: 'add'; week: number };

const STOP = 44;
const GAP_STOP = 14;

export function PhotoViewer({ photos, start, now, from = 1, span, addPage, onEmptyNow, onClose, closeLabel, banner, waiting, topInset = 0, bottomInset = 0 }: PhotoViewerProps) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [pos, setPos] = useState(start);
  const [height, setHeight] = useState(0);
  const list = useRef<FlatList<Page>>(null);
  const strip = useRef<ComponentRef<typeof ScrollView>>(null);
  // The page the list was last sent to (or swiped to), so only a shift in the data moves it.
  const shown = useRef(-1);

  const full = new Set(photos.map((p) => p.week));
  const pages: Page[] = addPage && !full.has(now) ? [...photos, { key: 'add', week: now }] : photos;
  const exact = pos.key ? pages.findIndex((p) => p.key === pos.key) : -1;
  const later = pages.findIndex((p) => p.week >= pos.week);
  const at = exact >= 0 ? exact : later >= 0 ? later : pages.length - 1;
  const page = pages[at];
  const week = page?.week ?? pos.week;

  // New data (the server after the cache, older postcards) can shift the pages: keep the same photo.
  useEffect(() => {
    if (at < 0 || at === shown.current) return;
    if (shown.current >= 0) list.current?.scrollToIndex({ index: at, animated: false });
    shown.current = at;
  }, [at]);

  // The strip follows the week, with the week in the middle where it can be.
  const offsets: number[] = [];
  let x = space.space3;
  for (let w = from; w <= now; w++) {
    offsets[w] = x;
    x += full.has(w) || (w === now && (addPage || onEmptyNow)) ? STOP : GAP_STOP;
  }
  const middle = (offsets[week] ?? 0) + STOP / 2 - width / 2;
  // Straight there when the view opens, gliding after that.
  const centred = useRef(false);
  useEffect(() => {
    strip.current?.scrollTo({ x: Math.max(0, middle), animated: centred.current && !reduced });
    centred.current = true;
  }, [middle, reduced]);

  const show = (i: number) => {
    const p = pages[i];
    if (!p) return;
    // One step glides; a jump from the strip goes straight there, not past every photo between.
    const glide = Math.abs(i - shown.current) === 1 && !reduced;
    shown.current = i;
    setPos({ week: p.week, key: p.key });
    list.current?.scrollToIndex({ index: i, animated: glide });
  };
  // Settled on a page (also on the web, which has no momentum events): that's where we are.
  const scrolled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const i = Math.round(offset / width);
    if (Math.abs(offset - i * width) > 2 || i === shown.current || !pages[i]) return;
    shown.current = i;
    setPos({ week: pages[i].week, key: pages[i].key });
  };

  // Arrow keys and Escape on a laptop.
  const stepRef = useRef({ back: () => {}, on: () => {}, close: () => {} });
  useEffect(() => {
    stepRef.current = { back: () => show(at - 1), on: () => show(at + 1), close: onClose };
  });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stepRef.current.back();
      if (e.key === 'ArrowRight') stepRef.current.on();
      if (e.key === 'Escape') stepRef.current.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useAnnounce(
    page && 'photo' in page
      ? `Week ${page.week}, foto ${page.index + 1} van ${page.count}${page.caption ? `: ${page.caption}` : ''}`
      : page
        ? `Week ${page.week}, nog leeg`
        : undefined,
  );

  const before = pages[at - 1];
  const after = pages[at + 1];

  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: topInset + 8 }]}>
        <View style={styles.bar}>
          <IconButton icon="back" label={closeLabel} tone="white" onPress={onClose} />
          <View style={styles.heading}>
            <Text role="heading" accessibilityRole="header" {...webAria({ 'aria-level': 1 })} style={styles.title}>
              Week {week}
            </Text>
            <Text style={styles.meta}>
              {page && 'photo' in page && page.count > 1 ? `${span(week)} · foto ${page.index + 1} van ${page.count}` : span(week)}
            </Text>
          </View>
          <View style={styles.side} />
        </View>
        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.strip, { width: x + space.space3 }]}
          role="group"
          aria-label="Kies een week"
        >
          <View style={[styles.rail, { left: space.space3, width: x - space.space3 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          {Array.from({ length: Math.max(0, now - from + 1) }, (_, i) => from + i).map((w) =>
            full.has(w) || (w === now && (addPage || onEmptyNow)) ? (
              <Stop
                key={w}
                week={w}
                now={w === now}
                on={w === week}
                empty={!full.has(w)}
                onPress={() => {
                  const i = pages.findIndex((p) => p.week === w);
                  if (i >= 0) show(i);
                  else onEmptyNow?.();
                }}
              />
            ) : (
              <View key={w} style={styles.gap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            ),
          )}
        </ScrollView>
      </View>
      <Scallop color="cornflower" />
      {banner ? <View style={styles.banner}>{banner}</View> : null}

      {!pages.length ? (
        <View style={styles.waiting}>{waiting ? <Text style={styles.emptyText}>{waiting}</Text> : null}</View>
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
          onScroll={scrolled}
          scrollEventThrottle={32}
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
            >
              {'photo' in item ? (
                <PhotoPage item={item} onBack={before ? () => show(at - 1) : undefined} onOn={after ? () => show(at + 1) : undefined} />
              ) : (
                <View style={styles.add}>{addPage}</View>
              )}
            </View>
          )}
        />
      )}

      {pages.length ? (
        <View style={[styles.footer, { paddingBottom: Math.max(14, bottomInset) }]}>
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

/** A photo with its moment: the week's progress on top, tap the edges to go on, the words below. */
function PhotoPage({ item, onBack, onOn }: { item: ViewerPhoto; onBack?: () => void; onOn?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.photo}>
        {item.photo}
        {item.count > 1 ? (
          <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: item.count }, (_, i) => (
              <View key={i} style={[styles.segment, i <= item.index && styles.segmentOn]} />
            ))}
          </View>
        ) : null}
        {/* The edges of the photo, like turning a page; the buttons below do the same for everyone. */}
        {onBack ? <Edge side="left" onPress={onBack} /> : null}
        {onOn ? <Edge side="right" onPress={onOn} /> : null}
        {item.first ? (
          <View style={styles.first}>
            <FirstLabel {...item.first} />
          </View>
        ) : null}
        {item.overlay || item.hugs ? (
          <View style={styles.overlay}>
            {item.hugs ? (
              <View style={styles.hugs} accessible accessibilityLabel={item.hugs === 1 ? '1 knuffel' : `${item.hugs} knuffels`}>
                <Icon name="heart" size={20} weight={2.6} color={color.tomato} />
                <Text style={styles.hugsText}>{item.hugs}</Text>
              </View>
            ) : null}
            {item.overlay}
          </View>
        ) : null}
      </View>
      <View style={styles.words}>
        {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
        <Text style={styles.when}>{item.date}</Text>
        {item.below}
      </View>
    </View>
  );
}

function Edge({ side, onPress }: { side: 'left' | 'right'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      focusable={false}
      tabIndex={-1}
      aria-hidden
      style={[styles.edge, side === 'left' ? { left: 0 } : { right: 0 }]}
    />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  band: { backgroundColor: color.cornflower },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.space4 },
  side: { width: 44 },
  heading: { flex: 1, alignItems: 'center' },
  title: { ...text('titleM'), fontSize: 22, lineHeight: 26 },
  meta: { fontFamily: fontFamily('sans', 800), fontSize: 13, lineHeight: 18, color: color.ink },
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
  banner: { paddingHorizontal: 12, paddingBottom: 8 },
  pager: { flex: 1 },
  page: { paddingHorizontal: 12, paddingTop: 2 },
  card: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
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
  edge: { position: 'absolute', top: 28, bottom: 64, width: '28%' },
  first: { position: 'absolute', left: 12, bottom: 14 },
  overlay: {
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
  add: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...text('body'), fontSize: 15, color: color.inkMuted, textAlign: 'center', maxWidth: 260 },
  footer: { width: '100%', maxWidth: 924, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingHorizontal: 12 },
});
