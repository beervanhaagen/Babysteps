import { Pressable, StyleSheet, Text } from 'react-native';
import { color, fontFamily, size } from '@teddysteps/ui';

/** A bold text link with a 44px tap target, like "Ik heb al een account". */
export function TextLink({ children, onPress, disabled }: { children: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="link" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={4} style={styles.link}>
      <Text style={[styles.text, disabled && styles.disabled]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: size.tapMin, justifyContent: 'center', alignSelf: 'center' },
  text: { fontFamily: fontFamily('sans', 800), fontSize: 15, color: color.ink },
  disabled: { color: color.inkMuted },
});
