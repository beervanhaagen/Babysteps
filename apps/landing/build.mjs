// Builds teddysteps.nl into dist/ as plain HTML and CSS: no JavaScript in the browser.
// Run: npm run build -w @teddysteps/landing
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { home } from './src/home.mjs';
import { notFound, simplePage } from './src/pages.mjs';
import { privacy } from './src/privacy.mjs';
import { SIGNUP_ON, SIGNUP_PAGES } from './src/signup.mjs';
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
writeFileSync(join(dist, '404.html'), notFound());
// The steps of the pre-registration, only when the form is on (src/signup.mjs).
if (SIGNUP_ON) for (const [name, content] of Object.entries(SIGNUP_PAGES)) writeFileSync(join(dist, `${name}.html`), simplePage(content));
// Search engines may index the site (owner, 18 October); the 404 page itself says noindex.
const pages = ['/', '/privacy'];
writeFileSync(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://teddysteps.nl/sitemap.xml\n');
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>https://teddysteps.nl${p}</loc></url>`).join('\n')}\n</urlset>\n`,
);
console.log(`Built apps/landing/dist (sign-up form ${SIGNUP_ON ? 'on' : 'off: mailto'})`);
