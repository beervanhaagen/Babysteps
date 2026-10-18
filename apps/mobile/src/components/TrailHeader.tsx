import { possessive } from '@teddysteps/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Character, color, Scallop, Sticker, text, useFocusRing, Wordmark } from '@teddysteps/ui';

/** T1's header: the wordmark instead of a back button, the child's trail and the week sticker. */
export function TrailHeader({ childName, week }: { childName: string; week: string | null }) {
  const insets = useSafeAreaInsets();
  const focus = useFocusRing();
  return (
    <View style={styles.header}>
      <View style={[styles.band, { paddingTop: insets.top + 10 }]}>
        <View style={styles.top}>
          <Wordmark size={26} tone="header" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Je account"
            onPress={() => router.replace('/ik')}
            onFocus={focus.onFocus}
            onBlur={focus.onBlur}
            style={[styles.me, focus.ring]}
          >
            <Avatar name={childName} decorative />
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={[text('titleL'), styles.title]}>
          {possessive(childName)} pad
        </Text>
        {week ? (
          <View style={styles.week}>
            <Sticker>{week}</Sticker>
          </View>
        ) : null}
      </View>
      <Scallop color="cornflower" />
      <Character name="bo" size={88} decorative rotate={6} peek={{ right: 6, top: insets.top + 58 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'relative', zIndex: 1 },
  band: { backgroundColor: color.cornflower, paddingHorizontal: 20, paddingBottom: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  me: { borderRadius: 22 },
  title: { marginTop: 10, maxWidth: 240 },
  week: { flexDirection: 'row', marginTop: 8, minHeight: 44, alignItems: 'center' },
});
