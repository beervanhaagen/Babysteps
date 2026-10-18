# TeddySteps

A private baby-memory app for Dutch parents. Product, design and working rules: `CLAUDE.md`. Build plan: `docs/bouwplan.md`.

## Layout

| Path | What |
| --- | --- |
| `apps/mobile` | The parent app (Expo, iOS and Android, Expo Router). The only place where Sentry and Aptabase may be used. |
| `apps/family` | The family page on familie.teddysteps.nl (Expo for web, one page without a router, so it stays light). Deployed to Vercel with `vercel.json`. |
| `apps/landing` | The landing page on teddysteps.nl, after `design/brand/TeddySteps-landing.dc.html`. Plain HTML and CSS without any script: `build.mjs` renders the design-system components (`bundle.js`) to HTML at build time. Pages are in `src/` (home and `/privacy`, the privacy promise the family page links to). |
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

Vercel Hobby allows no commercial use, and a page for a product that sells books counts as commercial even without a price, so the page goes public on Vercel Pro (`docs/bouwplan.md` §10, besluit 8). Plausible comes later, with its own entry in `script-src`, in `check-landing.mjs` and in the "Deze website" part of `/privacy`.

`public/og.png` (the WhatsApp and social preview, 1200×630) and `public/apple-touch-icon.png` are screenshots of the design-system components (Wordmark, Hug) on the page's own styles. Remake them by hand if the brand changes.
