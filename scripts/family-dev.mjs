// Serves the family page locally the way Vercel does on familie.teddysteps.nl: the page and
// /api/* on one address, so the session cookie works. /api/* goes to the local family-api
// function, /storage/v1/* (signed photo links) to local Supabase, everything else to the Expo
// web dev server (npm run family, port 8081).
// Run: npm run family:dev   then open http://localhost:8090 (or this Mac's address on a phone).
import { createServer, request as httpRequest } from 'node:http';

const PORT = 8090;
const API = { host: '127.0.0.1', port: 55321, path: '/functions/v1/family-api' };
const STORAGE = { host: '127.0.0.1', port: 55321 };
const PAGE = { host: '127.0.0.1', port: Number(process.env.FAMILY_PAGE_PORT ?? 8081) };

createServer((req, res) => {
  const api = req.url.startsWith('/api/');
  const target = api
    ? { ...API, path: API.path + req.url.slice(4) }
    : req.url.startsWith('/storage/v1/')
      ? { ...STORAGE, path: req.url }
      : { ...PAGE, path: req.url };
  const headers = { ...req.headers, host: `${target.host}:${target.port}` };
  if (api) headers['x-forwarded-for'] = req.socket.remoteAddress ?? '';
  const upstream = httpRequest({ host: target.host, port: target.port, path: target.path, method: req.method, headers }, (reply) => {
    res.writeHead(reply.statusCode ?? 502, reply.headers);
    reply.pipe(res);
  });
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(api ? 'Local Supabase is not running (npx supabase start).' : 'Family page is not running (npm run family).');
  });
  req.pipe(upstream);
}).listen(PORT, () => console.log(`Family page with API on http://localhost:${PORT}`));
