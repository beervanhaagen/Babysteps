# Analytics plan (launch)

Status: decided, 17 Oct 2026. Tooling confirmed with the stack (see `docs/bouwplan.md`): Aptabase and Sentry, both in their EU region and both in the app only. Reviewed by `tech-architect` (privacy first). Not legal advice: everything marked "lawyer" is checked by a privacy lawyer before launch.

## Principle: count the loop, never look at the family

We hold photos of babies. Analytics must never see them, and parents must be able to read our whole tracking list and nod. So:

- **No photos, captions, names, e-mail addresses, birth or due dates, free text or contact data in any analytics event.** Only counts, categories and buckets.
- **No session replay, heatmaps, screenshots or autocapture. Ever.** The screen is full of a child's photos.
- **No advertising or Google/Meta SDKs**, no device or advertising IDs, no fingerprinting. On the App Store and Play Store labels this means: tracking "None"; analytics and diagnostics listed as "Not linked to you". Account data, photos and the child's details are listed as "Linked to you" for app functionality, because they are. This keeps our "geen reclame" promise honest.
- **No tracking pixels in e-mails** and no tracker at all on the family web page (F2 to F8). Family activity is counted from our own database.
- Everything is stored in the EU.

## Three layers (ranked choice)

| Layer | What it answers | Tool | Why |
| --- | --- | --- | --- |
| 1. Our own database | The four MVP questions: retention, family love, invites, book list | SQL views over our own tables, aggregated weekly | The database already knows when moments, invites, reactions and sign-ups happen. Nothing leaves our system, and per-family retention needs no tracker. **This is the source of truth.** |
| 2. Anonymous app events | Where parents get stuck: onboarding drop-off, abandoned adds, upload errors, which entry points work | **Aptabase** (EU region; confirm the location in its processing agreement) | No device IDs, no cookies, no persistent user IDs, short-lived session IDs only, IP not stored. SDKs for React Native, Flutter, Swift and Kotlin. Free up to 20,000 events a month, paid plans from $10 a month. |
| 3. Landing page | Which campaigns and sections turn visitors into downloads | **Plausible** (EU, cookieless) | Cookieless web analytics with UTM and goals, so no cookie banner on the landing page. |
| Crashes | What breaks | **Sentry, EU region** (chosen when the organisation is created; can't be changed later), Developer plan. Settings: `sendDefaultPii: false`; no Replay integration; `attachScreenshot` and `attachViewHierarchy` off; touch and console breadcrumbs off; `beforeSend` clears `event.user` (Sentry adds an installation ID) and strips URLs and codes; `beforeBreadcrumb` strips query strings. | App only; nothing on the family page. |

Considered and not chosen:

- **PostHog Cloud EU** (Frankfurt; IP capture is off by default on EU projects). It is a strong all-in-one option with funnels and feature flags. But session replay and autocapture are one setting away, and we don't need cohorts per person, because layer 1 covers that. It is the fallback if Aptabase turns out too limited.
- **Google Analytics / Firebase Analytics.** Rejected: ad ecosystem, data leaves the EU, and it conflicts with "geen reclame, geen algoritme".

## Consent

- We expect layers 2 and 3 to fall under the Dutch exemption for analytics with little or no privacy impact (Telecommunicatiewet art. 11.7a), because they set no cookies, store no identifiers and do not keep IP addresses. **Lawyer:** confirm this, including whether the exemption covers an app SDK as well as cookies. We describe both layers in the privacy statement either way.
- Layer 1 uses data we already hold to run the service. The proposed legal basis is legitimate interest (product improvement, aggregates only). **Lawyer:** confirm it for the privacy statement and the processing register.
- The parent can switch layer 2 off in M6 Privacy en gegevens: "Anoniem meten wat beter kan" (on by default). The choice is stored in `profiles.analytics_opt_out`, so it follows the parent to every device; when it is on, the SDK is never started.
- Family members are never tracked by an SDK.
- Before launch, do a DPIA (privacy impact assessment): we process photos of children at scale, which likely makes it required. **Lawyer:** confirm its scope.
- Keep a processor list with signed processing agreements: Supabase (database, auth, storage, Frankfurt), Vercel (family page and landing), Lettermint (app mail), Expo (EAS Update sees IP and a random installation ID), Apple (APNs, Sign in with Apple), Google (FCM, Google Sign-In), Sentry, Aptabase and Plausible. Several are US companies with EU hosting. **Lawyer:** check the transfer basis (DPF or SCCs) in the DPIA.

## What the MVP has to prove (layer 1, from the database)

Targets are assumptions to test, not facts.

| Assumption (MVP board) | Metric | First target |
| --- | --- | --- |
| Parents keep adding | Share of trails with at least 1 moment in week 4 and in week 8 after sign-up | 40% / 30% |
| Family love keeps parents posting | Share of moments that get a hug or voice note within 24 hours | 70% |
| Sharing brings new parents | Family members joined per trail in week 1; share cards sent per active trail per month; landing visits with `utm_source=card` or `invite` | 2+ / 1+ / tracked |
| Parents will pay for the book | Share of trails active for 8+ weeks that joined the book list; family sign-ups on the book list | 25% |
| **North star** | **Loved trails per week**: trails with a new moment *and* a family reaction in the same week | Grows week on week |

Also watch: time from sign-up to first moment (target: same day for 60%), and the leap card, measured as moments pinned within 7 days of a leap card showing.

Implementation:

- A few SQL views (for example `metrics_weekly`), refreshed nightly by the database's own scheduler.
- They are read under the database role `metrics_reader`, which can only see the views. Supabase's SQL editor runs as admin, so we use either its "Read-only member" role (if our plan has it) or a separate read-only login from a local SQL tool. There is no custom internal page at launch.
- The data model must include `trails.created_at`, `trails.deleted_at`, `moments.created_at`, `moments.trail_week`, `reactions.created_at`, `circle_members.invited_at` and `joined_at`, `parent_invites.sent_at` and `accepted_at`, `circle_members.book_list_at`, `family_visits_daily`, `children.due_date`, and `children.leap_cards_on`. The last one is stored on the server, so the leap metric can be calculated.
- "Share cards per active trail" is the layer-2 total divided by the layer-1 active trails, as a rough ratio only.

## Event list (layer 2, Aptabase)

Naming is `object_action` in snake_case. Allowed properties are listed per event; nothing else may be sent. Buckets: `count_bucket` = 1, 2-3, 4-9, 10+.

| Event | When | Properties |
| --- | --- | --- |
| `app_first_open` | S1 first launch | none |
| `signup_started` | S2 shown | `method` (apple, google, email) |
| `email_code_result` | S3 or S4 submit or resend | `result` (ok, wrong, expired, resent) |
| `signup_completed` | Code verified or SSO done | `method` |
| `child_added` | O2 saved | `born` (yes/no), `due_date_given` (yes/no) |
| `invite_step` | O3 left | `action` (sent, link_copied, skipped) |
| `catch_up_step` | O6 left | `action` (added, skipped), `weeks` (count_bucket) |
| `onboarding_completed` | First T1 after O6 | `skipped_invite` (yes/no), `skipped_catch_up` (yes/no) |
| `photo_permission` | A2 system prompt answered | `result` (full, limited, denied) |
| `moment_add_started` | A1 opened | `source` (tab_plus, empty_slot, sunday_nudge, leap_card, activity) |
| `moment_pinned` | A4 shown | `photos` (count_bucket), `is_first` (yes/no), `has_caption` (yes/no), `week` (current, older) |
| `moment_add_abandoned` | A1 to A3 closed without pinning | `step` (a1, a2, a3) |
| `upload_failed` | X2 or X4 state | `reason` (offline, too_long, server) |
| `upload_retried` | Retry | `how` (auto, manual), `ok` (yes/no) |
| `leap_card_tapped` | T1 card tapped | `leap` (index 1 to 10) |
| `leap_cards_toggled` | M6 switch | `on` (yes/no) |
| `invite_sent` | Any invite | `channel` (whatsapp, contacts, link), `where` (o3, m3) |
| `share_card_sent` | SH2 or X3 | `type` (moment, month), `target` (stories, chat, save, more), `name_hidden` (yes/no), `link_added` (yes/no) |
| `notification_permission` | After A4 prompt | `granted` (yes/no) |
| `nudge_opened` | Opened from a push | `type` (sunday, month_birthday, reaction) |
| `book_list_joined` | B1 "Laat het me weten" | none |
| `feedback_opened` | M1 or X4 feedback link | `where` |
| `app_error` | Handled error shown | `code` |

Onboarding drop-off is read as step counts per week, not per-person funnels; at our volume that is enough. `code` and `where` take values from a fixed list in code, never raw error messages (they can contain e-mail addresses).

Do not add events without updating this file. `design-reviewer` and `tech-architect` reject any event property that could identify a person or a child.

## Landing page goals (layer 3, Plausible)

- `cta_click` with `position` (hero, leaps, book, final), `store_click` with `store` (ios, android), and `faq_open` with `question` (an id, not the text).
- UTM conventions: `utm_source` = card, invite, instagram, tiktok, consultatiebureau, press; `utm_campaign` = launch-nl.

## Retention and rights

- **Raw events:** kept at most 13 months, **if Aptabase lets us set this. Verify before launch**; their privacy policy mentions up to 5 years with no deletion, in which case the privacy statement states their period. Sentry keeps errors 30 days (Developer plan).
- **Deleting a trail:** its rows, photos and derivatives go after the 30-day undo. Supabase database backups (Pro) roll off within 7 days; storage (photos) is not part of those backups. The privacy statement says "binnen 60 dagen volledig verwijderd".
- **Test phase:** while on Supabase Free (no backups), a weekly encrypted backup is kept on the owner's Mac for at most 4 weeks and wiped when we move to Pro. It is listed in the processing register.
- **Family visits:** counted as one daily number per trail. Per person we store only `last_seen_on` (a date), with no visit history; per device `last_used_on` and a rough `device_hint`.
- **Layers 2 and 3** are designed to hold nothing linkable to a person, so there is nothing to delete there.
