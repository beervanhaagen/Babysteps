// Builds teddysteps.nl into dist/ as plain HTML and CSS: no JavaScript in the browser.
// Run: npm run build -w @teddysteps/landing
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { home } from './src/home.mjs';
import { privacy } from './src/privacy.mjs';
import { designSystem, ui } from './src/ui.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const dist = join(here, 'dist');

// The boards load fonts from Google; this page serves its own (see the design-system README).
const bundleCss = readFileSync(join(designSystem, 'components/bundle.css'), 'utf8').replace(/^@import[^;]+;\s*/m, '');
const css = [readFileSync(join(designSystem, 'tokens.css'), 'utf8'), bundleCss, readFileSync(join(here, 'src/landing.css'), 'utf8')].join('\n');

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'privacy'), { recursive: true });
cpSync(join(here, 'public'), dist, { recursive: true });
writeFileSync(join(dist, 'styles.css'), css);
writeFileSync(join(dist, 'favicon.svg'), ui('Hug', { size: 64 }).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
writeFileSync(join(dist, 'index.html'), home());
writeFileSync(join(dist, 'privacy/index.html'), privacy());
console.log('Built apps/landing/dist');
