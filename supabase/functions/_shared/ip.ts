// The visitor's IP address, only ever as an HMAC with a key that lives in the edge functions:
// a plain SHA-256 of an IPv4 address can be reversed by trying all four billion of them.
const KEY = Deno.env.get('IP_HASH_KEY');

export async function ipHash(request: Request): Promise<string> {
  if (!KEY) throw new Error('IP_HASH_KEY is not set');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('');
}
