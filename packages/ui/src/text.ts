import type { TextStyle } from 'react-native';
import { color, type } from './tokens';

export type TypeName = keyof typeof type;
type Family = (typeof type)[TypeName]['family'];

// Custom fonts in React Native pick a file per weight, so each weight is its own fontFamily.
// Never set fontWeight next to these: Android would fall back to a system font.
const FAMILIES: Record<Family, Record<number, string>> = {
  display: { 700: 'Fraunces-Bold', 800: 'Fraunces-ExtraBold' },
  sticker: { 400: 'BagelFatOne-Regular' },
  sans: { 400: 'Nunito-Regular', 700: 'Nunito-Bold', 800: 'Nunito-ExtraBold' },
  hand: { 500: 'ShantellSans-Medium', 700: 'ShantellSans-Bold' },
};

export function fontFamily(family: Family, weight: number, italic = false): string {
  if (family === 'display' && italic) return 'Fraunces-ExtraBoldItalic';
  const weights = FAMILIES[family];
  return weights[weight] ?? weights[Math.max(...Object.keys(weights).map(Number))];
}

/** A text style from the type scale in tokens.json, in ink. */
export function text(name: TypeName): TextStyle {
  const style = type[name];
  return {
    fontFamily: fontFamily(style.family, style.fontWeight),
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: 'letterSpacing' in style ? style.letterSpacing : undefined,
    color: color.ink,
  };
}
