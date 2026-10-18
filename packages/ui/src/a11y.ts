import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * ARIA attributes that react-native-web passes to the DOM but React Native's types don't list
 * (aria-describedby, aria-level). Native screen readers get the same information through
 * accessibilityHint and accessibilityRole instead.
 */
export function webAria(props: Record<string, string | number | undefined>): object {
  return Platform.OS === 'web' ? props : {};
}

/**
 * Reads a message out loud on iOS, where live regions and role="alert" are ignored.
 * Android and the web pick up the alert role themselves.
 */
export function useAnnounce(message: string | undefined) {
  useEffect(() => {
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
