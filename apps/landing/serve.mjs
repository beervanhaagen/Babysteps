// Local preview of dist/ at http://localhost:8095, with the same CSP as vercel.json.
// With SIGNUP=local, the sign-up forms post to the local waitlist function, as the Vercel
// rewrites do online (README, "Pre-registration").
import { readFileSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('dist/', import.meta.url));
const vercel = JSON.parse(readFileSync(new URL('vercel.json', import.meta.url), 'utf8'));
const signup = process.env.SIGNUP === 'local';
let csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value.replace(' upgrade-insecure-requests', '');
if (signup) csp = csp.replace("form-action 'none'", "form-action 'self'");
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.png': 'image/png' };
const FUNCTION = { host: '127.0.0.1', port: 55321, path: '/functions/v1/waitlist' };

function file(path) {
  const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
  for (const candidate of [clean, `${clean}.html`, join(clean, 'index.html')]) {
    const full = join(dist, candidate);
    if (full.startsWith(dist) && statSync(full, { throwIfNoEntry: false })?.isFile()) return full;
  }
  return null;
}

function toFunction(req, res, route) {
  const headers = { ...req.headers, host: `${FUNCTION.host}:${FUNCTION.port}`, 'x-forwarded-for': req.socket.remoteAddress ?? '' };
  const upstream = httpRequest({ ...FUNCTION, path: FUNCTION.path + route, method: req.method, headers }, (reply) => {
    res.writeHead(reply.statusCode ?? 502, { location: reply.headers.location ?? '/aanmelden-mislukt', 'cache-control': 'no-store' });
    reply.pipe(res);
  });
  upstream.on('error', () => res.writeHead(303, { location: '/aanmelden-mislukt' }).end());
  req.pipe(upstream);
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (signup && req.method === 'POST' && (pathname === '/api/aanmelden' || pathname.startsWith('/bevestig/'))) {
    toFunction(req, res, pathname === '/api/aanmelden' ? '/aanmelden' : pathname);
    return;
  }
  // The confirmation link: the code stays in the address, the page is the same for everyone.
  const found = (signup && pathname.startsWith('/bevestig/') ? file('/bevestig') : file(pathname)) ?? join(dist, '404.html');
  res.writeHead(found.endsWith('404.html') ? 404 : 200, { 'Content-Type': TYPES[extname(found)] ?? 'application/octet-stream', 'Content-Security-Policy': csp });
  res.end(readFileSync(found));
}).listen(8095, () => console.log(`TeddySteps landing: http://localhost:8095${signup ? ' (sign-up form to the local waitlist function)' : ''}`));
