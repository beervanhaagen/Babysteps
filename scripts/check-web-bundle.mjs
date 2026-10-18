// Fails if the family page could talk to, or load from, anyone but us
// (see docs/family-email.md). Run after `npm run family:export`.
// 1. The exported files may only mention hosts on the allow-list (text in library code).
// 2. Known tracker and crash-reporting names may not appear at all.
// 3. vercel.json must keep script-src and connect-src at 'self'.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const family = fileURLToPath(new URL('../apps/family/', import.meta.url));
const dist = join(family, 'dist');

// Hosts that only appear as text inside React, react-native-web and SVG markup (error messages,
// namespaces); nothing loads from them.
const ALLOWED_HOSTS = ['www.w3.org', 'react.dev', 'necolas.github.io', 'github.com'];
const FORBIDDEN = [
  'sentry', 'aptabase', 'googleapis', 'gstatic', 'google-analytics', 'googletagmanager', 'firebase',
  'posthog', 'mixpanel', 'amplitude', 'segment.io', 'bugsnag', 'datadog', 'logrocket',
  '_vercel/insights', '_vercel/speed-insights', 'vercel.live',
];
// Code and markup only; the font licences (OFL-*.txt) rightly name their own websites.
const TEXT = /\.(html|js|mjs|css|json|map|xml|webmanifest)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.test(name)) yield path;
  }
}

const problems = [];
let checked = 0;
try {
  for (const file of files(dist)) {
    checked++;
    const name = file.slice(dist.length + 1);
    const text = readFileSync(file, 'utf8');
    const lower = text.toLowerCase();
    for (const word of FORBIDDEN) {
      if (lower.includes(word)) problems.push(`${name}: forbidden "${word}"`);
    }
    for (const [, host] of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      if (!ALLOWED_HOSTS.includes(host.toLowerCase())) problems.push(`${name}: unknown host "${host}"`);
    }
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('No apps/family/dist found. Run `npm run family:export` first.');
    process.exit(1);
  }
  throw error;
}
if (checked === 0) problems.push('apps/family/dist is empty.');

const vercel = JSON.parse(readFileSync(join(family, 'vercel.json'), 'utf8'));
const csp = vercel.headers
  .flatMap((block) => block.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value;
if (!csp) problems.push('vercel.json: no Content-Security-Policy');
for (const directive of ['script-src', 'connect-src']) {
  const value = csp?.match(new RegExp(`${directive} ([^;]+)`))?.[1].trim();
  if (value !== "'self'") problems.push(`vercel.json: ${directive} must be 'self', is "${value}"`);
}

if (problems.length) {
  console.error('The family page may only load from and talk to familie.teddysteps.nl:');
  for (const problem of [...new Set(problems)]) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`Family bundle clean (${checked} files checked, CSP ok).`);
