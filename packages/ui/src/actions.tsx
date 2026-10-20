import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './brand';
import { useFocusRing } from './focus';
import { fontFamily, text } from './text';
import { border, color, radius, shadow, size as sizes } from './tokens';

const VARIANTS = {
  primary: { backgroundColor: color.bluebird, ink: color.onBluebird, boxShadow: undefined },
  dark: { backgroundColor: color.ink, ink: color.paper, boxShadow: shadow.shadowRose },
  paper: { backgroundColor: color.paper, ink: color.ink, boxShadow: undefined },
  sunshine: { backgroundColor: color.sunshine, ink: color.ink, boxShadow: undefined },
  danger: { backgroundColor: color.plum, ink: color.white, boxShadow: undefined },
};

export interface ButtonProps {
  variant?: keyof typeof VARIANTS;
  size?: 'lg' | 'md';
  block?: boolean;
  icon?: IconName;
  disabled?: boolean;
  /** While waiting for the server: shows "Even geduld…" and can't be pressed twice. */
  busy?: boolean;
  onPress?: () => void;
  /** Spoken instead of the label, when the label alone is not enough. */
  accessibilityLabel?: string;
  children: string;
}

/** A sticker you could peel off: ink edge, hard drop, presses 3px into its shadow. */
export function Button({ variant = 'primary', size = 'lg', block, icon, disabled: off, busy, onPress, accessibilityLabel, children }: ButtonProps) {
  const v = VARIANTS[variant];
  const disabled = off || busy;
  const lg = size === 'lg';
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [
        styles.button,
        {
          alignSelf: block ? 'stretch' : 'flex-start',
          minHeight: lg ? sizes.buttonLg : sizes.buttonMd,
          paddingHorizontal: lg ? 28 : 22,
          backgroundColor: v.backgroundColor,
          boxShadow: v.boxShadow ?? (lg ? shadow.shadowLg : shadow.shadowMd),
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        focus.ring,
      ]}
    >
      {icon && !busy ? <Icon name={icon} size={22} weight={2.6} color={v.ink} /> : null}
      <Text style={[text(lg ? 'buttonLg' : 'buttonMd'), { color: v.ink, includeFontPadding: false }]}>{busy ? 'Even geduld…' : children}</Text>
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  tone?: 'white' | 'paper';
  onPress?: () => void;
}

export function IconButton({ icon, label, tone, onPress }: IconButtonProps) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      hitSlop={4}
      style={[styles.iconButton, tone === 'white' && styles.iconWhite, tone === 'paper' && styles.iconPaper, focus.ring]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

export interface ChoiceChipProps {
  children: string;
  selected?: boolean;
  /** radio: one of a group; checkbox: any number. */
  type?: 'radio' | 'checkbox';
  onPress?: () => void;
}

export function ChoiceChip({ children, selected, type = 'radio', onPress }: ChoiceChipProps) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole={type}
      accessibilityState={{ checked: !!selected }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.chip, selected && styles.chipOn, focus.ring]}
    >
      <Text style={text('fieldLabel')}>{children}</Text>
    </Pressable>
  );
}

/** A labelled group of ChoiceChips, like "Is je baby er al?" on O2. */
export function ChoiceGroup({ label, type = 'radio', size = 'md', children }: { label: string; type?: 'radio' | 'checkbox'; size?: 'md' | 'lg'; children: ReactNode }) {
  return (
    <View style={styles.choiceGroup}>
      <Text aria-hidden style={[text('fieldLabel'), size === 'lg' && { fontSize: 16, lineHeight: 22 }]}>
        {label}
      </Text>
      <View role={type === 'radio' ? 'radiogroup' : 'group'} aria-label={label} style={styles.choiceRow}>
        {children}
      </View>
    </View>
  );
}

export interface SwitchProps {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
}

const NATIVE = Platform.OS !== 'web';

/** A whole row you can tap, with a switch on the right. */
export function Switch({ label, hint, value, onValueChange }: SwitchProps) {
  const focus = useFocusRing();
  const [knob] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(knob, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: NATIVE }).start();
  }, [value, knob]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange?.(!value)}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.switchRow, focus.ring]}
    >
      <View style={styles.switchText}>
        <Text style={text('rowTitle')}>{label}</Text>
        {hint ? <Text style={styles.rowBody}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, { backgroundColor: value ? color.bluebird : color.trackOff }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX: knob.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
      </View>
    </Pressable>
  );
}

export interface SegmentedProps<T extends string> {
  /** Spoken name of the group, e.g. "Weergave". */
  label: string;
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
}

/** Two or three ways to look at the same thing (T1: Tijdlijn or Raster). The chosen one is a sunshine sticker. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <View role="radiogroup" aria-label={label} style={styles.segmented}>
      {options.map((o) => (
        <Segment key={o.value} on={o.value === value} icon={o.icon} onPress={() => onChange(o.value)}>
          {o.label}
        </Segment>
      ))}
    </View>
  );
}

function Segment({ on, icon, onPress, children }: { on: boolean; icon?: IconName; onPress: () => void; children: string }) {
  const focus = useFocusRing();
  return (
    <Pressable
      role="radio"
      aria-checked={on}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.segment, on && styles.segmentOn, focus.ring]}
    >
      {icon ? <Icon name={icon} size={18} weight={on ? 2.4 : 2.2} /> : null}
      <Text style={[text('fieldLabel'), { fontSize: 14 }, !on && { fontFamily: fontFamily('sans', 700) }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: radius.radiusPill, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.card },
  segment: {
    flex: 1,
    minHeight: sizes.tapMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.radiusPill,
    borderWidth: border.edge,
    borderColor: 'transparent',
  },
  segmentOn: { borderColor: color.ink, backgroundColor: color.sunshine },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.radiusPill,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
  },
  pressed: { transform: [{ translateY: 3 }], boxShadow: `0 2px 0 0 ${color.ink}` },
  disabled: { opacity: 0.45 },
  iconButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    borderRadius: radius.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWhite: { backgroundColor: color.white },
  iconPaper: { backgroundColor: color.paper, borderWidth: border.edge, borderColor: color.ink },
  chip: {
    alignSelf: 'flex-start',
    minHeight: sizes.tapMin,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.card,
  },
  choiceGroup: { gap: 8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipOn: { backgroundColor: color.sunshine, boxShadow: shadow.shadowSm, transform: [{ translateY: -2 }] },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  switchText: { flex: 1 },
  rowBody: { ...text('body'), lineHeight: 19, color: color.inkMuted },
  // The ink edge shows "off" without colour; the knob sits 3px in from the outer edge.
  track: { width: 50, height: 30, borderRadius: 15, borderWidth: 2, borderColor: color.ink },
  knob: {
    position: 'absolute',
    left: -1,
    top: -1,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: color.ink,
    backgroundColor: color.white,
  },
});
