import { possessive } from '@teddysteps/core';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, Character, color, fontFamily, radius, Scallop, shadow, Wordmark } from '@teddysteps/ui';

/**
 * T1's header, compact (Pad 3.0): the child's trail and the week sticker on one line, Bo
 * peeking at the end, so the photos get the room. New hugs show on the Knuffels tab, the
 * account under Ik.
 */
export function TrailHeader({ childName, week }: { childName: string; week: string | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.header}>
      {/* The logo from the website on top (owner, 3 November 2026). */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Wordmark size={22} />
      </View>
      <View style={[styles.band, { paddingTop: 12 }]}>
        {/* Lettered like the wordmark (owner, 25 October 2026): ink letters on a hard paper print. */}
        <View style={styles.name}>
          <Text numberOfLines={2} style={[styles.title, styles.titleShadow]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {possessive(childName)} pad
          </Text>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
            {possessive(childName)} pad
          </Text>
        </View>
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
  top: { backgroundColor: color.paper, paddingHorizontal: 20, paddingBottom: 6 },
  band: { backgroundColor: color.cornflower, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flexShrink: 1 },
  title: { fontFamily: fontFamily('sticker', 400), fontSize: 28, lineHeight: 34, color: color.ink },
  titleShadow: { position: 'absolute', left: 2, top: 2, right: -2, color: color.paper },
  week: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.radiusS, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.sunshine, boxShadow: shadow.shadowSm },
  weekText: { fontFamily: fontFamily('sans', 800), fontSize: 12, lineHeight: 16, color: color.ink },
  spacer: { flex: 1 },
});
