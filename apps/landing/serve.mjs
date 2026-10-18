// Local preview of dist/ at http://localhost:8095, with the same CSP as vercel.json.
import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('dist/', import.meta.url));
const vercel = JSON.parse(readFileSync(new URL('vercel.json', import.meta.url), 'utf8'));
const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value.replace(' upgrade-insecure-requests', '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };

function file(path) {
  const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
  for (const candidate of [clean, `${clean}.html`, join(clean, 'index.html')]) {
    const full = join(dist, candidate);
    if (full.startsWith(dist) && statSync(full, { throwIfNoEntry: false })?.isFile()) return full;
  }
  return null;
}

createServer((req, res) => {
  const found = file(new URL(req.url, 'http://localhost').pathname);
  if (!found) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Niet gevonden');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(found)] ?? 'application/octet-stream', 'Content-Security-Policy': csp });
  res.end(readFileSync(found));
}).listen(8095, () => console.log('TeddySteps landing: http://localhost:8095'));
