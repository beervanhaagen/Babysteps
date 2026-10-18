import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, Button, Character, color, fontFamily, IconButton, radius, shadow, text, useFocusRing, type CharacterName } from '@teddysteps/ui';
import { useAuth } from '@/lib/auth';
import { startMoment } from '@/lib/draft';

// A1 Wat is er gebeurd? A sheet over the trail. Photos only at launch (no video); the voice
// memo shows as "binnenkort". "Oudere weken" starts from the week of the photos (O6 comes in step 9).
export default function WhatHappened() {
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const born = state.status === 'ready' && !!state.trail.birthDate;

  return (
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Sluiten" style={styles.dim} onPress={() => router.back()} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: 28 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[text('titleL'), { fontSize: 26, lineHeight: 28 }]}>
            Wat is er gebeurd?
          </Text>
          <IconButton icon="close" label="Sluiten" onPress={() => router.back()} />
        </View>
        {born ? (
          <>
            <View style={styles.row}>
              <Tile tone="lilac" character="bizzy" label="Foto’s" sub="uit je fotorol" onPress={() => startMoment('photos', 'replace')} />
              <Tile tone="sunshine" character="tiggy" label="Een eerste keer!" sub="pin een mijlpaal" onPress={() => startMoment('first', 'replace')} />
            </View>
            <View style={styles.row}>
              <Tile tone="pistachio" character="puddle" label="Geluidsopname" sub="binnenkort" />
              <Tile tone="rose" character="bo" label="Oudere weken" sub="inhalen uit je foto’s" onPress={() => startMoment('older', 'replace')} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.body}>Het pad begint bij de geboorte. Is je kleintje er al?</Text>
            <Button block onPress={() => router.replace('/geboren')}>
              Mijn kleintje is geboren!
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

interface TileProps {
  tone: 'lilac' | 'sunshine' | 'pistachio' | 'rose';
  character: CharacterName;
  label: string;
  sub: string;
  /** Without it the tile is shown but can't be used yet ("binnenkort"). */
  onPress?: () => void;
}

function Tile({ tone, character, label, sub, onPress }: TileProps) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${sub}`}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: color[tone] },
        !onPress && styles.tileOff,
        pressed && styles.tilePressed,
        focus.ring,
      ]}
    >
      <Character name={character} size={64} decorative motion={onPress ? undefined : null} />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  // Ink at 45% over the trail, as on the board.
  dim: { ...StyleSheet.absoluteFill, backgroundColor: color.ink, opacity: 0.45 },
  sheet: {
    gap: 12,
    paddingTop: 10,
    paddingHorizontal: 22,
    backgroundColor: color.paper,
    borderTopWidth: border.edgeBold,
    borderColor: color.ink,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  handle: { alignSelf: 'center', width: 48, height: 6, borderRadius: 3, backgroundColor: color.ink, opacity: 0.35 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderRadius: radius.radiusL,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    boxShadow: shadow.shadowLg,
  },
  tileOff: { opacity: 0.6, boxShadow: 'none' },
  tilePressed: { transform: [{ translateY: 3 }], boxShadow: `0 2px 0 0 ${color.ink}` },
  tileLabel: { fontFamily: fontFamily('sticker', 400), fontSize: 18, lineHeight: 22, color: color.ink, textAlign: 'center' },
  tileSub: { ...text('meta'), fontSize: 12, lineHeight: 16, textAlign: 'center' },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
});
