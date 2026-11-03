import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusRing } from './focus';
import { useReducedMotion } from './motion';
import { fontFamily } from './text';
import { border, color, radius, size, space } from './tokens';

// The months of the trail as a row of chips over the timeline (owner, 3 November 2026): one tap
// to the first weeks, without scrolling all the way down. It stays on top while you scroll, and
// the month you're looking at is the filled one.

export interface MonthChip {
  key: string;
  /** "okt ’25". */
  label: string;
  /** "oktober 2025", for screen readers. */
  name: string;
  /** False when the month has no moments: shown, but not a button. */
  available: boolean;
}

export function MonthBar({ months, current, onPick }: { months: MonthChip[]; current?: string; onPick: (key: string) => void }) {
  const strip = useRef<ComponentRef<typeof ScrollView>>(null);
  const reduced = useReducedMotion();
  const places = useRef(new Map<string, number>());
  // Keep the current month in view as the timeline scrolls.
  useEffect(() => {
    const x = current ? places.current.get(current) : undefined;
    if (x !== undefined) strip.current?.scrollTo({ x: Math.max(0, x - 80), animated: !reduced });
  }, [current, reduced]);
  return (
    <View style={styles.bar}>
      <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} role="group" aria-label="Spring naar een maand">
        {months.map((m) => (
          <View key={m.key} onLayout={(e) => places.current.set(m.key, e.nativeEvent.layout.x)}>
            <Chip month={m} on={m.key === current} onPress={() => onPick(m.key)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ month, on, onPress }: { month: MonthChip; on: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  if (!month.available) {
    return (
      <View style={styles.target} accessible accessibilityLabel={`${month.name}, nog geen momenten`}>
        <View style={[styles.chip, styles.chipEmpty]}>
          <Text style={[styles.text, styles.textEmpty]}>{month.label}</Text>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Naar ${month.name}`}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      // A 44px target (hitSlop does nothing on the web) around a 34px pill.
      style={[styles.target, focus.ring]}
    >
      <View style={[styles.chip, on && styles.chipOn]}>
        <Text style={styles.text}>{month.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.paper, borderBottomWidth: 1, borderBottomColor: color.line, paddingVertical: 3 },
  target: { minHeight: size.tapMin, justifyContent: 'center' },
  row: { gap: 8, paddingHorizontal: space.space4 },
  chip: {
    minHeight: 34,
    minWidth: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.radiusPill,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
  },
  chipOn: { backgroundColor: color.sunshine },
  chipEmpty: { borderStyle: 'dashed', borderColor: color.trackOff, backgroundColor: 'transparent' },
  text: { fontFamily: fontFamily('sans', 800), fontSize: 13, lineHeight: 18, color: color.ink },
  textEmpty: { color: color.inkMuted },
});
