// Step 5: the daily push (docs/bouwplan.md). pg_cron calls this every hour with a shared secret;
// public.push_digest decides whether it's 19:00 in Amsterdam and which parents get one sentence.
// Delivered straight to Apple (APNs, token-based .p8 key) and Google (FCM HTTP v1, service
// account), signed here with Web Crypto: no third-party code, no Expo push service.
// A platform without its keys is skipped, so this runs before the Apple and Firebase setup exists.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET');
const APNS_KEY = Deno.env.get('APNS_KEY_P8');
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID');
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID');
const APNS_TOPIC = Deno.env.get('APNS_TOPIC') ?? 'nl.teddysteps.app';
const FCM_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT');

type Push = { token: string; platform: 'ios' | 'android'; apns_sandbox: boolean; body: string };

const base64url = (bytes: Uint8Array | string) =>
  btoa(typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function pemBody(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function jwt(header: object, claims: object, key: CryptoKey, algorithm: AlgorithmIdentifier | EcdsaParams): Promise<string> {
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = new Uint8Array(await crypto.subtle.sign(algorithm, key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${base64url(signature)}`;
}

// Apple: one ES256 token per run (valid up to an hour).
async function apnsToken(): Promise<string> {
  const key = await crypto.subtle.importKey('pkcs8', pemBody(APNS_KEY!), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return jwt({ alg: 'ES256', kid: APNS_KEY_ID }, { iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, key, { name: 'ECDSA', hash: 'SHA-256' });
}

// Google: swap a signed RS256 assertion for a short-lived access token.
async function fcmAccess(): Promise<{ token: string; project: string }> {
  const account = JSON.parse(FCM_ACCOUNT!);
  const key = await crypto.subtle.importKey('pkcs8', pemBody(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const assertion = await jwt(
    { alg: 'RS256', typ: 'JWT' },
    { iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 },
    key,
    { name: 'RSASSA-PKCS1-v1_5' },
  );
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`fcm auth ${response.status}`);
  return { token: (await response.json()).access_token, project: account.project_id };
}

/** 'sent', 'invalid' (forget this device) or 'failed' (keep it, try again tomorrow). */
async function toApple(push: Push, bearer: string): Promise<string> {
  const host = push.apns_sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  const response = await fetch(`${host}/3/device/${push.token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${bearer}`,
      'apns-topic': APNS_TOPIC,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 24 * 3600),
      'apns-collapse-id': 'daily',
    },
    body: JSON.stringify({ aps: { alert: { body: push.body }, sound: 'default' }, kind: 'daily' }),
  });
  if (response.ok) return 'sent';
  const reason = (await response.json().catch(() => ({}))).reason;
  return response.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered' ? 'invalid' : 'failed';
}

async function toGoogle(push: Push, access: { token: string; project: string }): Promise<string> {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${access.project}/messages:send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${access.token}` },
    body: JSON.stringify({
      message: {
        token: push.token,
        notification: { body: push.body },
        data: { kind: 'daily' },
        android: { ttl: '86400s', collapse_key: 'daily', notification: { channel_id: 'knuffels', tag: 'daily' } },
      },
    }),
  });
  if (response.ok) return 'sent';
  const status = (await response.json().catch(() => ({}))).error?.status;
  return response.status === 404 || status === 'UNREGISTERED' ? 'invalid' : 'failed';
}

Deno.serve(async (request) => {
  if (!CRON_SECRET || request.headers.get('x-push-secret') !== CRON_SECRET) return new Response(null, { status: 403 });
  const { data, error } = await service.rpc('push_digest');
  if (error) {
    console.error('push: digest failed');
    return new Response(null, { status: 500 });
  }
  const pushes = (data ?? []) as Push[];
  const counts = { sent: 0, invalid: 0, failed: 0, skipped: 0 };
  const apple = APNS_KEY && APNS_KEY_ID && APNS_TEAM_ID && pushes.some((p) => p.platform === 'ios') ? await apnsToken() : null;
  const google = FCM_ACCOUNT && pushes.some((p) => p.platform === 'android') ? await fcmAccess() : null;
  for (const push of pushes) {
    const result = push.platform === 'ios' ? (apple ? await toApple(push, apple) : 'skipped') : google ? await toGoogle(push, google) : 'skipped';
    counts[result as keyof typeof counts]++;
    if (result === 'invalid') await service.rpc('push_token_invalid', { token: push.token });
  }
  // Counts only: never tokens or sentences in the logs.
  console.log(`push: ${JSON.stringify(counts)}`);
  return Response.json(counts);
});
