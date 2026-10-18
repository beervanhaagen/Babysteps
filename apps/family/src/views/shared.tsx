import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { color, fontFamily, size, space, text, useFocusRing, webAria } from '@teddysteps/ui';

/** The one heading of a view: level 1, focused on arrival (route.ts). */
export function Heading({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return (
    <Text role="heading" {...webAria({ 'aria-level': 1 })} style={[text('display'), style]}>
      {children}
    </Text>
  );
}

/** A full-height page that scrolls, centred and never wider than a comfortable column. */
export function Page({ background = color.paper, children, wide }: { background?: string; children: ReactNode; wide?: boolean }) {
  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.scroll}>
      <View style={[styles.column, wide && styles.wide]}>{children}</View>
    </ScrollView>
  );
}

/** A bold text link with a 44px target, like "Terug naar de kaartjes". */
export function TextLink({ children, onPress }: { children: string; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur} style={[styles.link, focus.ring]}>
      <Text style={styles.linkText}>{children}</Text>
    </Pressable>
  );
}

/**
 * A photo that only loads when it comes into view, and decodes off the main thread: a year
 * of postcards stays light on an old phone. The family page is web only, so a plain <img>.
 */
export function Photo({ uri, label }: { uri?: string; label: string }) {
  if (!uri) return null;
  return (
    <img
      src={uri}
      alt={label}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  column: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: space.space6, paddingBottom: space.space6, gap: 14 },
  wide: { maxWidth: 1120 },
  link: { minHeight: size.tapMin, justifyContent: 'center', alignSelf: 'center' },
  linkText: { fontFamily: fontFamily('sans', 800), fontSize: 16, color: color.ink },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
  // System font on purpose: the brand fonts may still be loading.
  loadingText: { fontSize: 18, fontWeight: '800', color: color.ink },
});

/** "Even geduld…" until fonts and the first page are there, like the line in index.html. */
export function Loading() {
  return (
    <View style={styles.loading} role="status">
      <Text style={styles.loadingText}>Even geduld…</Text>
    </View>
  );
}
