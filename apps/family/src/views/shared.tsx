import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { color, space, text, webAria } from '@teddysteps/ui';

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

export const body = { fontFamily: text('body').fontFamily, color: color.ink } as const;

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  column: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: space.space6, paddingBottom: space.space6, gap: 14 },
  wide: { maxWidth: 1120 },
});
