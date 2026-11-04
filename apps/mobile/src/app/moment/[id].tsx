import { firstLook, longDutchDate, todayInAmsterdam, weekName, whenWritten } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, Button, Character, color, CommentComposer, Comments, FirstLabel, fontFamily, IconButton, ReactionCounts, size, space, text, useAnnounce } from '@teddysteps/ui';
import { Photo } from '@/components/Photo';
import { Tabs } from '@/components/Tabs';
import { TextLink } from '@/components/TextLink';
import { useMomentComments } from '@/lib/comments';
import { useTrailMoments } from '@/lib/trail';

const GUTTER = 22;

// T2 Moment, with the options (T8) behind "⋯", and the written reacties under it (the whole
// circle reads them; parents may delete any). Voice notes come with step 6. No "Gezien door …"
// line (decided 17 October 2026). "Toegevoegd door" needs the parent's first name, which isn't
// asked yet.
export default function Moment() {
  const { id, schrijf } = useLocalSearchParams<{ id: string; schrijf?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { moments, source } = useTrailMoments();
  const [page, setPage] = useState(0);
  const m = moments.find((x) => x.momentId === id);
  const reacties = useMomentComments(m?.momentId);
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderFailed, setOlderFailed] = useState(false);
  const loadProblem = reacties.failed ? 'De reacties kwamen even niet door.' : olderFailed ? 'Eerdere reacties ophalen lukte even niet. Probeer het zo nog eens.' : undefined;
  useAnnounce(loadProblem);
  const photoWidth = width - GUTTER * 2;

  // The day of the photo, or else the Dutch day it was pinned.
  const day = m ? longDutchDate(m.happenedOn ?? todayInAmsterdam(new Date(m.createdAt))) : '';
  // The parent's line is the heading (Pad 2.0); a long one reads better as text under a plain
  // heading. A first shows as a label above it.
  const longCaption = !!m?.caption && m.caption.length > 60;
  const title = m ? ((longCaption ? null : m.caption) ?? (m.isFirst ? m.firstLabel : null) ?? (m.trailWeek <= 52 ? `Een moment uit week ${m.trailWeek}` : `Een moment op ${weekName(m.trailWeek)}`)) : '';
  const story = longCaption ? m!.caption : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton icon="back" label="Terug" onPress={router.back} />
        <Text style={styles.week}>{m ? weekName(m.trailWeek) : ''}</Text>
        {m?.momentId ? (
          <IconButton icon="more" label="Opties voor dit moment" onPress={() => router.push(`/opties/${m.momentId}`)} />
        ) : (
          <View style={{ width: size.tapMin }} />
        )}
      </View>
      {m ? (
        // Taps on "Plaatsen" count while the keyboard is up.
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
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
          </View>
          {m.photos.length > 1 ? (
            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {m.photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
              ))}
            </View>
          ) : null}
          <View style={styles.heading}>
            {m.isFirst && m.firstLabel && title !== m.firstLabel ? <FirstLabel label={m.firstLabel} {...firstLook(m.firstLabel)} /> : null}
            <Text accessibilityRole="header" style={text('titleL')}>
              {title}
            </Text>
            <Text style={[text('meta'), styles.meta]}>{day}</Text>
          </View>
          {story ? <Text style={styles.story}>{story}</Text> : null}
          <ReactionCounts counts={m.reactions} />
          <View style={styles.rule} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <View style={styles.reacties}>
            <Text accessibilityRole="header" style={text('titleM')}>
              Reacties
            </Text>
            {reacties.more ? (
              <TextLink
                role="button"
                disabled={olderBusy}
                onPress={async () => {
                  setOlderBusy(true);
                  setOlderFailed(false);
                  await reacties.older().catch(() => setOlderFailed(true));
                  setOlderBusy(false);
                }}
              >
                {olderBusy ? 'Reacties ophalen…' : 'Eerdere reacties'}
              </TextLink>
            ) : null}
            {loadProblem ? (
              <Text role="alert" accessibilityLiveRegion="polite" style={styles.error}>
                {loadProblem}
              </Text>
            ) : null}
            {reacties.failed ? (
              <TextLink role="button" onPress={reacties.retry}>
                Opnieuw proberen
              </TextLink>
            ) : null}
            {reacties.comments && !reacties.comments.length ? <Text style={styles.quiet}>Nog geen reacties. De hele kring leest mee.</Text> : null}
            <Comments
              comments={reacties.comments ?? []}
              total={reacties.comments?.length ?? 0}
              when={(at) => whenWritten(at)}
              onDelete={reacties.remove}
              composer={m.momentId ? <CommentComposer onSend={reacties.add} newId={reacties.newId} autoFocus={schrijf === '1'} about={title} /> : null}
            />
          </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8 },
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
  // A dashed rule: iOS only draws dashes on a border that goes all the way round.
  rule: { height: 0, borderWidth: 1, borderColor: color.line, borderStyle: 'dashed', marginTop: space.space2 },
  reacties: { gap: space.space3 },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 21, color: color.plum },
  quiet: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 21, color: color.inkMuted },
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
    backgroundColor: color.lilac,
  },
  hugsText: { fontFamily: fontFamily('sans', 800), fontSize: 14, color: color.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: GUTTER },
});
