import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { webAria } from './a11y';
import { Hug } from './brand';
import { useFocusRing } from './focus';
import { useReducedMotion } from './motion';
import { SvgMarkup } from './svg';
import { fontFamily } from './text';
import { border, color, radius, shadow, size, space } from './tokens';

// Reacting with our own drawn icons besides the hug (owner, 3 November 2026): a heart, a laugh,
// a wow, a star and a sun, in riso colours with an ink line. Sent ones float up across the
// screen ("dwarrelen"); under reduced motion they don't move.

export type ReactionKind = 'hug' | 'heart' | 'laugh' | 'wow' | 'star' | 'sun';

/** The icons next to the hug, in this order; with the words a screen reader says. */
export const REACTIONS: { kind: Exclude<ReactionKind, 'hug'>; label: string; one: string; many: string }[] = [
  { kind: 'heart', label: 'Hartje', one: 'een hartje', many: 'hartjes' },
  { kind: 'laugh', label: 'Lachje', one: 'een lachje', many: 'lachjes' },
  { kind: 'wow', label: 'Wauw', one: 'een wauw', many: 'wauws' },
  { kind: 'star', label: 'Sterretje', one: 'een sterretje', many: 'sterretjes' },
  { kind: 'sun', label: 'Zonnetje', one: 'een zonnetje', many: 'zonnetjes' },
];

const INK = color.ink;
// Faces in the gang's own face: dot eyes with a white catchlight and rose cheeks. Each icon its own
// colour, so they stay apart when small: rose, lilac, pistachio, sunshine, apricot.
const eyes = (y: number) =>
  `<circle cx="17.5" cy="${y}" r="3" fill="${INK}"/><circle cx="30.5" cy="${y}" r="3" fill="${INK}"/><circle cx="18.6" cy="${y - 1.1}" r="1" fill="${color.white}"/><circle cx="31.6" cy="${y - 1.1}" r="1" fill="${color.white}"/>`;
const cheeks = (y: number) => `<ellipse cx="12" cy="${y}" rx="3.6" ry="2.6" fill="${color.rose}" opacity="0.62"/><ellipse cx="36" cy="${y}" rx="3.6" ry="2.6" fill="${color.rose}" opacity="0.62"/>`;
const ART: Record<Exclude<ReactionKind, 'hug'>, string> = {
  heart: `<path d="M24 41 C 12 32, 5 25, 5 16.5 C 5 11 9 7 14 7 C 18 7 21.5 9.5 24 13 C 26.5 9.5 30 7 34 7 C 39 7 43 11 43 16.5 C 43 25 36 32 24 41 Z" fill="${color.rose}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M12 15 q1 -4 5 -4" fill="none" stroke="${color.white}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>`,
  laugh: `<circle cx="24" cy="24" r="19.5" fill="${color.lilac}" stroke="${INK}" stroke-width="3.4"/>${eyes(20)}${cheeks(27)}<path d="M16.5 27 h15 q-1.5 8 -7.5 8 q-6 0 -7.5 -8 Z" fill="${INK}"/>`,
  wow: `<circle cx="24" cy="24" r="19.5" fill="${color.pistachio}" stroke="${INK}" stroke-width="3.4"/>${eyes(19)}${cheeks(27)}<ellipse cx="24" cy="31" rx="3.6" ry="4.6" fill="${INK}"/>`,
  star: `<path d="M24 4 L29.5 17 L43.5 18 L32.8 27.2 L36.2 41 L24 33.6 L11.8 41 L15.2 27.2 L4.5 18 L18.5 17 Z" fill="${color.sunshine}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`,
  sun: `<g stroke="${INK}" stroke-width="3.4" stroke-linecap="round"><path d="M24 2.5 v6 M24 39.5 v6 M2.5 24 h6 M39.5 24 h6 M8.8 8.8 l4.2 4.2 M35 35 l4.2 4.2 M8.8 39.2 l4.2 -4.2 M35 13 l4.2 -4.2"/></g><circle cx="24" cy="24" r="12" fill="${color.apricot}" stroke="${INK}" stroke-width="3.4"/>`,
};

// Written reacties (comments.tsx) show as a speech bubble with their number.
const BUBBLE = `<path d="M5 5.5 H19 C20.1 5.5 21 6.4 21 7.5 V15 C21 16.1 20.1 17 19 17 H11 L6.5 20.5 V17 H5 C3.9 17 3 16.1 3 15 V7.5 C3 6.4 3.9 5.5 5 5.5 Z"/>`;

/** The speech bubble, in the icons' line style. */
export function CommentIcon({ size: box = 18, weight = 2.4 }: { size?: number; weight?: number }) {
  return (
    <SvgMarkup
      markup={`<g fill="none" stroke="${color.ink}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${BUBBLE}</g>`}
      viewBox="0 0 24 24"
      width={box}
      height={box}
    />
  );
}


/** "2 knuffels, 1 hartje": the counts in words, for screen readers and card labels. */
export function reactionsSpoken(counts: Partial<Record<ReactionKind, number>>): string {
  return (['hug', ...REACTIONS.map((r) => r.kind)] as ReactionKind[])
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((k) => {
      const n = counts[k]!;
      if (k === 'hug') return n === 1 ? '1 knuffel' : `${n} knuffels`;
      const r = REACTIONS.find((x) => x.kind === k)!;
      return n === 1 ? `1 ${r.label.toLowerCase()}` : `${n} ${r.many}`;
    })
    .join(', ');
}

