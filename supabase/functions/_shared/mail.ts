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

export async function send(mail: Mail): Promise<boolean> {
  const from = `${mail.fromName ?? 'TeddySteps'} <${FROM_ADDRESS}>`;
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
    return response.ok;
  }
  if (MAIL_DEV_URL) {
    const response = await fetch(`${MAIL_DEV_URL}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Email: FROM_ADDRESS, Name: mail.fromName ?? 'TeddySteps' },
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

async function seal(value: string): Promise<string> {
  if (!LINK_KEY) throw new Error('MAIL_LINK_KEY is not set');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(LINK_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`unsubscribe:${value}`)));
  return Array.from(mac.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** "<member>.<seal>": an unsubscribe link that needs nothing stored and never expires. */
export async function unsubscribeToken(member: string): Promise<string> {
  return `${member}.${await seal(member)}`;
}

/** The member id behind a valid unsubscribe token, or null. */
export async function unsubscribeMember(token: string): Promise<string | null> {
  const [member, mac] = token.split('.');
  if (!member || !mac || !/^[0-9a-f-]{36}$/.test(member)) return null;
  return (await seal(member)) === mac ? member : null;
}

/** The TeddySteps mail frame: paper, the wordmark, one white card. No images, nothing loads. */
export function frame(title: string, card: string, footer: string): string {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F2ECE1;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2ECE1;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding:0 4px 20px;font-family:'Arial Black',Arial,sans-serif;font-size:30px;line-height:1;font-weight:900;color:#FF6B8E;text-shadow:2px 2px 0 #7393E6;letter-spacing:-0.5px;">teddysteps</td></tr>
<tr><td style="background:#FFFFFF;border:2px solid #2D1E2F;border-bottom-width:6px;border-radius:22px;padding:28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#2D1E2F;">
${card}
</td></tr>
<tr><td style="padding:18px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#5E4D5C;">${footer}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** The bluebird button, with its hard ink drop. */
export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#3D6AE0;border:2.5px solid #2D1E2F;border-bottom-width:6px;border-radius:999px;">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-family:'Arial Black',Arial,sans-serif;font-size:17px;font-weight:900;color:#FFFFFF;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

export const SIGN_OFF = '<p style="margin:22px 0 0;font-family:\'Comic Sans MS\',\'Chalkboard SE\',cursive;font-size:18px;color:#7E2048;">Liefs, TeddySteps</p>';
export const COMPANY = 'Haagen Trade · KvK 97569089 · hallo@teddysteps.nl';
