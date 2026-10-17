// Fails if the exported family page contains anything that may never run there:
// analytics, crash reporting or Google-hosted fonts (see docs/family-email.md).
// Run after `npm run family:export`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../apps/family/dist', import.meta.url));
const FORBIDDEN = ['sentry', 'aptabase', 'googleapis', 'gstatic', 'google-analytics', 'googletagmanager', 'firebase'];
const TEXT = /\.(html|js|mjs|css|json|map|txt|xml|webmanifest)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.test(name)) yield path;
  }
}

let checked = 0;
const hits = [];
try {
  for (const file of files(dist)) {
    checked++;
    const text = readFileSync(file, 'utf8').toLowerCase();
    for (const word of FORBIDDEN) {
      if (text.includes(word)) hits.push(`${file.slice(dist.length + 1)}: "${word}"`);
    }
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('No apps/family/dist found. Run `npm run family:export` first.');
    process.exit(1);
  }
  throw error;
}

if (checked === 0) {
  console.error('apps/family/dist is empty.');
  process.exit(1);
}
if (hits.length) {
  console.error('Forbidden third-party code in the family page bundle:');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}
console.log(`Family bundle clean (${checked} files checked).`);
