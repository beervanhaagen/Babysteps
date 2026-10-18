import type { SvgMarkupProps } from './svg';

export type { SvgMarkupProps };

// The browser draws SVG itself, so the family page doesn't ship react-native-svg.
// The markup only ever comes from art.ts (our own design files), never from user input.
export function SvgMarkup({ markup, viewBox, width, height, color, preserveAspectRatio, style }: SvgMarkupProps) {
  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', overflow: 'visible', color, ...style }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
