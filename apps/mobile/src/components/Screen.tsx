import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, ScreenHeader, space, type ScreenHeaderProps } from '@teddysteps/ui';

interface ScreenProps {
  /** A soft-block header band; omit for full-colour screens. */
  header?: Omit<ScreenHeaderProps, 'topInset'>;
  background?: string;
  /** Actions pinned to the bottom, like "Volgende" on the boards. */
  footer?: ReactNode;
  children: ReactNode;
}

/** The frame of every app screen: header band, scrolling content, actions at the bottom. */
export function Screen({ header, background = color.paper, footer, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: background }]}>
      {header ? <ScreenHeader {...header} topInset={insets.top} /> : <View style={{ height: insets.top }} />}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: space.space6 + insets.bottom }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingTop: 10, paddingHorizontal: space.space6, paddingBottom: space.space4, gap: 14 },
  footer: { paddingTop: 12, paddingHorizontal: space.space6, gap: 10 },
});
