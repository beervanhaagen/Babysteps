import { useState } from 'react';
import { Platform } from 'react-native';
import { color } from './tokens';

// Focus ring from the design system: 3px solid ink, 3px offset, only for keyboard focus.
// Typed by its shape only, so it fits both View and TextInput styles.
const RING = { outlineStyle: 'solid', outlineWidth: 3, outlineColor: color.ink, outlineOffset: 3 } as const;

export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  return {
    ring: focused ? RING : undefined,
    onFocus: (event: { target?: unknown }) => {
      // In the browser a click also focuses; only show the ring for keyboard focus.
      const target = event.target as { matches?: (selector: string) => boolean } | undefined;
      setFocused(Platform.OS !== 'web' || !!target?.matches?.(':focus-visible'));
    },
    onBlur: () => setFocused(false),
  };
}
