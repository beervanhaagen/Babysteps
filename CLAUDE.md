# TeddySteps

(Formerly BabySteps. The repo folder keeps the old name.)

A baby-memory app for **Dutch first-time parents**, launching in the Netherlands first. **All user-facing copy is Dutch (nl-NL).** It turns a baby's first 18 months into a **trail** of **moments**: a parent pins a photo and one line to the right week, and family (Oma, Opa, the cheer squad) follow along and send hugs and voice notes. At 12 months the trail becomes a printed **year book**, which is how we make money. The app is free; growth comes from sharing and family invites.

Emotional goal: parents should feel *"I need this, I love this."* The core feeling we sell: *het eerste jaar gaat zo snel*. Capture every small and big moment, share it only with your own circle (no Instagram, no strangers), see what's coming next, and get a book after year one. Warm, playful, never clinical. The look is a riso-printed nursery picture book with a little gang of animals.

## Where things are

| Path | What |
| --- | --- |
| `design/design-system/` | **The source of truth for the UI.** `README.md` (brand book and rules), `tokens.json` and `tokens.css` (all colours, type, spacing, radii, shadows), `components/bundle.js` + `bundle.css` (29 reference React components on `window.TeddySteps`), `components/index.d.ts` (props), `components/<Name>/README.md` (usage). |
| `design/assets/characters/` | The gang as SVGs (Bo, Tiggy, Bizzy, Puddle, default and happy) and The Hug. |
| `design/screens/` | All 55 app screens as Claude Design boards (`.dc.html`), plus `App-map.dc.html` and `MVP-scope.dc.html`. All boards are in Dutch and are the copy source. Prices on v1.1 and Later boards other than €54,95 are placeholders. |
| `design/brand/` | The design-system board, the character sheet, the Dutch landing page, its rationale (`TeddySteps-landing-rationale.dc.html`) and the business-model research (`Business-model.dc.html`). |
| `apps/`, `packages/`, `supabase/`, `scripts/` | The code: `apps/mobile` (parent app), `apps/family` (family page), `packages/ui` (design system in React Native, tokens generated from `tokens.json`), `packages/core` (shared logic). How to run and check it: `README.md`. |
| `docs/` | `bouwplan.md` (the approved build plan, step order and decisions), `analytics.md` (what we measure and how, privacy first) and `family-email.md` (photos in family e-mails, tokens, image pipeline). Follow them; update them before adding events or e-mail features. |
| `.claude/agents/` | Specialist reviewers: `tech-architect`, `design-reviewer`, `growth-marketer`, `child-development-reviewer`. |
| `design/canvas.json` | Lists every board with its title. Screen titles end in `· Launch`, `· v1.1` or `· Later`. |
| `design_brainstorm/` | Earlier explorations (BabySteps prototype, the four identity directions, direction D). **Not used. Don't build from these.** |

The `.dc.html` boards need the Claude Design runtime to render, so read them as source: the markup shows the layout, inline styles hold exact values, the `<script>` block holds prototype logic and sample copy. When a board and the design system disagree, the design system wins.

## MVP scope (build this first)

Ship one loop: a parent pins a moment, family sends love within a day, the parent comes back next week. See `design/screens/MVP-scope.dc.html`.

**Launch (32 screens):**

- Sign in: S1 Splash, S2 Create account (Apple, Google, email), S3 Email code. S4 Log in uses the same email-code flow.
- Onboarding: O1 Welcome, then 3 steps: O2 Your little one (name, birth date **and due date**), O3 Invite family (skippable), O6 Catch up (skippable). No separate privacy, permissions or "ready" screens: ask for photos when adding and for notifications (system prompt) right after the first pinned moment on A4. M1 "Profiel van Lotte" reuses the O2 form in edit mode: no step bar, button "Opslaan".
- Trail: T1 Trail home (with the "Wat komt eraan" leap card), T2 Moment, T6 Activity, T8 Moment options (edit, delete).
- Adding: A1 What happened? (photos, a first, older weeks; voice memo shown as "binnenkort"), A2 Photos, A3 Details (milestones as tags, no ranges yet), A4 Pinned!
- Family, **as a web page with no app or password**, opened from a WhatsApp invite link: F1 Invite message, F2 Invite accepted (name, e-mail, how often), F3 Postcards, F4 Send love (hug and a voice note), F7 the same page at laptop width, F8 the Sunday email. Family can also join the book list ("Laat het me weten"); no prints at launch.
- Me: M1 Account (with a feedback link), M3 Family and roles, M5 Notifications (one weekly Sunday nudge), M6 Privacy and data (invite-only is fixed, not a switch; one family-wide "mag foto's bewaren" switch, off by default, which also decides whether family e-mails show photos; the "Anoniem meten" opt-out; includes export), M7 Delete.
- Growth: SH2 Share a moment (branded card), X3 Month birthday (shareable card).
- Book: B1 Book home showing the book filling up (weeks, moments, firsts, notes) and a "Laat het me weten" list instead of checkout.
- States: X1 Empty trail, X2 Offline (uploads queue), X4 Upload failed (automatic and manual retry).

