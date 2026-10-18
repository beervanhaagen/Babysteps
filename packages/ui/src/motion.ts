import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { duration } from './tokens';

export type Motion = 'bob' | 'sway' | 'drift' | 'hop' | 'twinkle';

const NATIVE = Platform.OS !== 'web';

// One shared answer for every character on screen. The browser knows it right away,
// so nothing moves for a frame before it stops; the phone answers asynchronously.
let reduceMotion =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
const listeners = new Set<() => void>();
function setReduceMotion(on: boolean) {
  if (on === reduceMotion) return;
  reduceMotion = on;
  listeners.forEach((listener) => listener());
}
AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion, () => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True when the person asked their phone or browser to reduce motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduceMotion, () => reduceMotion);
}

/**
 * The gang's idle loops from bundle.css (bob, sway, drift, hop, twinkle).
 * `delay` offsets the start so nobody moves in sync. Stops under reduced motion.
 * Returns a transform for an Animated.View, or undefined when standing still.
 */
export function useLoop(motion: Motion | null | undefined, delay?: 1 | 2 | 3) {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(0));
  const active = !!motion && !reduced;

  useEffect(() => {
    if (!active || !motion) {
      value.setValue(0);
      return;
    }
    const ms = duration[motion];
    const ease = Easing.inOut(Easing.ease);
    // Hop has keyframes at 0, 20, 40, 60 and 100%; each stretch eases like the CSS does.
    const to = (toValue: number, share: number) =>
      Animated.timing(value, { toValue, duration: ms * share, easing: ease, useNativeDriver: NATIVE });
    const cycle =
      motion === 'hop'
        ? Animated.sequence([to(0.2, 0.2), to(0.4, 0.2), to(0.6, 0.2), to(1, 0.4)])
        : Animated.sequence([
            Animated.timing(value, { toValue: 1, duration: ms / 2, easing: ease, useNativeDriver: NATIVE }),
            Animated.timing(value, { toValue: 0, duration: ms / 2, easing: ease, useNativeDriver: NATIVE }),
          ]);
    const loop = Animated.loop(cycle);
    const timer = setTimeout(() => loop.start(), (delay ?? 0) * 700);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [active, motion, delay, value]);

  if (!active || !motion) return undefined;
  const between = (from: number, to: number) => value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const turn = (from: string, to: string) => value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  switch (motion) {
    case 'bob':
      return [{ translateY: between(0, -9) }, { rotate: turn('-3deg', '3deg') }];
    case 'sway':
      return [{ rotate: turn('-7deg', '7deg') }];
    case 'drift':
      return [{ translateX: between(0, 10) }, { translateY: between(0, -10) }, { rotate: turn('-4deg', '4deg') }];
    case 'twinkle':
      return [{ scale: between(1, 1.25) }, { rotate: turn('0deg', '18deg') }];
    case 'hop': {
      const steps = [0, 0.2, 0.4, 0.6, 1];
      return [
        { translateY: value.interpolate({ inputRange: steps, outputRange: [0, -16, 0, 0, 0] }) },
        { scaleX: value.interpolate({ inputRange: steps, outputRange: [1, 0.97, 1.04, 1, 1] }) },
        { scaleY: value.interpolate({ inputRange: steps, outputRange: [1, 1.04, 0.96, 1, 1] }) },
      ];
    }
  }
}
