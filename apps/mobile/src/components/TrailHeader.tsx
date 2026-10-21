import { possessive } from '@teddysteps/core';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, Character, color, fontFamily, radius, Scallop, shadow, text } from '@teddysteps/ui';

/**
 * T1's header, compact (Pad 3.0): the child's trail and the week sticker on one line, Bo
 * peeking at the end, so the photos get the room. New hugs show on the Knuffels tab, the
 * account under Ik.
 */
export function TrailHeader({ childName, week }: { childName: string; week: string | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.header}>
      <View style={[styles.band, { paddingTop: insets.top + 14 }]}>
        <Text accessibilityRole="header" numberOfLines={2} style={[text('titleL'), styles.title]}>
          {possessive(childName)} pad
        </Text>
        {week ? (
          <View style={styles.week}>
            <Text style={styles.weekText}>{week}</Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <Character name="bo" size={44} decorative />
      </View>
      <Scallop color="cornflower" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'relative', zIndex: 1 },
  band: { backgroundColor: color.cornflower, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, lineHeight: 32, flexShrink: 1 },
  week: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.radiusS, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.sunshine, boxShadow: shadow.shadowSm },
  weekText: { fontFamily: fontFamily('sans', 800), fontSize: 12, lineHeight: 16, color: color.ink },
  spacer: { flex: 1 },
});
