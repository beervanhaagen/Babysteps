import { Platform } from 'react-native';

/**
 * ARIA attributes that react-native-web passes to the DOM but React Native's types don't list
 * (aria-describedby, aria-level). Native screen readers get the same information through
 * accessibilityHint and accessibilityRole instead.
 */
export function webAria(props: Record<string, string | number | undefined>): object {
  return Platform.OS === 'web' ? props : {};
}
