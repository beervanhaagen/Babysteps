# Photos in family e-mails (F8 Sunday email, postcards)

Status: proposal, 17 Oct 2026, reviewed by `tech-architect` (privacy first). Confirm with the stack. Not legal advice.

## Decision

**Photos in the mail follow the family download switch** (M6 "Familie mag foto's bewaren", off by default). A photo in an e-mail is a copy the family can keep, so it gets the same rule as downloading.

- **Switch off (default):** the e-mail has text, the week and the caption, and a button to the family page. There are no photos.
- **Switch on:** the e-mail shows a resized photo through a revocable image link (below). F8 on the canvas shows this variant.
- **Rejected:** photos attached or embedded in the e-mail (CID or base64). Copies would live forever in inboxes and could never be revoked.

## Image links (when the switch is on)

- **Separate image token.** Each recipient gets an image token per e-mail. It only serves the photos in that one e-mail and cannot open the family page. It expires after 30 days; after that the image shows the placeholder "Bekijk dit moment op de familiepagina". Revoking a person in M3 kills their page token and all their image tokens at once.
- **URL shape:** `https://familie.teddysteps.nl/e/<image-token>/<moment-id>.jpg`. Moment IDs are random (UUIDv4), never sequential.
- **Checks on every request, in this order:**
  1. The token exists, is not revoked and has not expired.
  2. The moment belongs to the same trail as the token.
  3. The moment is not deleted or pending deletion.
  4. The trail still allows family to keep photos.

  Any failure returns the same neutral placeholder with status 404, so a response never reveals whether a moment exists.
- **Tokens:**
  - At least 128 bits from a cryptographically secure random generator.
  - Stored only as a hash and compared in constant time.
  - Failed lookups are rate-limited per IP.
- **Serving:**
  - Derivatives are made once at upload and stored; the endpoint only streams them. Originals are never served.
  - Headers: `Cache-Control: private, max-age=3600`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `Content-Disposition: inline`.
  - No CDN in front of `/e/`, so revocation takes effect within an hour on our side.

## Image pipeline (all served images)

- **Re-encode from pixels; don't just strip tags.** Apply the orientation first, then write a clean sRGB JPEG of about 600px for e-mail, with no EXIF, XMP, IPTC or embedded thumbnail (an embedded thumbnail can show the uncropped original).
- **Same pipeline everywhere:** the family page, e-mail and share cards all use it.
- **Location:** GPS is removed on the device before upload. We keep only the capture date, which the book needs.

## Token hygiene

- **Logs:** access logs, proxies and crash reports strip or hash the token part of `/e/…` and family-page paths before writing. Raw logs are kept at most 14 days.
- **Page loads:** the family page and the image endpoint send `Referrer-Policy: no-referrer` and load nothing from third parties. Fonts, scripts and images are self-hosted, so no Google Fonts.
- **E-mail provider:** EU-based, with a processing agreement, and with **click tracking and open tracking switched off** at account level. Both are on by default at most providers.
- **No SDKs on the family page:** no crash or analytics SDK runs there; we log server-side errors only.
- **Separate tokens:** unsubscribe and "Wijzig hoe vaak" links use their own single-purpose tokens, never the page token.

## Honest limits

Some mail services fetch our images through their own servers and keep a copy. Apple Mail usually downloads them soon after delivery, even if the e-mail is never opened; Gmail and Outlook.com do it when the e-mail is opened.

- We cannot pull those copies back. Revoking or expiring a link only stops new fetches.
- The e-mail text itself (the child's name, captions) also stays in the mailbox.

The privacy statement says this in plain Dutch, and that is why photos in the mail are off unless the parent allows family to keep photos.

## Other rules

- **No tracking pixels and no open tracking.** Family visits are counted as one daily number per trail. Per person we store only `last_seen_at`, with no visit history.
- **One-click unsubscribe in every e-mail:** "Afmelden", plus the `List-Unsubscribe` and `List-Unsubscribe-Post` headers that Gmail and Yahoo require from bulk senders, and a "Wijzig hoe vaak" link to F2. Whether Dutch rules on commercial e-mail also apply depends on the content (for example a book prompt); the lawyer confirms.
- **Revoked recipients get no e-mails at all.** Images in their old e-mails show the placeholder.
- **The family page link is personal.** The e-mail says "stuur de mail liever niet door".
- **Frequency** comes from F2: every moment, once a week (Sunday) or never. The default is once a week.
- **Sender:** "Lotte via TeddySteps", with a reply-to that bounces kindly. Hugs and voice notes go through the page.
