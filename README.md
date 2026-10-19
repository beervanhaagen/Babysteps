# TeddySteps

A private baby-memory app for Dutch parents. Product, design and working rules: `CLAUDE.md`. Build plan: `docs/bouwplan.md`.

## Layout

| Path | What |
| --- | --- |
| `apps/mobile` | The parent app (Expo, iOS and Android, Expo Router). The only place where Sentry and Aptabase may be used. |
| `apps/family` | The family page on familie.teddysteps.nl (Expo for web, one page without a router, so it stays light). Deployed to Vercel with `vercel.json`. |
| `apps/landing` | The landing page on teddysteps.nl, after `design/brand/TeddySteps-landing.dc.html`. Plain HTML and CSS without any script: `build.mjs` renders the design-system components (`bundle.js`) to HTML at build time. Pages are in `src/` (home, `/privacy` with the privacy promise the family page links to, and the 404 page); the build also writes `robots.txt` and `sitemap.xml`. |
| `packages/ui` | The design system in React Native, same names and props as `design/design-system/components/index.d.ts`. `src/tokens.ts` and `src/art.ts` (the gang, The Hug, icons, doodles) are generated from the design system; fonts are built by `scripts/build-fonts.py`. In development, open the gallery at `/galerij` (app: button on the home screen; family page: `localhost:8081/galerij`). |
| `packages/core` | Shared logic without UI: week counting, texts, types. |
| `supabase` | Local Supabase config; migrations, functions and RLS tests follow. |
| `scripts` | `build-tokens.mjs`, `build-art.mjs`, `build-fonts.py`, `check-web-bundle.mjs`, `check-landing.mjs`, `local-env.mjs`, `family-dev.mjs`. |

## Run it

Needs Node 22. For the local database also Docker Desktop and the Supabase CLI.

```sh
npm install
npx supabase start      # local database, auth and mail catcher (Docker Desktop must be running)
npm run local-env       # points the app at it (writes apps/mobile/.env.local, not committed)
npm run mobile          # parent app: scan the QR code with Expo Go on a phone on the same Wi-Fi
npm run family          # family page (Expo web dev server on 8081)
npm run family:dev      # the family page with its API on http://localhost:8090, as on familie.teddysteps.nl
npm run landing         # builds teddysteps.nl and serves it on http://localhost:8095
```

Invite links from the app open the family page on this Mac's address (port 8090), so a phone on the same Wi-Fi can follow them. Family sign-in, photo links and hugs go through the edge function `supabase/functions/family-api`.

Local Supabase uses ports 554xx, so it can run next to other local Supabase projects. Login codes don't leave your Mac: read them in the mail catcher at http://127.0.0.1:55324. The database dashboard is at http://127.0.0.1:55323. `npx supabase db reset` starts the local database fresh from the migrations.

## Checks (the same as CI)

```sh
npm run tokens          # regenerate tokens after changing tokens.json
npm run art             # regenerate the gang, icons and doodles after changing bundle.js
npm run typecheck
npm run lint
npm test
npx supabase test db    # privacy tests on the database (local Supabase must be running)
npm run family:export && npm run check:web-bundle
npm run landing:build && npm run check:landing
```

`check:landing` fails if the landing page gets a script or loads anything from another host. `check:web-bundle` fails the build if analytics, crash reporting or Google-hosted fonts ever end up on the family page. Install packages in an app with `npx expo install <package>` (not `npm install`), so versions match the Expo SDK.

## Deploying the family page (once the Vercel account exists)

In Vercel, import the repo with **Root Directory** `apps/family`. `vercel.json` sets the build, the single-page fallback and the security headers (strict CSP, no referrer, noindex). Once the Supabase project exists, add to `vercel.json`: a rewrite of `/api/:path*` to `https://<project>.supabase.co/functions/v1/family-api/:path*` (and `/e/:path*` in step 7), and the project's exact host to `img-src` in the CSP. On Supabase set the edge-function secret `FAMILY_ORIGIN=https://familie.teddysteps.nl`.

## Deploying the landing page

In Vercel, add a second project from the same repo: **Root Directory** `apps/landing`, Framework Preset "Other", and keep "Include files outside the Root Directory" on (the build reads `design/design-system`). `vercel.json` sets the build and the security headers (no scripts at all, no cookies). Turn off Web Analytics, Speed Insights and the Vercel Toolbar, for production and previews. Point `teddysteps.nl` at it in TransIP and let `www` redirect to it (308).

Vercel Hobby allows no commercial use. The owner keeps the page on Hobby while it isn't promoted anywhere and the app is free; move to Vercel Pro at the latest when the page is promoted, shows a price or the app launches (`docs/bouwplan.md` §10, besluit 8). Plausible comes later, with its own entry in `script-src`, in `check-landing.mjs` and in the "Deze website" part of `/privacy`.

