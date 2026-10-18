import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { characters, doodles, hug, icons } from './art';
import { useLoop, type Motion } from './motion';
import { SvgMarkup } from './svg';
import { fontFamily } from './text';
import { color } from './tokens';

export type CharacterName = keyof typeof characters;
export type IconName = keyof typeof icons;
export type DoodleName = keyof typeof doodles;
export type ColorName = keyof typeof color;

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

export interface CharacterProps {
  name: CharacterName;
  mood?: 'default' | 'happy' | 'still';
  size?: number;
  /** Defaults to the character's own motion; null stands still. */
  motion?: Motion | null;
  delay?: 1 | 2 | 3;
  decorative?: boolean;
  /** Absolute position for a peek over an edge. */
  peek?: ViewStyle;
  rotate?: number;
}

export function Character({ name, mood = 'default', size = 120, motion, delay, decorative, peek, rotate = 0 }: CharacterProps) {
  const c = characters[name];
  const poses: Record<string, string> = c.poses;
  const pose = poses[mood] ?? poses.default;
  const transform = useLoop(motion === undefined ? (c.motion as Motion) : motion, delay);
  const a11y = decorative ? hidden : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: c.name };
  const art = (
    <Animated.View style={{ transform, transformOrigin: '50% 100%' }} {...a11y}>
      <SvgMarkup markup={pose} viewBox="-6 0 212 200" width={size} height={(size * 200) / 212} />
    </Animated.View>
  );
  if (!peek) return art;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', zIndex: 2, transform: [{ rotate: `${rotate}deg` }] }, peek]} {...hidden}>
      {art}
    </View>
  );
}

export function Hug({ size = 160, decorative }: { size?: number; decorative?: boolean }) {
  const a11y = decorative
    ? hidden
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: 'De knuffel: Bo de beer met Puddle de eend tegen zich aan' };
  return (
    <View {...a11y}>
      <SvgMarkup markup={hug} viewBox="0 0 240 220" width={size} height={(size * 220) / 240} />
    </View>
  );
}

export interface DoodleProps {
  name: DoodleName;
  size?: number;
  color?: ColorName;
  twinkle?: boolean;
  delay?: 1 | 2 | 3;
}

export function Doodle({ name, size = 28, color: ink, twinkle = true, delay }: DoodleProps) {
  const d = doodles[name];
  const fill = color[ink ?? (d.ink as ColorName)];
  const transform = useLoop(twinkle ? 'twinkle' : null, delay);
  const [, , w, h] = d.viewBox.split(' ').map(Number);
  const markup = `<g stroke-linecap="round" stroke-linejoin="round">${d.svg.split('"C"').join(`"${fill}"`)}</g>`;
  return (
    <Animated.View style={{ transform }} {...hidden}>
      <SvgMarkup markup={markup} viewBox={d.viewBox} width={size} height={(size * h) / w} />
    </Animated.View>
  );
}

export interface IconProps {
  name: IconName;
  size?: number;
  weight?: number;
  color?: string;
  /** Only for an icon that carries meaning on its own. */
  title?: string;
}

export function Icon({ name, size = 24, weight = 2.2, color: stroke = color.ink, title }: IconProps) {
  const markup = `<g fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</g>`;
  const a11y = title ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: title } : hidden;
  return (
    <View {...a11y}>
      <SvgMarkup markup={markup} viewBox="0 0 24 24" width={size} height={size} color={stroke} />
    </View>
  );
}

export function Wordmark({ size = 54, tone = 'paper', twinkle = true }: { size?: number; tone?: 'paper' | 'header'; twinkle?: boolean }) {
  const offset = Math.max(1.3, size / 20);
  const onDark = tone === 'header';
  const letters = { fontFamily: fontFamily('sticker', 400), fontSize: size, lineHeight: size * 1.15 };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="TeddySteps">
      <Text style={[letters, styles.wordmarkShadow, { left: offset, top: offset, color: onDark ? color.ink : color.cornflower }]}>teddysteps</Text>
      <Text style={[letters, { color: onDark ? color.paper : color.rose, mixBlendMode: onDark ? 'normal' : 'multiply' }]}>teddysteps</Text>
      {twinkle && !onDark ? (
        <View style={{ position: 'absolute', right: -size * 0.43, top: -size * 0.19 }}>
          <Doodle name="twinkle" size={Math.round(size * 0.39)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkShadow: { position: 'absolute' },
});
