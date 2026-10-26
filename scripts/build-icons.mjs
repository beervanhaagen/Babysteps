// The app icons (board "App icons"): Bo peeking up from the bottom of a sunshine square. Renders
// design/assets/characters/bo-default.svg into apps/mobile/assets. Run: node scripts/build-icons.mjs
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const raw = readFileSync(`${root}design/assets/characters/bo-default.svg`, 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const SUNSHINE = '#FFD84D';
const INK = '#2D1E2F';

/** Bo at x, y and width w (his viewBox is -6 0 212 200). */
const bo = (x, y, w, body = inner) => `<svg x="${x}" y="${y}" width="${w}" height="${(w * 200) / 212}" viewBox="-6 0 212 200" overflow="visible">${body}</svg>`;
const square = (body, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`;
const fill = `<rect width="1024" height="1024" fill="${SUNSHINE}"/>`;
const write = (name, svg, size = 1024) =>
  writeFileSync(`${root}apps/mobile/assets/${name}`, new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng());

// iOS (which rounds the corners itself): Bo big, his feet on the bottom edge.
const big = 1000;
const peeking = bo((1024 - big) / 2, 1024 - (big * 200) / 212 + 15, big);
write('icon.png', square(fill + peeking));
write('favicon.png', square(fill + peeking), 48);

// Android adaptive: Bo inside the safe zone (the middle 66%) on sunshine.
const small = 600;
const at = [(1024 - small) / 2, (1024 - (small * 200) / 212) / 2 + 30];
write('android-icon-foreground.png', square(bo(...at, small)));
write('android-icon-background.png', square(fill));

// Themed icons use only the shape: Bo in one colour with his eyes, nose and smile cut out.
const shape = inner
  .replace(/ filter="url\(#[^"]*\)"/g, '')
  .replaceAll(`"${INK}"`, '"#000000"')
  .replace(/fill="#FFFFFF"/g, 'fill="#000000"')
  .replace(/fill="#(?!000000)[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"')
  .replace(/ opacity="[^"]*"/g, '');
write(
  'android-icon-monochrome.png',
  square(`<mask id="bo" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">${bo(...at, small, shape)}</mask><rect width="1024" height="1024" fill="#000000" mask="url(#bo)"/>`),
);
console.log('App icons written to apps/mobile/assets.');