**v1.1:** milestone map and ranges (T3, T4, needs reviewed WHO/JGZ content), the full book order flow (B2 cover, B4 preview, B5 review, B6 delivery, B7 iDEAL, B8 order placed), A6 voice memo, T7 month recap, F6 gift a book.

**Later:** T5 all weeks, A5 letter, B3 page editor, B9 books and prints, M2 siblings, F5 family settings, M4 founders screen, SH1 referral credit.

**Where the build differs from the boards** (decided 2026-10-17, see `docs/bouwplan.md` §10): F1's link preview never shows the child's name or photo; T2 has no "Gezien door …" line per person; A1 has no video at launch; M7 becomes "Pad en account verwijderen" (Apple requires account deletion); M5 has no "Nieuws van TeddySteps" at launch; no pinning before birth at launch.

All launch gaps are designed: terms and privacy promise sit on S2, feedback on M1 and X4. Analytics and family e-mail are decided in `docs/analytics.md` and `docs/family-email.md` (items marked "lawyer" still need a privacy lawyer before launch).

## Sprongetjes: "wat komt eraan"

Parents see the next developmental leap on the trail (components `LeapTimeline` and `NextUp`): when it roughly comes, what they might notice, and which moment is worth capturing. This is the weekly reason to open the app.

- Weeks count from the **due date**, not the birth date. Commonly cited leap weeks: around 5, 8, 12, 17, 26, 36, 44, 53, 62, 73.
- Always a rough guide ("rond week 26", "eerder, later of nauwelijks merkbaar"), never a deadline or medical advice; point to the consultatiebureau for worries. The research behind leaps is disputed.
- **Our own words only.** Never use names, titles or text from "Oei, ik groei!"/The Wonder Weeks or any other published leap book or app.
- In the MVP, T1 Trail home gets a "Wat komt eraan" card; the full milestone map stays in v1.1. Have `child-development-reviewer` check all leap content.

## Business model

Free app, growth through each family's own circle (Polarsteps model), revenue from what parents want to keep: the year book (from €54,95), family copies, a kraamcadeau-tegoed friends can give at the kraamvisite, and later small prints. An optional Plus subscription may come later but never locks the core. **No ads**: "geen reclame, geen algoritme" is part of what we sell. Details and sources: `design/brand/Business-model.dc.html`.

## Specialist reviewers

Use the agents in `.claude/agents/` instead of guessing:

- `tech-architect`: before choosing or scaffolding the stack, and to review technical plans and PRs (privacy first).
- `design-reviewer`: after any UI work, before showing it to the owner.
- `child-development-reviewer`: for any sprongetje, milestone or development copy.
- `growth-marketer`: for landing, launch and invite copy (mostly from 6 to 8 weeks before launch).

### Werkwijze per feature (do this automatically, without being asked)

1. **Plan:** for anything new or structural (stack, data model, auth, storage, family view), ask `tech-architect` first and show the owner the plan before building. Skip this for small UI or copy changes.
2. **Build:** you (the main session) build. The agents review; they never build or call each other.
3. **Review:** when the feature works, run `design-reviewer` for any UI change, `tech-architect` for any data, privacy or backend change, and `child-development-reviewer` for any development copy. Run them in parallel.
4. **Fix:** fix every blocking point, then show the owner a short summary: what was built, what the reviewers found, what you fixed, and anything left open for the owner to decide.
5. **Commit** in a small step. Ask before pushing.

