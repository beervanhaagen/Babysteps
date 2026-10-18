import { SvgXml } from 'react-native-svg';

export interface SvgMarkupProps {
  /** Inner SVG markup, as designed in bundle.js. */
  markup: string;
  viewBox: string;
  width: number | string;
  height: number;
  /** Fills `currentColor`. */
  color?: string;
  preserveAspectRatio?: string;
  style?: object;
}

// In the app SVG goes through react-native-svg; the family page uses plain <svg> (svg.web.tsx).
export function SvgMarkup({ markup, viewBox, width, height, color, preserveAspectRatio, style }: SvgMarkupProps) {
  const ratio = preserveAspectRatio ? ` preserveAspectRatio="${preserveAspectRatio}"` : '';
  return <SvgXml xml={`<svg viewBox="${viewBox}"${ratio}>${markup}</svg>`} width={width} height={height} color={color} style={style} />;
}
