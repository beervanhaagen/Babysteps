// Fails if teddysteps.nl ever loads something from someone else, or gets a script before
// we decide on one (Plausible only, docs/analytics.md). Run after `npm run landing:build`.
// Forms (the pre-registration) may only post to our own waitlist function, and only once
// vercel.json sends them there; SIGNUP=local allows the form for the local preview.
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
let forms = 0;
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
  // The reference TabBar is English; src/screens.mjs translates it.
  if (/<span>(Trail|Book|Family|Me)<\/span>/.test(text)) problems.push(`${name}: English tab label in an app screen`);
  for (const [form] of text.matchAll(/<form\b[^>]*>/gi)) {
    forms++;
    const action = form.match(/action="([^"]*)"/)?.[1];
    if (!/method="post"/i.test(form) || (action !== undefined && action !== '/api/aanmelden')) problems.push(`${name}: form must post to /api/aanmelden or to itself: ${form}`);
  }
  // Codes and personal data never go in a query string on this domain (CLAUDE.md, Domains).
  for (const [, href] of text.matchAll(/(?:href|action)="((?:https:\/\/teddysteps\.nl)?\/[^"]*)"/g)) {
    if (href.includes('?')) problems.push(`${name}: query string in a link on teddysteps.nl: ${href}`);
  }
  for (const [, host] of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    if (!ALLOWED_HOSTS.includes(host.toLowerCase())) problems.push(`${name}: unknown host "${host}"`);
  }
}

const vercel = JSON.parse(readFileSync(join(landing, 'vercel.json'), 'utf8'));
const csp = vercel.headers[0].headers.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
if (!csp.includes("script-src 'none'")) problems.push(`vercel.json: script-src must be 'none' until Plausible is added`);
if (!csp.includes("connect-src 'none'")) problems.push(`vercel.json: connect-src must be 'none'`);
for (const rewrite of vercel.rewrites ?? []) {
  const ok = /^https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/waitlist\//.test(rewrite.destination) || rewrite.destination === '/bevestig';
  if (!ok) problems.push(`vercel.json: rewrite to ${rewrite.destination} is not the waitlist function`);
}
const live = (vercel.rewrites ?? []).some((rewrite) => rewrite.destination.includes('/functions/v1/waitlist/aanmelden'));
if (forms && !live && process.env.SIGNUP !== 'local') problems.push('a form is built, but vercel.json has no rewrite for it');
if (live && !csp.includes("form-action 'self'")) problems.push(`vercel.json: the sign-up form needs form-action 'self'`);
if (!live && !csp.includes("form-action 'none'")) problems.push(`vercel.json: form-action stays 'none' until the sign-up form is live`);

if (problems.length) {
  console.error('teddysteps.nl may only load from itself:');
  for (const problem of [...new Set(problems)]) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('Landing page clean (no scripts, no outside hosts, CSP ok).');
