// Fails if teddysteps.nl ever loads something from someone else, or gets a script before
// we decide on one (Plausible only, docs/analytics.md). Run after `npm run landing:build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const landing = fileURLToPath(new URL('../apps/landing/', import.meta.url));
const dist = join(landing, 'dist');
// Our own domains (canonical and og:url, links), and the SVG namespace.
const ALLOWED_HOSTS = ['teddysteps.nl', 'familie.teddysteps.nl', 'www.w3.org'];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(html|css|svg)$/.test(name)) yield path;
  }
}

const problems = [];
for (const file of files(dist)) {
  const name = file.slice(dist.length + 1);
  const text = readFileSync(file, 'utf8');
  if (/<script/i.test(text)) problems.push(`${name}: has a <script>`);
  for (const tag of ['<iframe', '<object', '<embed', 'http-equiv="refresh"']) {
    if (text.toLowerCase().includes(tag)) problems.push(`${name}: has ${tag}`);
  }
  // Links without a scheme ("//host/x") load from elsewhere too.
  for (const [, host] of text.matchAll(/["'(=,\s]\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    if (!ALLOWED_HOSTS.includes(host.toLowerCase())) problems.push(`${name}: unknown host "//${host}"`);
  }
  if (/@import/i.test(text)) problems.push(`${name}: has an @import`);
  for (const [, host] of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    if (!ALLOWED_HOSTS.includes(host.toLowerCase())) problems.push(`${name}: unknown host "${host}"`);
  }
}

const vercel = JSON.parse(readFileSync(join(landing, 'vercel.json'), 'utf8'));
const csp = vercel.headers[0].headers.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
if (!csp.includes("script-src 'none'")) problems.push(`vercel.json: script-src must be 'none' until Plausible is added`);

if (problems.length) {
  console.error('teddysteps.nl may only load from itself:');
  for (const problem of [...new Set(problems)]) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('Landing page clean (no scripts, no outside hosts, CSP ok).');
