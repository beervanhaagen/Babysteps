// Sending mail for TeddySteps, shared by `waitlist`, `family-api` and `family-mail`: Lettermint
// online (from post.teddysteps.nl, tracking off), Mailpit locally. Plus the small helpers every
// mail needs: one-time codes, HTML escaping and the unsubscribe seal.

const LETTERMINT_TOKEN = Deno.env.get('LETTERMINT_API_TOKEN');
const MAIL_DEV_URL = Deno.env.get('MAIL_DEV_URL');
const ROUTE = Deno.env.get('LETTERMINT_ROUTE') ?? 'outgoing';
const LINK_KEY = Deno.env.get('MAIL_LINK_KEY');
export const FROM_ADDRESS = 'hallo@post.teddysteps.nl';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** The sender's display name, e.g. "Noor via TeddySteps". */
  fromName?: string;
  headers?: Record<string, string>;
  /** Lettermint sends a mail with the same key only once within 24 hours. */
  idempotencyKey?: string;
}

/** True when sent (or already sent with the same idempotency key). Failures log the status only. */
export async function send(mail: Mail): Promise<boolean> {
  // A first name in the sender's name, without anything that could break the header.
  const name = (mail.fromName ?? 'TeddySteps').replace(/["<>,;\\\r\n]/g, '').slice(0, 60);
  const from = `${name} <${FROM_ADDRESS}>`;
  if (LETTERMINT_TOKEN) {
    const response = await fetch('https://api.lettermint.co/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lettermint-token': LETTERMINT_TOKEN,
        ...(mail.idempotencyKey ? { 'Idempotency-Key': mail.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        route: ROUTE,
        from,
        to: [mail.to],
        reply_to: ['hallo@teddysteps.nl'],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        headers: mail.headers,
        settings: { track_opens: false, track_clicks: false },
      }),
    });
    if (response.ok) return true;
    // The same mail went out before (a retry after a lost answer): that counts as sent.
    if (mail.idempotencyKey && (response.status === 409 || response.status === 422)) return true;
    console.error(`mail: send failed ${response.status}`);
    return false;
  }
  if (MAIL_DEV_URL) {
    const response = await fetch(`${MAIL_DEV_URL}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Email: FROM_ADDRESS, Name: name },
        To: [{ Email: mail.to }],
        Subject: mail.subject,
        Text: mail.text,
        HTML: mail.html,
        Headers: mail.headers,
      }),
    });
    return response.ok;
  }
  return false;
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 32 random bytes, URL-safe. Only its hash is ever stored. */
export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Text from people (captions, names) as safe HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function mac(purpose: string, value: string): Promise<Uint8Array> {
  if (!LINK_KEY) throw new Error('MAIL_LINK_KEY is not set');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(LINK_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${purpose}:${value}`)));
}

async function seal(value: string): Promise<string> {
  return Array.from((await mac('unsubscribe', value)).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The sign-in code for one Sunday mail: the same for every retry of that mail, so its content stays the same. */
export async function signinCode(sendId: string): Promise<string> {
  const bytes = await mac('signin', sendId);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Compares without leaking how much of a guess was right. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** "<member>.<seal>": an unsubscribe link that needs nothing stored and never expires. */
export async function unsubscribeToken(member: string): Promise<string> {
  return `${member}.${await seal(member)}`;
}

/** The member id behind a valid unsubscribe token, or null. */
export async function unsubscribeMember(token: string): Promise<string | null> {
  const [member, given] = token.split('.');
  if (!member || !given || !/^[0-9a-f-]{36}$/.test(member)) return null;
  return sameText(await seal(member), given) ? member : null;
}

// Design tokens as plain values: mail apps don't do CSS variables (design/design-system/tokens.json).
export const C = {
  paper: '#F2ECE1',
  card: '#FBF8F2',
  white: '#FFFFFF',
  ink: '#2D1E2F',
  inkMuted: '#5E4D5C',
  bluebird: '#3D6AE0',
  plum: '#7E2048',
  cornflower: '#7393E6',
  lilac: '#D9CFF2',
  butter: '#F7E3A3',
};
// System fonts as in tokens.css; the rounded one is closest to Bagel Fat One where it exists.
export const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const ROUNDED = "'Arial Rounded MT Bold','Arial Black',Arial,sans-serif";
export const SERIF = "Georgia,'Times New Roman',serif";

/**
 * The TeddySteps mail frame: paper, a cornflower band with the wordmark (the header variant),
 * one white card. No images, nothing loads. `preheader` is the line the inbox shows first.
 */
export function frame(title: string, card: string, footer: string, preheader = ''): string {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${title}</title><style>:root{color-scheme:light only;}</style></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};"><tr><td align="center" style="padding:24px 16px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td bgcolor="${C.cornflower}" style="background:${C.cornflower};border:2px solid ${C.ink};border-radius:22px;padding:16px 20px;font-family:${ROUNDED};font-size:26px;line-height:1;font-weight:900;color:${C.paper};text-shadow:1.5px 1.5px 0 ${C.ink};">teddysteps</td></tr>
<tr><td style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
<tr><td style="background:${C.white};border:2px solid ${C.ink};border-bottom-width:6px;border-radius:22px;padding:28px 24px;font-family:${SANS};font-size:16px;line-height:24px;color:${C.ink};">
${card}
</td></tr>
<tr><td style="padding:18px 4px 0;font-family:${SANS};font-size:14px;line-height:21px;color:${C.inkMuted};">${footer}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** The bluebird button, full width with its hard ink drop. */
export function button(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${C.bluebird}" style="background:${C.bluebird};border:2.5px solid ${C.ink};border-bottom-width:6px;border-radius:999px;">
<a href="${href}" style="display:block;padding:16px 20px;text-align:center;font-family:${ROUNDED};font-size:17px;line-height:22px;font-weight:900;color:${C.white};text-decoration:none;">${label}</a>
</td></tr></table>`;
}

export const SIGN_OFF = `<p style="margin:22px 0 0;font-family:'Comic Sans MS','Chalkboard SE',cursive;font-size:18px;color:${C.ink};">Liefs, TeddySteps</p>`;
export const COMPANY = 'Haagen Trade · KvK 97569089 · hallo@teddysteps.nl';