`public/og.png` (the WhatsApp and social preview, 1200×630) and `public/apple-touch-icon.png` are screenshots of the design-system components (Wordmark, Hug) on the page's own styles. Remake them by hand if the brand changes.

## Pre-registration (teddysteps.nl)

"Hou me op de hoogte" and "Ik wil meetesten" are one plain form, without any script: it posts to `/api/aanmelden`, Vercel passes that to the edge function `supabase/functions/waitlist` (Supabase, Ireland), and every answer is a redirect to a static page (`/aangemeld`, `/bevestigd`, …). Double opt-in: the mail links to `teddysteps.nl/bevestig/<code>` (the code in the path, only its hash stored), and that page has a "Ja" and a "wis" button, so a mail scanner opening the link confirms nothing. The link from the mail keeps working as a "wis mijn adres" link after confirming.

Stored in `private.waitlist` (not reachable through the Data API): the address, whether someone wants to test, and optionally the month the baby was born or is due (only for testers). Unconfirmed addresses go 7 days after the last mail, everyone after 12 months at the latest (`private.waitlist_cleanup`, daily via pg_cron). Limits: 5 attempts per IP per 10 minutes (IP only as an HMAC, kept an hour; it can be faked by calling the function directly), 300 attempts an hour, 150 confirmation mails a day, 3 mails per address.

The form only appears when `apps/landing/vercel.json` has the rewrite to the function; without it the page keeps the mailto buttons (`src/signup.mjs`, `SIGNUP_ON`).

**Locally:**

```sh
npx supabase start
SIGNUP=local npm run landing       # form on, posting to the local function; mails land in Mailpit (http://127.0.0.1:55324)
node scripts/check-waitlist.mjs    # end-to-end: sign up, mail, confirm, wipe, limits
npx supabase test db
```

**Going live** (needs the hosted Supabase project and Lettermint):

1. Supabase project `TeddySteps` (ref `rzckkognfzjxlvymmgrr`, eu-west-1 Ireland; done 19 October). `npx supabase link`, `npx supabase db push`. Check `select jobname, schedule from cron.job;`.
2. Secrets `IP_HASH_KEY` (`openssl rand -hex 32`), `LANDING_ORIGIN=https://teddysteps.nl`, `MAIL_FROM=TeddySteps <hallo@post.teddysteps.nl>` and `LETTERMINT_API_TOKEN`. **Careful:** `npx supabase secrets set` also uploads the local values under `[edge_runtime.secrets]` in `config.toml`; afterwards run `npx supabase secrets unset MAIL_DEV_URL PUBLIC_SUPABASE_URL FAMILY_ORIGIN` (or set tokens in the dashboard under Edge Functions → Secrets). Never leave `MAIL_DEV_URL` online. `family-api` needs `IP_HASH_KEY` too.
3. `npx supabase functions deploy waitlist` (and `family-api`); in the dashboard "Enforce JWT" stays off for both.
4. Lettermint: `post.teddysteps.nl` verified (SPF, DKIM, DMARC, return-path at TransIP), the project's default transactional route (slug `outgoing`; set `LETTERMINT_ROUTE` for another) with open and click tracking off (otherwise the confirmation link is rewritten) and "Hide email content" on, a token for this project only.
5. Processing agreements with Supabase, Vercel and Lettermint.
6. In `apps/landing/vercel.json`: add the rewrites below (with the project ref) and change `form-action 'none'` to `form-action 'self'` in the CSP. `npm run landing:build && npm run check:landing` must pass.

   ```json
   "rewrites": [
     { "source": "/api/aanmelden", "destination": "https://REF.supabase.co/functions/v1/waitlist/aanmelden" },
     { "source": "/bevestig/:code", "has": [{ "type": "header", "key": "content-type" }], "destination": "https://REF.supabase.co/functions/v1/waitlist/bevestig/:code" },
     { "source": "/bevestig/:code", "destination": "/bevestig" }
   ]
   ```

7. Test once on production: your own address (mail arrives, not in spam), opening the link confirms nothing, "Ja" gives `/bevestigd`, a second address with "wis" gives `/gewist`, and only those rows are in the table. Sign up once over Wi-Fi and once over 4G: the two `ip_hash` values must differ, or the IP limit hits everyone at once.

**Switching it off:** remove the rewrites and set `form-action` back to `'none'`; the form disappears and the mailto buttons return.

**Day to day:** export confirmed addresses (and testers by `baby_month`) from the table editor. Wipe someone by hand after a mail to hallo@: `delete from private.waitlist where email = lower(btrim('…'));`. After the launch mail (one per person, with a way to unsubscribe, no tracking), wipe the list. "limit reached" in the function logs means the limits are being hit.