Keep it light: no extra agents, no autonomous loops, and at most one review round per feature unless something blocking remains.

## Domains

`teddysteps.nl` is registered at TransIP (DNS is managed there).

- `teddysteps.nl` and `www`: the landing page (Vercel), with Plausible only.
- `familie.teddysteps.nl`: the private family page and the `/e/` image links. No analytics or third-party scripts at all (see `docs/family-email.md`).
- No separate API host: the family page reaches Supabase through rewrites on `familie.teddysteps.nl` (`/api/*`, `/e/*`).
- Human mail (hallo@, feedback@) runs on TransIP Email. App mail (login codes, postcards, the Sunday email) goes from the subdomain `post.teddysteps.nl` through **Lettermint** (EU), with its own SPF, DKIM and DMARC, so problems with app mail never hurt the main domain.
- Never put tokens or personal data in query strings on the landing domain.

## Product rules (non-negotiable)

- **Ranges, not report cards.** Milestones show a typical window, never a deadline or score. Detail screens say "not yet is fine" and point to the consultatiebureau. Ranges can be switched off.
- Weeks count the trail ("Week 31 of 78"); months describe ranges ("4 to 12 months").
- **Private by default:** invite only, stored in the EU, never sold, shared or used to train AI. Family can't download photos unless the parent allows it. Deleting a trail is undoable for 30 days.
- **First names only.** The child's first name may appear anywhere, including on the lock screen in push messages ("Oma Ria stuurde Lotte een knuffel"). We never ask for or actively store surnames. Family members can say how they relate to the child (Oma, Oom, ...) when invited or when they join.
- Free for founding families. Book from €54,95 (euros with a comma). No other prices yet.
- Voice (in Dutch): warm, short, a little cheeky, sentence case, no emoji. "Vastgepind in week 31!", not "Item succesvol opgeslagen."
- Fixed Dutch terms: pad (trail), moment, vastpinnen/vastgepind, knuffel (hug), berichtje (voice note), kaartje (postcard), kring, ouder, familie, jaarboek, sprongetje, mijlpaal, eerste keer. Possessives: "Lottes", but "Noa's", "Timo's", "Max'". Never use the leap books' wording, such as the "huilerig, hangerig, humeurig" trio.

## Design rules in one breath

Paper ground (`paper`), aubergine ink (`ink`) for all text and outlines, **bluebird for every action**, soft blocks (lilac, pistachio, butter, cornflower, sunshine) for headers and cards. Fraunces (SOFT 100, WONK 1) for titles, Bagel Fat One for the logo, buttons and big numbers, Nunito for everything else, Shantell Sans for handwritten notes. Buttons and cards are stickers: ink edge plus a hard, unblurred drop shadow. Every screen header is a soft-block band with a scalloped edge and a character peeking over it. The gang keeps moving (bob, sway, drift, hop) but stops under reduced motion. Focus ring: 3px solid ink, 3px offset. Tap targets at least 44px.

## Working agreements

- Stack chosen (2026-10-17): **Expo (React Native) for iOS, Android and the family web view, Supabase in Frankfurt, Lettermint for app mail**, push straight to APNs/FCM (not Expo's push service). The build plan in `docs/bouwplan.md` is approved, including all its advice and the decisions in its §10; build in its step order.
- Expo changes with every SDK (we're on SDK 58): check the versioned docs at docs.expo.dev instead of memory, add packages with `npx expo install`, and run the checks in `README.md` before calling a step done.
- **Keep running costs as low as possible until the idea has traction**: use free tiers where they are safe and move to paid plans only when usage or safety (backups of real photos) needs it. Agreed: free tiers during the build and test phase; from the official launch Supabase Pro and Vercel Pro (about €39 a month together) are fine.
- Photos: keep a print-quality version (about 3600px) by default; special moments may be stored larger.
- All accounts (Apple, Google, Supabase, Vercel, Lettermint, Expo) belong to Haagen Trade, with two-factor sign-in. The owner already has an Apple developer account.
- Explain changes in plain language; the owner is not a full-time developer.
- Commit in small steps with clear messages, and ask before pushing to GitHub.