/** One reaction icon. The hug is The Hug, Bo with Puddle. */
export function ReactionIcon({ kind, size: box = 28 }: { kind: ReactionKind; size?: number }) {
  if (kind === 'hug') return <Hug size={box * 1.1} decorative />;
  return <SvgMarkup markup={ART[kind]} viewBox="0 0 48 48" width={box} height={box} />;
}

/** "Hartje, 3": counts per kind, small, for a card or the big view. Only kinds that were sent. */
export function ReactionCounts({ counts }: { counts: Partial<Record<ReactionKind, number>> }) {
  const shown = (['hug', ...REACTIONS.map((r) => r.kind)] as ReactionKind[]).filter((k) => (counts[k] ?? 0) > 0);
  if (!shown.length) return null;
  const spoken = reactionsSpoken(counts);
  return (
    <View style={styles.counts} accessible accessibilityRole="image" accessibilityLabel={spoken} {...webAria({ role: 'img', 'aria-label': spoken })}>
      {shown.map((k) => (
        <View key={k} style={styles.count}>
          <ReactionIcon kind={k} size={k === 'hug' ? 24 : 21} />
          <Text style={styles.countText}>{counts[k]}</Text>
        </View>
      ))}
    </View>
  );
}

/** The row of icons to send: five equal 44px stickers on one line; each says its name to a screen reader. */
export function ReactionPicker({ onReact, busy, label = 'Stuur iets liefs' }: { onReact: (kind: Exclude<ReactionKind, 'hug'>) => void; busy?: boolean; label?: string }) {
  return (
    <View role="group" {...webAria({ 'aria-label': label })} accessibilityLabel={label} style={styles.picker}>
      {REACTIONS.map((r) => (
        <PickerButton key={r.kind} kind={r.kind} disabled={busy} onPress={() => onReact(r.kind)} />
      ))}
    </View>
  );
}

function PickerButton({ kind, disabled, onPress }: { kind: Exclude<ReactionKind, 'hug'>; disabled?: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Stuur ${REACTIONS.find((r) => r.kind === kind)!.one}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [styles.pick, pressed && styles.pickPressed, focus.ring]}
    >
      <ReactionIcon kind={kind} size={28} />
    </Pressable>
  );
}

/**
 * The float: icons rising from the bottom of the screen, swaying, fading out (about 2.4s, at most
 * 12 at once). Give it a new `burst` ({ kind, count, id }) to start one. Lays over everything and
 * never catches a tap. Under reduced motion nothing moves; the counts already say it.
 */
export function Dwarrel({ burst }: { burst?: { kind: ReactionKind; count: number; id: number } | null }) {
  const reduced = useReducedMotion();
  const [flakes, setFlakes] = useState<Flake[]>([]);
  const next = useRef(0);
  // Each burst clears its own icons when it's done; only leaving the screen stops the timers.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!burst || reduced) return;
    const made: Flake[] = Array.from({ length: Math.min(12, Math.max(1, burst.count)) }, (_, i) => ({
      id: next.current++,
      kind: burst.kind,
      x: 0.12 + Math.random() * 0.76,
      sway: (Math.random() - 0.5) * 70,
      delay: i * 90 + Math.random() * 120,
      size: 30 + Math.random() * 22,
      spin: (Math.random() - 0.5) * 50,
    }));
    setFlakes((all) => [...all, ...made].slice(-12));
    timers.current.push(setTimeout(() => setFlakes((all) => all.filter((f) => !made.includes(f))), 3200));
  }, [burst, reduced]);
  if (!flakes.length) return null;
  return (
    <View pointerEvents="none" style={styles.layer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {flakes.map((f) => (
        <FlakeView key={f.id} flake={f} />
      ))}
    </View>
  );
}

interface Flake {
  id: number;
  kind: ReactionKind;
  /** Where it starts across the width, 0 to 1. */
  x: number;
  sway: number;
  delay: number;
  size: number;
  spin: number;
}

function FlakeView({ flake: f }: { flake: Flake }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 2400, delay: f.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t, f.delay]);
  return (
    <Animated.View
      style={[
        styles.flake,
        {
          left: `${f.x * 100}%`,
          opacity: t.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -520] }) },
            { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, f.sway, f.sway * 0.4] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${f.spin}deg`] }) },
            { scale: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.4, 1.1, 0.9] }) },
          ],
        },
      ]}
    >
      <ReactionIcon kind={f.kind} size={f.size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.space2 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { fontFamily: fontFamily('sans', 800), fontSize: 13, lineHeight: 18, color: color.ink },
  picker: { flexDirection: 'row', gap: space.space2 },
  pick: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.radiusPill,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.paper,
    boxShadow: shadow.shadowSm,
  },
  pickPressed: { transform: [{ translateY: 2 }], boxShadow: `0 0 0 0 ${color.ink}` },
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', zIndex: 50 },
  flake: { position: 'absolute', bottom: -40, marginLeft: -24 },
});
