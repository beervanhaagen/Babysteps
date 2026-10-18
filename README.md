# TeddySteps

A private baby-memory app for Dutch parents. Product, design and working rules: `CLAUDE.md`. Build plan: `docs/bouwplan.md`.

## Layout

| Path | What |
| --- | --- |
| `apps/mobile` | The parent app (Expo, iOS and Android, Expo Router). The only place where Sentry and Aptabase may be used. |
| `apps/family` | The family page on familie.teddysteps.nl (Expo for web, one page without a router, so it stays light). Deployed to Vercel with `vercel.json`. |
| `packages/ui` | The design system in React Native, same names and props as `design/design-system/components/index.d.ts`. `src/tokens.ts` and `src/art.ts` (the gang, The Hug, icons, doodles) are generated from the design system; fonts are built by `scripts/build-fonts.py`. In development, open the gallery at `/galerij` (app: button on the home screen; family page: `localhost:8081/galerij`). |
| `packages/core` | Shared logic without UI: week counting, texts, types. |
| `supabase` | Local Supabase config; migrations, functions and RLS tests follow. |
| `scripts` | `build-tokens.mjs`, `check-web-bundle.mjs`. |

## Run it

Needs Node 22. For the local database also Docker Desktop and the Supabase CLI.

```sh
npm install
npm run mobile          # parent app: scan the QR code with Expo Go, or press i for the iOS simulator
npm run family          # family page in the browser
supabase start          # local database (Docker must be running)
```

## Checks (the same as CI)

```sh
npm run tokens          # regenerate tokens after changing tokens.json
npm run art             # regenerate the gang, icons and doodles after changing bundle.js
npm run typecheck
npm run lint
npm test
npm run family:export && npm run check:web-bundle
```

`check:web-bundle` fails the build if analytics, crash reporting or Google-hosted fonts ever end up on the family page. Install packages in an app with `npx expo install <package>` (not `npm install`), so versions match the Expo SDK.

## Deploying the family page (once the Vercel account exists)

In Vercel, import the repo with **Root Directory** `apps/family`. `vercel.json` sets the build, the single-page fallback and the security headers (strict CSP, no referrer, noindex). The `/api/*` and `/e/*` rewrites to Supabase are added in step 4, together with the Supabase project's image domain in the CSP.
