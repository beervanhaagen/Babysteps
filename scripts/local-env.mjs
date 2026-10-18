// Points the app at the local Supabase: writes apps/mobile/.env.local (git-ignored) with this
// Mac's network address, so Expo Go on a phone on the same Wi-Fi can reach it.
// Run after `npx supabase start`: npm run local-env
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const status = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { cwd: root, encoding: 'utf8' });
const value = (name) => status.match(new RegExp(`^${name}="?([^"\\n]+)"?$`, 'm'))?.[1];

const apiUrl = value('API_URL');
const key = value('PUBLISHABLE_KEY') ?? value('ANON_KEY');
if (!apiUrl || !key) throw new Error('Is local Supabase running? Start it with `npx supabase start`.');

const lan = Object.values(networkInterfaces())
  .flat()
  .find((net) => net && net.family === 'IPv4' && !net.internal)?.address;
const url = lan ? apiUrl.replace('127.0.0.1', lan) : apiUrl;

writeFileSync(
  `${root}apps/mobile/.env.local`,
  `# Local development only, written by scripts/local-env.mjs. Not committed.\nEXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_KEY=${key}\n`,
);
console.log(`apps/mobile/.env.local now points at ${url}`);
