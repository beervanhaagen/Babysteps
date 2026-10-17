# Photos in family e-mails (F8 Sunday email, postcards)

Status: decided, 17 Oct 2026, confirmed with the stack (Expo web on Vercel, Supabase Frankfurt, Lettermint); see `docs/bouwplan.md`. Reviewed by `tech-architect` (privacy first). Not legal advice.

## Decision

**Photos in the mail follow the family download switch** (M6 "Familie mag foto's bewaren", off by default). A photo in an e-mail is a copy the family can keep, so it gets the same rule as downloading.

- **Switch off (default):** the e-mail has text, the week and the caption, and a button to the family page. There are no photos.
- **Switch on:** the e-mail shows a resized photo through a revocable image link (below). F8 on the canvas shows this variant.
- **Rejected:** photos attached or embedded in the e-mail (CID or base64). Copies would live forever in inboxes and could never be revoked.

## Family page sign-in

- **The code sits after the `#`.** Invite links look like `https://familie.teddysteps.nl/j#<code>`. Browsers never send the part after `#` to a server, so the code never lands in any log, and WhatsApp's link preview only sees `/j`.
- **Swapped once for a cookie.** The page reads the code, removes it from the address bar right away (`history.replaceState`) and sends it in the request body (never the URL) to `/api/claim`. That sets the cookie `__Host-ts` (HttpOnly, Secure, SameSite=Lax, 180 days, renewed on use).
- **Generic link preview.** The Open Graph tags of `/j` never show the child's name or a photo ("Je bent uitgenodigd op TeddySteps", with The Hug), plus `noindex`. The child's name is only in the message text the parent sends.
- **Personal and reusable.** A family member's link works on new devices (Oma's iPad) until the parent revokes it, up to 5 devices. M3 shows "op 2 apparaten" and revokes all sessions at once.
- **E-mail buttons** carry their own sign-in code after the `#`, valid for 7 days and only for that recipient.
- Failed claims are rate-limited per IP; POST requests check the Origin header.

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
  - Derivatives are made once at upload and stored; the endpoint only streams them. Print versions are never served to family. The e-mail image is `small.jpg` (600px).
  - `/e/` is a Vercel rewrite on `familie.teddysteps.nl` to the Supabase function `e-image` (Frankfurt), which checks the token and streams the file itself.
  - Headers: `Cache-Control: private, max-age=3600`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `Content-Disposition: inline`.
  - No shared cache in front of `/e/` (Vercel stores nothing with `private`), so revocation takes effect within an hour on our side.

## Image pipeline (all served images)

- **Re-encode from pixels; don't just strip tags.** Apply the orientation first, then write clean files with no EXIF, XMP, IPTC or embedded thumbnail (an embedded thumbnail can show the uncropped original).
- **Made on the parent's phone** (expo-image-manipulator), so nothing unprocessed leaves the device: `print.jpg` (long edge 3600px; moments marked as an eerste keer up to 6000px; never upscaled), `view.webp` (1280px) and `small.jpg` (600px, for e-mail and grids). Aim for sRGB; if the phone can't convert reliably, an embedded colour profile is allowed. A server function rejects uploads that are not JPEG/WebP, are too large or still carry metadata. A fixed test runs exiftool on the output.
- **Same pipeline everywhere:** the family page, e-mail and share cards all use it.
- **Location:** GPS is removed on the device before upload. We keep only the capture date, which the book needs.

## Token hygiene

- **Logs:** our own code never logs codes or tokens, and tokens are stored only as hashes. Supabase and Vercel log request paths themselves and we can't filter that: they keep them 1 day (Supabase Free) or 7 days (Supabase Pro, Vercel). That is why page codes sit after the `#` (never sent to a server); `/e/` image tokens do appear in platform logs, but only open the photos of one e-mail and expire after 30 days.
- **Page loads:** the family page and the image endpoint send `Referrer-Policy: no-referrer` and load nothing from third parties. Fonts, scripts and images are self-hosted, so no Google Fonts.
- **E-mail provider:** Lettermint B.V. (EU: OVH France, UpCloud Netherlands), with a signed processing agreement, sending from `post.teddysteps.nl`. Two routes: `transactional` (login codes) and `kaartjes` (postcards, Sunday e-mail). **Click and open tracking are off** (Lettermint's default); check this on every route.
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
- **Confirm first.** A family member gets no postcards until they click "Bevestig je e-mailadres", so a typo never sends the child's name (or photos) to a stranger. Bounces and complaints stop all sending to that address.
- **"Liever niet" means no e-mail address.** F2 then doesn't ask for one. The catch: a new device can only join through a new link from the parent.
- **Revoked recipients get no e-mails at all.** Images in their old e-mails show the placeholder.
- **The family page link is personal.** The e-mail says "stuur de mail liever niet door".
- **Frequency** comes from F2: every moment, once a week (Sunday) or never. The default is once a week.
- **Sender:** "Lotte via TeddySteps", with a reply-to that bounces kindly. Hugs and voice notes go through the page.
