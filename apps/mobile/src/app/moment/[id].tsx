import { longDutchDate, todayInAmsterdam } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, Button, Character, color, FirstBadge, fontFamily, Icon, IconButton, size, text } from '@teddysteps/ui';
import { Photo } from '@/components/Photo';
import { Tabs } from '@/components/Tabs';
import { useTrailMoments } from '@/lib/trail';

const GUTTER = 22;

// T2 Moment. Hugs and voice notes come with family (steps 4 and 6), the options menu (T8) in
// step 9. No "Gezien door …" line (decided 17 October 2026). "Toegevoegd door" needs the
// parent's first name, which isn't asked yet.
export default function Moment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { moments, source } = useTrailMoments();
  const [page, setPage] = useState(0);
  const m = moments.find((x) => x.momentId === id);
  const photoWidth = width - GUTTER * 2;

  // The day of the photo, or else the Dutch day it was pinned.
  const day = m ? longDutchDate(m.happenedOn ?? todayInAmsterdam(new Date(m.createdAt))) : '';
  // A short caption can be the heading; a long one reads better as text under a plain heading.
  const longCaption = !!m?.caption && m.caption.length > 60;
  const title = m ? (m.isFirst ? m.firstLabel : longCaption ? null : m.caption) ?? `Een moment uit week ${m.trailWeek}` : '';
  const story = m?.caption && (m.isFirst || longCaption) ? m.caption : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton icon="back" label="Terug" onPress={router.back} />
        <Text style={styles.week}>{m ? `Week ${m.trailWeek}` : ''}</Text>
        <View style={{ width: size.tapMin }} />
      </View>
      {m ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.tilt}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / photoWidth))}
              style={[styles.pager, { width: photoWidth }]}
            >
              {m.photos.map((photo, i) => (
                <View
                  key={i}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={`Foto ${i + 1} van ${m.photos.length}${m.caption ? `: ${m.caption}` : ''}`}
                  style={{ width: photoWidth, height: 290 }}
                >
                  <Photo source={photo.view} />
                </View>
              ))}
            </ScrollView>
            {m.isFirst ? <FirstBadge size="lg" label="Eerste keer!" /> : null}
          </View>
          {m.photos.length > 1 ? (
            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {m.photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
              ))}
            </View>
          ) : null}
          <View>
            <Text accessibilityRole="header" style={text('titleL')}>
              {title}
            </Text>
            <Text style={[text('meta'), styles.meta]}>{day}</Text>
          </View>
          {story ? <Text style={styles.story}>{story}</Text> : null}
          {m.hugs ? (
            <View style={styles.hugs}>
              <Icon name="heart" size={18} weight={2.4} />
              <Text style={styles.hugsText}>{m.hugs === 1 ? '1 knuffel' : `${m.hugs} knuffels`}</Text>
            </View>
          ) : null}
          <View style={styles.bizzy}>
            <Character name="bizzy" size={70} rotate={10} decorative />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Character name="bo" size={110} decorative motion={source === 'loading' ? undefined : null} />
          {source === 'loading' ? (
            <Text style={text('titleM')}>Even zoeken…</Text>
          ) : (
            <>
              <Text accessibilityRole="header" style={[text('titleM'), { textAlign: 'center' }]}>
                {source === 'server' ? 'Dit moment is er niet meer' : 'Dit moment is nu even niet te zien'}
              </Text>
              {source !== 'server' ? <Text style={[styles.story, { textAlign: 'center' }]}>Het verschijnt zodra je weer verbinding hebt.</Text> : null}
              <Button block onPress={() => router.replace('/pad')}>
                Terug naar het pad
              </Button>
            </>
          )}
        </View>
      )}
      <Tabs active="trail" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingHorizontal: 10 },
  week: { fontFamily: fontFamily('sans', 800), fontSize: 16, color: color.ink },
  content: { flexGrow: 1, paddingTop: 4, paddingHorizontal: GUTTER, paddingBottom: 24, gap: 14 },
  tilt: { transform: [{ rotate: '-1.5deg' }] },
  pager: { height: 290, borderRadius: 24, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.butter },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.line },
  dotOn: { backgroundColor: color.ink },
  meta: { color: color.inkMuted, fontSize: 14, marginTop: 4 },
  story: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
  bizzy: { alignSelf: 'flex-end', marginRight: -8 },
  hugs: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.rose,
  },
  hugsText: { fontFamily: fontFamily('sans', 800), fontSize: 14, color: color.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: GUTTER },
});
