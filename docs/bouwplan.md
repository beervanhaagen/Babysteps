# TeddySteps: bouwplan voor de launch-scope

Opgesteld door `tech-architect` op 17 oktober 2026. Stack: Expo (React Native) + Supabase Frankfurt + Lettermint. Prijzen en limieten gecontroleerd op 17 oktober 2026 (bronnen onderaan); wat niet gecontroleerd kon worden, staat erbij.

**Status:** goedgekeurd door de eigenaar op 17 oktober 2026, met alle adviezen. De besluiten staan in §10.

## 0. In het kort

- **Eén repo met twee apps en één gedeelde ontwerpbibliotheek.** `apps/mobile` is de ouder-app (iOS en Android). `apps/family` is alleen web, op familie.teddysteps.nl. Ze delen `packages/ui` (het ontwerpsysteem in React Native) en `packages/core` (weekberekening, teksten, types). Sentry en Aptabase zitten alleen in `apps/mobile`; een automatische controle (CI) laat de bouw falen zodra ze in de webbundel opduiken.
- **Foto's worden op de telefoon verkleind.** Kost niets en de GPS-gegevens gaan er meteen af. Per foto drie bestanden: print (3600px, bij een eerste keer tot 6000px), kijkversie (1280px) en klein (600px).
- **Familie werkt zonder account.** De code in de WhatsApp-link staat achter een `#` en wordt één keer omgeruild voor een httpOnly-cookie. Al het familieverkeer loopt via één serverfunctie; familie raakt de database nooit rechtstreeks.
- **De gratis fase heeft twee gaten:** Supabase Free heeft geen back-ups en maar 1 GB opslag (~300 foto's). Oplossing zonder kosten: hooguit 5 bekende testgezinnen, een wekelijkse back-up op de Mac van de eigenaar en de export vroeg bouwen.
- **Grootste variabele kosten bij groei:** e-mail en de opslag van printversies. Ongeveer €0,13 per actief gezin per maand bij 1.000 gezinnen, €0,07 bij 10.000.

## 1. Gecontroleerde limieten en risico's van de gratis fase

| Dienst | Gratis | Betaald (vanaf launch) | Gevolg voor ons |
|---|---|---|---|
| **Supabase** | 500 MB database, **1 GB opslag**, 5 GB verkeer (+5 GB uit cache), 50.000 MAU, 500.000 functie-aanroepen, **geen back-ups**, **pauze na 1 week zonder activiteit**, logs 1 dag | Pro $25/mnd incl. $10 rekentegoed, 8 GB database, 100 GB opslag (daarna $0,0213/GB), 250 GB verkeer (daarna $0,09/GB), dagelijkse back-up 7 dagen, logs 7 dagen | 1 GB ≈ 300 foto's. **Back-ups dekken alleen de database, nooit de foto's**, ook op Pro. |
| **Vercel** | Hobby: 100 GB verkeer, 1 mln functie-aanroepen. **Alleen niet-commercieel gebruik**, ook "advertising the sale of a product or service". | Pro ~$20/mnd (niet opnieuw gecontroleerd) | Een openbare landingspagina met een prijs is volgens Vercel al commercieel. |
| **Expo (EAS)** | 15 iOS- en 15 Android-builds/mnd (lage voorrang), **Update: 1.000 MAU** | Starter $19/mnd: 3.000 MAU, daarna $0,005 per MAU | ~500 gezinnen is de grens van gratis updates zonder review. |
| **Lettermint** | **300 mails/mnd**, 1 domein | €10 voor 10.000; €40 voor 50.000; €175 voor 300.000 | Tracking standaard uit, per route in te stellen. Servers bij OVH (FR) en UpCloud (NL). DPA met Lettermint B.V. |
| **Aptabase** | 20.000 events/mnd | $10 voor 200.000 | EU-regio. Bewaartermijn nog navragen. |
| **Sentry** | 1 gebruiker, 5.000 fouten/mnd, 30 dagen | Team $29/mnd | EU-regio kies je bij het aanmaken; later wisselen kan niet. Replays nooit aanzetten. |

**Risico's van de gratis fase, en hoe we ze bijna kosteloos afdekken**

| Risico | Maatregel (€0) |
|---|---|
| Geen back-ups: een foute migratie of delete en echte babyfoto's zijn weg. | Wekelijkse back-up op de Mac van de eigenaar (`supabase db dump` + `rclone sync` van de opslag) naar een versleutelde schijfkopie, 4 weken bewaren, wissen zodra Pro draait. "Alles downloaden" (M6) al in stap 4. |
| 1 GB opslag is snel vol. | Maximaal 5 testgezinnen die we persoonlijk kennen, maximaal ~8 weken. Bij 700 MB naar Pro. |
| Project pauzeert na 1 week zonder activiteit. | Alleen tijdens het bouwen met nepdata; bouwen gebeurt lokaal. |
| Testers denken dat het al "echt" is. | Korte afspraak: "testversie, bewaar je foto's ook op je telefoon". |

Advies architect: Supabase Pro zodra het eerste gezin meedoet dat we niet persoonlijk kennen, of bij 700 MB, of bij de launch: wat het eerst komt. Op Pro de spend cap bewust instellen en een budgetwaarschuwing aanzetten.

## 2. Architectuur

```
  Ouder-telefoon (Expo-app, iOS/Android)            Familie-browser (oma, oud toestel)
  - verkleint foto's zelf, wachtrij in SQLite        familie.teddysteps.nl  (Vercel, alleen statische bestanden)
  - Sentry EU + Aptabase EU (uit te zetten)          - geen SDK's, eigen lettertypes, strenge CSP
  - push-token rechtstreeks van Apple/Google         - /api/* en /e/* -> Vercel stuurt door (zelfde domein = cookie werkt)
            | HTTPS, eigen login (JWT)                          |
            v                                                   v
  +----------------------- Supabase, Frankfurt (eu-central-1) -----------------------+
  | Auth: e-mailcode, Apple, Google  |  Postgres + RLS  |  Opslag: privé-buckets       |
  | Functies: family-api, e-image, push, mail, purge, scrub-identity, unsubscribe    |
  | pg_cron + wachtrij: zondag-jobs, vertraagde meldingen, wissen na 30 dagen        |
  +----------------------------------------------------------------------------------+
            |                    |                         |
        APNs (Apple)        FCM (Google)        Lettermint (EU) vanaf post.teddysteps.nl
```

Begrippen. **RLS**: regels in de database die per rij bepalen wie iets mag lezen of schrijven. **Functie**: klein stukje servercode bij Supabase. **CSP**: lijst in de browser van wat de pagina mag laden; de rest wordt geblokkeerd.

| Keuze | Gekozen | Waarom |
|---|---|---|
| Repo-opbouw | Twee apps (mobiel en familie-web) plus gedeelde pakketten, in één repo | De familiebundel bevat alleen familiecode: klein, snel op oude telefoons, en kan nooit Sentry of Aptabase meenemen. |
| Familie-API | Vercel stuurt `familie.teddysteps.nl/api/*` door naar een Supabase-functie (in Frankfurt via `forceFunctionRegion`) | Logica op één plek, cookie op het familiedomein, geen extra kosten. **Eerst testen** of `Set-Cookie` door de doorverwijzing komt; reserve: Vercel-functies in Frankfurt. |
| Foto's verkleinen | Op de telefoon (expo-image-manipulator) | Gratis, GPS verlaat de telefoon nooit, werkt op een trage verbinding. |

**Afwijking na meting in stap 0 (17 oktober 2026):** met Expo Router was de familiepagina al 292 KB (gzip) voor een lege pagina, boven het doel van 200 KB. Zonder Router is hij 107 KB. Daarom is `apps/family` één webpagina zonder Router (`web.output: "single"`, eigen `public/index.html`) met dezelfde React Native-onderdelen uit `packages/ui`. De paar weergaven (uitnodiging, kaartjes, liefde sturen) kiezen we zelf op basis van het adres. De HTML heeft geen inline scripts, dus de CSP is `script-src 'self'`. De ouder-app houdt Expo Router.

**Openstaand uit de review van stap 0 (tech-architect, 17 oktober 2026)**

Al opgelost: `vercel.json` stuurt `/api`, `/e` en `/_expo` niet meer naar de HTML en geeft elk pad de juiste Cache-Control; `graphql_public` staat niet meer open; de bundelcontrole werkt met een lijst toegestane adressen en faalt als `script-src` of `connect-src` iets anders dan `'self'` wordt; meer trackers in de lintregel; meer soorten geheimen in `.gitignore`.

Nog te doen, per stap:
- **Vóór de eerste migratie (stap 1–2):** Supabase CLI bijwerken en dezelfde versie in CI vastzetten; `pg_graphql` uitzetten in de eerste migratie; RLS aan op elke tabel, met een CI-controle die faalt op een `public`-tabel zonder RLS; bij het hosted project "nieuwe tabellen automatisch blootstellen" uit, regio Frankfurt, AI-gegevensdeling uit; GitHub Actions vastzetten op commit-SHA.
- **Stap 2 (`[auth]` in config.toml):** `otp_expiry = 600`, `max_frequency = "60s"`, `enable_confirmations = true`, site_url en redirect-URL's alleen het app-schema, SMTP via Lettermint. Per bucket een maximale bestandsgrootte en toegestane types. `seed.sql` alleen met nepdata.
- **Cookietest en stap 4:** `[functions.family-api]` en `[functions.e-image]` krijgen `verify_jwt = false` (de functie controleert zelf de cookie). Cookie `__Host-ts` met `Secure`, `Path=/`, zonder `Domain`. Bij POST `Origin` en `Sec-Fetch-Site` controleren. Codes minstens 128 bits. In de familiepagina de `#` lezen en wissen vóór de eerste render en vóór elke fetch. Een eigen klein routeringshookje (`pathname`, `pushState`, `popstate`, focus en `document.title` per weergave). In de CSP alleen de exacte Supabase-host bij `img-src` en `media-src`, nooit `*.supabase.co`; `connect-src` blijft `'self'` (berichtjes uploaden via `/api`). `og:image` (De Knuffel, absolute URL) toevoegen. Body laten scrollen in plaats van alleen een ScrollView. Lettertypes als woff2, Latin-subset, zelf gehost.
- **Vercel-project aanmaken:** Web Analytics, Speed Insights en de Vercel Toolbar uit, voor productie én previews.
- **Testfase-back-ups:** de versleutelde schijfkopie buiten `~/Documents` en `~/Desktop` bewaren, want die kunnen via iCloud gesynchroniseerd worden.
- **npm audit:** alle meldingen zitten in Expo's bouwgereedschap, niet in de app of de pagina. Niet `npm audit fix --force` draaien; Expo-patches volgen met `npx expo install --fix`.

**Repo-indeling**

```
apps/mobile/          Expo-app voor ouders. Alleen hier: @sentry/react-native, @aptabase/react-native
apps/family/          Expo, alleen web, statische export -> Vercel. vercel.json: doorverwijzingen, headers, CSP
packages/ui/          Ontwerpsysteem in React Native (react-native-svg, Reanimated), tokens uit tokens.json, lettertypes
packages/core/        Weekberekening, sprongetjes-inhoud, Nederlandse teksten, types, invoercontrole
supabase/migrations/  SQL: tabellen, RLS, cron
supabase/functions/   serverfuncties
supabase/tests/       RLS-tests (pgTAP)
scripts/              check-web-bundle, backup-testfase
.github/workflows/    typecheck, lint, RLS-tests, webbundelcontrole
```

**Analytics en Sentry uit de webbundel houden (vier sloten):**
1. Geen dependency in `apps/family`.
2. Lintregel (`no-restricted-imports`) verbiedt `@sentry/*` en `@aptabase/*` in `packages/*` en `apps/family`. `packages/ui` meldt fouten via een callback die alleen de app invult.
3. Na elke webbuild zoekt CI in `apps/family/dist` naar "sentry", "aptabase", "googleapis" en "gstatic"; gevonden = bouw faalt.
4. CSP op familie.teddysteps.nl: `default-src 'self'; img-src 'self' blob: https://<project>.supabase.co; media-src` (idem); `connect-src 'self'; frame-ancestors 'none'`. Nog testen of de Expo-export inline scripts nodig heeft.

## 3. Datamodel voor de launch-schermen

Alle tabellen hebben RLS aan; de rol `anon` mag niets. Tabellen met geheime codes staan in een apart schema `private`.

| Tabel | Belangrijke kolommen | Opmerking |
|---|---|---|
| `profiles` (ouders) | `id`, `first_name`, `analytics_opt_out`, `notify_sunday`, `notify_reactions`, `notify_month` | Geen achternaam-kolom. |
| `trails` | `id`, `created_at`, `family_may_keep_photos` (standaard false), `paused_at`, `delete_requested_at`, `purge_after` (+30 dagen), `deleted_at` | M6-schakelaar "mag foto's bewaren". |
| `children` | `trail_id`, `first_name`, `birth_date` (leeg bij "Nog onderweg"), `due_date` (verplicht), `avatar_path`, `leap_cards_on` | |
| `trail_parents` | `trail_id`, `user_id`, `joined_at` | Rol "ouder". |
| `parent_invites` | `trail_id`, `email`, `sent_at`, `accepted_at` | Medeouder via e-mail; inloggen met dat adres = lid. |
| `circle_members` (familie) | `id`, `trail_id`, `label` ("Oma Ria"), `relation` (oma, opa, oom, tante, vriend, vriendin, peetoom, peettante, anders; mag leeg), `email` (leeg bij "Liever niet"), `email_confirmed_at`, `email_frequency` (each/weekly/never, standaard weekly), `invited_at`, `joined_at`, `revoked_at`, `last_seen_at`, `book_list_at` | Relatie bij O3 (ouder) of F2 (familie). |
| `private.access_keys` | `circle_member_id`, `kind` (invite, email_signin, image, unsubscribe), `token_hash`, `expires_at`, `revoked_at`, `email_id` | 32 willekeurige bytes, alleen de hash bewaard. |
| `private.family_sessions` | `circle_member_id`, `token_hash`, `device_hint`, `created_at`, `last_used_on` (alleen datum), `revoked_at` | Max. 5 per persoon; "op 2 apparaten" in M3. |
| `moments` | `id`, `trail_id`, `created_by`, `client_id` (uniek, tegen dubbelen), `trail_week`, `happened_on`, `caption`, `story`, `is_first`, `milestone_key`, `status`, `ready_at`, `deleted_at` | |
| `moment_photos` | `moment_id`, `trail_id`, `position`, `taken_at`, `width`, `height`, `print_long_edge`, `print_path`, `view_path`, `small_path`, `print_uploaded_at` | Max. 10 per moment. |
| `reactions` | `moment_id`, `trail_id`, `circle_member_id` of `user_id`, `kind` (hug/voice), `voice_path`, `duration_s` (≤60), `created_at`, `seen_at` | Max. 10 knuffels per persoon per moment. |
| `book_list` | `trail_id`, `user_id` of `circle_member_id`, `joined_at` | B1 en F4. |
| `device_tokens` | `user_id`, `platform`, `token`, `last_seen_at` | Pushcode van Apple/Google. |
| `outbox` | soort, payload, `run_after` | Meldingen, mails, wissen. |
| `family_visits_daily` | `trail_id`, `day`, `count` | Eén getal per dag per pad, geen bezoekgeschiedenis per persoon. |
| Views | `moment_weeks`, `metrics_weekly` | |

**Weken:** `trail_week` telt vanaf de geboorte (zo staat het in O2). De sprongetjesweek komt uit `due_date`. Datums zijn `date` in Europe/Amsterdam. Zie open vraag 1.

**Wie mag wat**
- **Ouders** van een pad lezen en schrijven alles van dat pad; andere paden zien ze nooit.
- **Een pad dat verwijderd wordt** verdwijnt meteen voor iedereen, behalve voor "Toch bewaren" van de ouder.
- **Familie heeft geen database-login.** De functie `family-api` controleert de cookie en geeft alleen: voornaam kind en ouder, momenten die klaar zijn, tijdelijke links (1 uur) naar kijk- en kleine versies, en de eigen reacties. Familie kan schrijven: knuffel, berichtje, eigen label/relatie/e-mail/frequentie, boeklijst, afmelden.
- **Opslag:** privé-buckets `print` (alleen ouders, export en boek), `view`, `voice`, `avatars`. Uploaden alleen onder de eigen `trail_id`.
- **De service-role-sleutel** staat alleen in serverfuncties, nooit in een app.
- **Cijfers bekijken:** rol `metrics_reader` ziet alleen de views.
- **`family_may_keep_photos`** regelt de knop "Bewaren" op de familiepagina, foto's in de mail en controle 4 van `/e/`.

**30 dagen ongedaan maken:** M7 zet `delete_requested_at` en `purge_after`; familiesessies en codes worden meteen ingetrokken, mails en push stoppen. Een dagelijkse cronjob wist daarna eerst de bestanden, dan de rijen. Momenten verwijderen (T8) werkt net zo.

**Export (M6 "Alles downloaden"):** op de telefoon. De app downloadt printversies, berichtjes, `momenten.json` en een leesbare `momenten.html` (bestandsnamen als `week-31_2026-05-03_1.jpg`), maakt een zip en opent het deelmenu.

## 4. Stromen

**Foto's**
1. A2: systeemkiezer (op iOS geen toestemming voor de hele bibliotheek nodig). Opnamedatum naar `taken_at`.
2. Op de telefoon, opnieuw opgeslagen vanuit de pixels (zonder EXIF/GPS): `print.jpg` (3600px, eerste keer tot 6000px, nooit groter dan het origineel), `view.webp` (1280px), `small.jpg` (600px, ook voor e-mail).
3. In de wachtrij (SQLite). A4 "Vastgepind in week 31!" verschijnt meteen, ook offline.
4. Uploadvolgorde: small, view, moment op `ready`, dan print (hervatbaar via TUS, automatisch opnieuw, op de achtergrond waar mogelijk).
5. Lokale kopie pas weg als de print binnen is. Een vaste test (exiftool) bewijst dat er geen metadata meer in zit.

**Familiepagina**
1. O3/M3: ouder kiest label en relatie; functie maakt een code, bewaart de hash en geeft één keer `https://familie.teddysteps.nl/j#<code>` terug, via het deelmenu naar WhatsApp.
2. WhatsApp ziet alleen `/j`; het linkvoorbeeld is algemeen, zonder naam of foto.
3. De pagina leest de `#`, haalt hem uit de adresbalk en stuurt de code in de body naar `/api/claim`, die cookie `__Host-ts` zet (HttpOnly, Secure, SameSite=Lax, 180 dagen, verlengt zich). Daarna F2.
4. `last_seen_at` hooguit één keer per dag bijwerken.
5. M3 "Intrekken" werkt direct.
6. De persoonlijke link werkt op nieuwe toestellen tot hij wordt ingetrokken (max. 5).
7. Knoppen in e-mails hebben een eigen inlogcode achter de `#`, 7 dagen geldig.
8. Beperking per IP op mislukte pogingen en Origin-controle op POST.

**E-mail**
- Inlogcodes via Supabase Auth met Lettermint SMTP, route `transactional`.
- Kaartjes via route `kaartjes`, tracking uit.
- Familie krijgt pas kaartjes na "Bevestig je e-mailadres".
- Per moment: 15 minuten nadat het moment klaar is.
- Zondag (F8): versturen op zondagochtend Amsterdamse tijd; geen nieuwe momenten, geen mail.
- Afmelden met één klik (`List-Unsubscribe`). Bounces en klachten zetten het adres op stop.
- Foto's alleen als `family_may_keep_photos` aan staat, via `/e/<beeldcode>/<moment-id>.jpg`.

**Push**
- Na de eerste pin op A4: systeemvraag, daarna de eigen pushcode van Apple/Google naar `device_tokens`.
- Gebeurtenissen gaan via de `outbox`; de functie `push` stuurt rechtstreeks naar APNs en FCM.
- Knuffels binnen 5 minuten samengevoegd ("3 knuffels voor Lotte"). Stille uren 22.00–07.00.
- Tekst: "Oma Ria stuurde Lotte een knuffel". Nooit een bijschrift of foto.
- Firebase alleen voor FCM, zonder Google Analytics. Eerst testen: APNs vanuit Supabase.

**Berichtjes (F4):** opnemen in de browser, max. 60 seconden en 1 MB. Eerst testen in iPhone Safari en Android Chrome, en afspelen in beide apps.

## 5. Speciale momenten groter bewaren

- **Voorstel:** automatisch elke foto in een moment dat als "Een eerste keer!" gemarkeerd is. Geen extra schakelaar bij de launch.
- **Groter:** volle resolutie tot 6000px langste kant (meestal 4032–5712px). 3600px is precies A4 op 300 dpi; eerste keren worden vaak een hele, bijgesneden pagina.
- **Effect:** ~6,2 MB in plaats van ~3,0 MB per foto; ongeveer 13% meer opslag.
- **Beperking:** achteraf als eerste keer markeren maakt de foto niet groter.

## 6. Kosten per maand (ruwe schatting, maand 12)

Aannames: 25 foto's per actief gezin per maand, ~5 familieleden, ~100 MB verkeer per gezin per maand.

| Post | Bouw/test | 1.000 gezinnen | 10.000 gezinnen |
|---|---|---|---|
| Supabase | €0 | ~$46 | ~$300–335 |
| Vercel | €0 | $20 | $20 |
| Lettermint | €0 | €40 | ~€235 |
| Expo (EAS Update) | €0 | $19 | ~$84 |
| Aptabase / Sentry | €0 | $10 / €0 | $20–40 / $29 |
| **Totaal** | **€0** | **~€125 (~€0,13 per gezin)** | **~€650–700 (~€0,07 per gezin)** |

Daarnaast Apple €99/jaar en Google $25 eenmalig. Boven ~5 TB loont het om `print` naar goedkopere EU-opslag te verhuizen. Supabase maakt geen back-up van de opslag: na de launch een wekelijkse kopie van `print` naar koude EU-opslag (een paar euro per maand).

## 7. Bouwvolgorde

S = ≤1 dag, M = 2–4 dagen, L = 1–2 weken. Totaal ongeveer 8–11 weken tot indiening in de stores.

| # | Stap | Wat de eigenaar ziet of test | Formaat |
|---|---|---|---|
| 0 | Repo-skelet, lokale Supabase, CI met bundelcontrole, lege familiepagina live met headers en CSP. Tests vooraf: cookie via Vercel-doorverwijzing, APNs vanuit Supabase. | Een TeddySteps-pagina met een A-score op securityheaders.com. | M |
| 1 | Ontwerpsysteem in React Native: tokens, lettertypes, ~14 onderdelen voor de kernlus. | Een galerijscherm op de telefoon en in de browser, naast de borden. | L |
| 2 | S1–S3, O1, O2: inloggen (mailcode, Apple, Google), naamgegevens wissen, kind met geboorte- en uitgerekende datum. | TestFlight: inloggen en "Lotte" aanmaken; geen achternaam in de database. | M |
| 3 | **Kernlus ouder:** A1–A4, T1, T2, verkleinen, wachtrij, uploads, X2. | Foto vastpinnen in <10 s, ook met wifi uit. | L |
| 4 | **Kernlus familie:** O3/M3 link delen, F2, F3, F4 knuffel, T6. Plus "Alles downloaden". | Je moeder krijgt een WhatsApp-link, ziet het moment en stuurt een knuffel; jij ziet die in de app. | L |
| 5 | Push: toestemming na A4, knuffelmelding, stille uren. | "Oma Ria stuurde Lotte een knuffel" op je vergrendelscherm. | M |
| 6 | Berichtjes van familie en afspelen in T2. | Oma spreekt 10 seconden in, jij hoort het. | M |
| 7 | Familiemail: bevestigen, per moment, zondagmail F8, afmelden, `/e/`-foto's, F7 laptopbreedte. | Zondagmail in Gmail en Apple Mail. | M–L |
| 8 | Ik: M1, M3, M5, M6 (met export), M7 + 30 dagen. | Pad verwijderen, terugzetten, oma meteen geen toegang. | L |
| 9 | Rest: O6, T8, A3 tags + eerste keer groot, X1/X4, "Wat komt eraan"-kaart, SH2/X3 deelkaarten, B1 + boeklijst. | Alle 32 schermen klikbaar. | L |
| 10 | Afmaken: Sentry, Aptabase-events, metrics-views, RLS-tests, beperkingen, toegankelijkheid, reviews. | Testgroep van ≤5 gezinnen. | M |
| 11 | Launch: Pro-plannen, back-ups, DPA's, juristpunten, privacylabels, indienen. | Goedgekeurd in beide stores. | M |

Let op: React Native ondersteunt de variabele assen SOFT en WONK van Fraunces niet. In stap 1 maken we vaste versies (SOFT 100, WONK 1); controleren of de OFL-licentie een "Reserved Font Name" heeft.

## 8. Wijzigingen in de docs

**docs/family-email.md**
1. Statusregel: bevestigd met de stack, 17 okt 2026.
2. Nieuwe sectie "Inloggen op de familiepagina": `#`-code naar cookie `__Host-ts`, `#` meteen uit de adresbalk, code in de body, algemeen linkvoorbeeld, max. 5 toestellen, e-mailknoppen met eigen 7-dagencode.
3. Image links → Serving: via functie `e-image` achter een Vercel-doorverwijzing, zonder cache bij Vercel. E-mailbeeld is `small.jpg` (600px).
4. Image pipeline: versies op de telefoon gemaakt (print 3600px / eerste keren 6000px, view 1280px WebP, small 600px JPEG); print nooit naar familie; vaste EXIF-test.
5. Token hygiene → Logs: platformlogs (Supabase 1 dag Free / 7 dagen Pro, Vercel) kunnen we niet filteren; onze code logt nooit codes; codes alleen als hash.
6. E-mailprovider: Lettermint B.V., DPA, routes `transactional` en `kaartjes`, tracking uit, vanaf post.teddysteps.nl.
7. Dubbele bevestiging van het familieadres; bounces en klachten stoppen het versturen.
8. Bij "Liever niet" geen e-mailadres in F2; een nieuw toestel kan dan alleen via een nieuwe link.

**docs/analytics.md**
1. Tooling bevestigd: Aptabase en Sentry in de EU-regio, alleen in de app.
2. Sentry-instellingen: `sendDefaultPii: false`, geen Replay, geen screenshots of view hierarchy, geen touch/console-breadcrumbs, `beforeSend` wist `event.user` en URL's/codes.
3. Kolomnamen gelijktrekken (`moments.trail_week`, `circle_members.invited_at/joined_at`, `parent_invites`, `family_visits_daily`).
4. Opt-out in `profiles.analytics_opt_out`.
5. Verwerkerslijst aanvullen: Supabase, Vercel, Lettermint, Expo, Apple, Google, Sentry, Aptabase, Plausible.
6. Retentie: Sentry 30 dagen; Aptabase navragen.
7. Back-ups: Supabase Pro 7 dagen, opslag niet geback-upt; testfase-back-ups bij overstap gewist.

**design/design-system/README.md**
1. Lettertypes zelf aanbieden (app: expo-font; web: WOFF2-subset). Nooit Google Fonts; de `@import` in `bundle.css` is alleen voor de borden.
2. Nieuwe sectie Platform: React Native-versie in `packages/ui` met dezelfde namen en props als `index.d.ts`; bij verschil wint tokens.json.
3. Vaste Fraunces-versies in React Native.
4. Harde schaduw als `boxShadow` met 0 vervaging.
5. Animaties stoppen via `useReducedMotion`.
6. "52 screens" vs. 55 in CLAUDE.md gelijktrekken.

**CLAUDE.md** (met OK van de eigenaar): bij Domains de e-mailprovider wordt Lettermint; `api.teddysteps.nl` is niet nodig.

## 9. Handwerk voor de eigenaar (op volgorde)

Gebruik één bedrijfsadres (bijv. `apps@teddysteps.nl`), een wachtwoordmanager, tweestapsverificatie en herstelcodes op papier.

| Wanneer | Wat |
|---|---|
| **Nu** | 1. D-U-N-S-nummer voor Haagen Trade aanvragen (gratis, kan weken duren). 2. Apple Developer: *Individual* of *Organization*? Bij Individual staat je eigen naam (en door de DSA mogelijk adres en telefoon) openbaar; omzetten via Apple Support. 3. GitHub-organisatie met privé-repo. 4. Supabase: organisatie Haagen Trade, project in **Frankfurt** (niet meer te wijzigen), DPA, MFA. 5. Vercel-account op het bedrijfsadres. 6. Expo-organisatie. |
| **Stap 0** | 7. TransIP DNS: `familie` CNAME naar Vercel. |
| **Stap 2** | 8. Lettermint: domein `post.teddysteps.nl`, routes, DPA. 9. TransIP DNS voor `post`: DKIM, SPF, return-path en `_dmarc.post` (`p=none`, na 4 schone weken `p=quarantine`). 10. Apple: App ID `nl.teddysteps.app`, Sign in with Apple, Push, APNs-sleutel (.p8, maar één keer te downloaden), App Store Connect, TestFlight. 11. Google Cloud-project: OAuth-clients voor iOS, Android en web. 12. Firebase: Google Analytics uit, Android-app, serviceaccount voor FCM. |
| **Stap 2–3** | 13. Google Play Console als organisatie ($25). Plan voor de zekerheid een gesloten test van 14 dagen met 12 testers in. |
| **Stap 10** | 14. Sentry met EU-regio bij het aanmaken. 15. Aptabase EU; bewaartermijn en DPA navragen. 16. Afspraak met testgezinnen; back-upscript elke zondag. |
| **Voor de launch** | 17. Jurist: privacyverklaring, voorwaarden, DPIA, register van verwerkers. 18. Supabase Pro, Vercel Pro, Lettermint Starter, budgetwaarschuwingen; testfase-back-ups wissen. 19. Privacylabels in App Store Connect en Google Play. |

## 10. Bevindingen, open vragen en juristpunten

**Bevindingen in de ontwerpen (privacy eerst)**
1. Typefout in het familie-e-mailadres (F2) stuurt Lottes naam naar een vreemde → dubbele bevestiging (in het plan).
2. Google-login geeft volledige naam en profielfoto mee → na elke login wissen; testen in stap 2.
3. F1: het linkvoorbeeld toont "Lottes pad" → algemeen voorbeeld; naam alleen in de berichttekst.
4. T2: "Gezien door oma Ria, opa Henk…" botst met "geen bezoekgeschiedenis" → afleiden uit `last_seen_at`, of weglaten.
5. A1 zegt "of een video"; video zit niet in de scope → weglaten.
6. M7 verwijdert alleen het pad; Apple eist account verwijderen → "Pad en account verwijderen".
7. M5 "Nieuws van TeddySteps" is marketing en vraagt aparte toestemming → niet bij de launch.
8. Opnameformaat van berichtjes verschilt per browser → eerst testen.

Alle acht bevindingen hierboven worden overgenomen zoals voorgesteld (T2: de regel "Gezien door" vervalt).

**Besluiten (17 oktober 2026)**
1. **Weken:** pad en boek tellen vanaf de geboorte, sprongetjes vanaf de uitgerekende datum.
2. **Vóór de geboorte:** bij de launch nog niet vastpinnen. Een ouder met "Nog onderweg" kan familie uitnodigen; het pad begint bij de geboorte. *(Standaardkeuze van de hoofdsessie, er was geen advies; de eigenaar kan dit nog wijzigen.)*
3. **Speciaal:** automatisch elke foto in een "eerste keer"-moment, geen schakelaar.
4. **Familielink:** herbruikbaar per persoon, max. 5 toestellen, apparatenlijst en intrekken in M3.
5. **Reacties:** familie ziet het aantal knuffels; berichtjes zien alleen de ouders.
6. **Medeouder:** uitnodigen via e-mailadres.
7. **Pad verwijderen:** de andere ouder krijgt een melding en kan het ongedaan maken.
8. **Vercel Pro:** zodra de landingspagina openbaar is met een prijs; tot dan een pagina zonder prijs.
9. **Supabase Pro:** bij het eerste testgezin dat we niet persoonlijk kennen, bij 700 MB of bij de launch, wat het eerst komt.
10. **Sign in with Apple:** alleen op iOS.
11. **Berichtjes van een ingetrokken familielid:** blijven in het pad (een cadeau aan het kind). Vraagt het familielid om verwijdering, dan halen we ze bij de launch met de hand weg via hallo@. *(Standaardkeuze van de hoofdsessie; de jurist bevestigt.)*

**Juristpunten**
- Bestaand: art. 11.7a Tw voor Aptabase; gerechtvaardigd belang; DPIA-reikwijdte; zondagmail met boekprompt.
- Doorgifte naar Amerikaanse bedrijven: Supabase, Vercel, Expo, Sentry, Apple/Google (push met voornaam op het vergrendelscherm). Toets SCC's of DPF.
- Familieleden zonder account zijn ook betrokkenen: privacy-informatie op F2, grondslag voor e-mail en stem, wat er na intrekken gebeurt.
- Naamgegevens van Google die we ontvangen en direct wissen.
- Back-ups uit de testfase op het toestel van de eigenaar.
- Status als handelaar (DSA) in de stores.

## Bronnen (gecontroleerd 17 okt 2026)

- [Supabase pricing](https://supabase.com/pricing), [backups zonder Storage](https://supabase.com/docs/guides/database), [regional invocation](https://supabase.com/docs/guides/functions/regional-invocation)
- [Expo pricing](https://expo.dev/pricing)
- [Vercel fair use (commercieel gebruik Hobby)](https://vercel.com/docs/limits/fair-use-guidelines), [Vercel rewrites](https://vercel.com/docs/routing/rewrites)
- [Lettermint pricing](https://lettermint.co/pricing), [tracking](https://lettermint.co/docs/platform/emails/tracking/introduction), [DPA](https://lettermint.co/dpa), [subprocessors](https://lettermint.co/subprocessors)
- [Aptabase pricing](https://aptabase.com/pricing)
- [Sentry pricing](https://sentry.io/pricing/)
- [Google Play testvereiste nieuwe persoonlijke accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
