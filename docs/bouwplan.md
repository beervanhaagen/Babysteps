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
| Geen back-ups: een foute migratie of delete en echte babyfoto's zijn weg. | Wekelijkse back-up op de Mac van de eigenaar (`supabase db dump` + `rclone sync` van de opslag) naar een versleutelde schijfkopie, 3 weken bewaren (30 dagen terugdraaien + 3 weken blijft binnen de 60 dagen van /privacy), wissen zodra Pro draait. "Alles downloaden" (M6) in stap 8. |
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

**Openstaand uit de review van stap 1 (design-reviewer, 18 oktober 2026)**

Al opgelost: hint en foutmelding van velden worden ook op de familiepagina voorgelezen (`aria-describedby`, foutmelding als `alert`); zichtbare veldlabels worden niet dubbel voorgelezen; tabbalk niet te hoog op een iPhone; dier en actieknop in een header overlappen niet meer; schermtitel is een heading van niveau 1; CodeInput is een groep met "Cijfer n"; MomentCard heeft een eigen label en is een link; De Knuffel in een melding is decoratief; knuffelmeldingen worden op iOS voorgelezen; één gedeelde "beweging beperken"-status (geen frame beweging); hop beweegt vloeiend zoals de CSS; tekstinspringing op Android; galerijteksten gelijk aan de borden.

Nog te doen:
- **Krijtkorrel, vóór de launch (weegt zwaar voor het merk):** op het web het filter uit `bundle.js` terugzetten in `svg.web.tsx`, met per instantie een eigen id voor filters en clipPaths (`useId`) en `will-change: transform` op de bewegende omhulling. In de app per houding een WebP@3x met korrel (4 dieren × 2–3 houdingen + De Knuffel), gemaakt met een script in headless Chrome; vector alleen voor kleine sidekicks.
- **Componenten bouwen bij het scherm dat ze nodig heeft:** NextUp (T1), Banner (X2), ListRow (M1, M3, M6), VoiceNote (F4), Callout, HandNote, BookCover (B1). Een `ChoiceGroup` met `role="radiogroup"` en label (O2 "Is je baby er al?"). Een ScreenHeader-variant voor T1 (woordmerk in plaats van titel, cornflower, 20px marge).
- **Familiepagina (stap 4):** TabBar op het web als `role="navigation"` met `aria-current="page"`; optillen bij hover op knoppen (F7, laptop).
- **M3 (stap 8):** de stippellijn onder PersonRow als eigen SVG-lijn, want een stippelrand aan één kant tekent iOS/Android niet goed.
- **Op een Android-toestel controleren:** tekstpositie van Bagel en Nunito, en of de paarse overdruk van het woordmerk (`mixBlendMode`) verschijnt.
- **S3 (stap 2):** CodeInput krijgt de echte invoer.

**Stap 2 (18 oktober 2026): wat gebouwd is en wat openstaat**

Gebouwd: S1, O1, S2, S3, S4 en O2 met inloggen via een e-mailcode (6 cijfers, 10 minuten geldig, één per minuut); de sessie versleuteld op de telefoon (sleutel in Keychain/Keystore); de tabellen `profiles`, `trails`, `children` en `trail_parents` met RLS; namen en profielfoto van Apple en Google worden bij binnenkomst gewist; een pad starten gaat via de databasefunctie `create_trail`; 17 privacytests in `supabase/tests`, ook in CI. Alle schermen achter de juiste inlogstatus (Expo Router `Stack.Protected`).

Open, voor de eigenaar:
- **Voornaam van de ouder:** nergens in de lanceringsschermen gevraagd, terwijl M3 ("Sam (jij)") en de familiepagina hem gebruiken. M1 toont op het bord bovendien een achternaam ("Sam de Vries"). Voorstel: één veld "Hoe heet jij?" op O2 of O3.
- **Teksten die niet uit een bord komen:** S4 zegt "Je pad heeft je gemist." (de naam van het kind is voor het inloggen nog niet bekend); het scherm achter O1 "Ik ben uitgenodigd door familie" heeft nog geen bord.

Uit de reviews van stap 2 al opgelost: foto-paden kunnen alleen binnen het eigen pad en alleen door serverfuncties gezet worden; nieuwe functies zijn niet meer standaard voor iedereen uitvoerbaar; `create_trail` mag twee keer aangeroepen worden (dubbel tikken, opnieuw proberen) zonder tweede pad; geboortedatum ook bij wijzigen nooit in de toekomst; vangnet-tests (geen functie of tabel open voor niet-ingelogden, elke view volgt RLS); sessie met slot, sleutel alleen op dit toestel en leesbaar na de eerste ontgrendeling; alleen echte netwerkfouten tellen als "offline"; baby's tot 3 weken over tijd kunnen O2 afronden; foutmeldingen worden op iOS voorgelezen; knoppen tonen "Even geduld…"; uitweg "Ander e-mailadres? Uitloggen" op O2; Nederlandse codemail ook voor e-mail wijzigen en opnieuw inloggen.

Later in het plan:
- **Apple en Google inloggen:** zodra de accounts er zijn (§9); tot dan alleen de e-mailcode, geen knoppen die niets doen. Dan native `signInWithIdToken`, `additional_redirect_urls` exact in plaats van `teddysteps://**`, en testen of de volledige naam niet toch in de eerste sessie of de audit-log belandt. De scheidingslijn "of met e-mail" komt dan terug, Apple bovenaan.
- **Echte server (bij het aanmaken, blokkerend):** alles uit `config.toml` overnemen (bij voorkeur `supabase config push`): regio Frankfurt, code 6 cijfers en 600 s, `max_frequency` 60 s, bevestigen en "secure email change" aan, anoniem inloggen en handmatig koppelen uit, de sjablonen uit `supabase/templates`, eigen SMTP via Lettermint vanaf `post.teddysteps.nl`, onder Data API alleen `public`, GraphQL uit, SSL afdwingen. De mailgrens per uur geldt voor het hele project: zet hem op ongeveer 200–300 en houd de teller in de gaten. Lokaal weigert de server een tweede code binnen de minuut niet; test op de echte server met twee keer `curl` op `/auth/v1/otp` of er een 429 komt. Tot die tijd is de wachttijd in de app alleen gebruiksgemak.
- **Onbevestigde accounts opruimen:** iedereen kan een code aanvragen voor elk adres; een dagelijkse taak (pg_cron) wist onbevestigde gebruikers na 24 uur. Bij M7 (stap 8) ook `auth.audit_log_entries` meenemen.
- **Stap 3, regels die vaststaan:** elk `*_path` (foto's, berichtjes) begint met `trail_id/` en wordt alleen door serverfuncties gezet; private buckets met regels op `storage.objects` via `private.is_parent((storage.foldername(name))[1]::uuid)`; per bucket een maximale grootte en toegestane types in `config.toml`; elke view `with (security_invoker = true)`; `client_id` uniek tegen dubbele uploads.
- **Lokaal:** `npm run local-env` maakt de lokale database bereikbaar op het wifi-netwerk (wachtwoord `postgres`). Alleen thuis en met nepdata gebruiken.
- **"Foto toevoegen" op O2** komt met de fotostroom in stap 3. De ontwikkeltekst op het tijdelijke pad-scherm verdwijnt met T1.

**Stap 3 (19 oktober 2026): wat gebouwd is en wat openstaat**

Gebouwd: A1 (onderblad), A2, A3, A4, T1 met X1 (leeg pad), X2 (offline) en X4 (upload mislukt), T2, plus "Mijn kleintje is geboren!" voor wie zich aanmeldde toen het kleintje nog onderweg was. De telefoon maakt per foto een print-, kijk- en kleine versie (opnieuw gecodeerd vanuit de pixels); een moment staat eerst veilig op de telefoon en gaat via de wachtrij naar de server (`create_moment` deelt de paden uit, `finish_upload` controleert in de opslag zelf of alles er is). Twee privé-buckets (`print`, `view`) met regels: uploaden alleen naar uitgedeelde paden, lezen alleen in het eigen pad. 15 nieuwe databasetests en een end-to-end-test tegen de opslagserver (uploaden, opnieuw proberen, zichtbaar worden, en geweigerd voor een andere ouder).

Bewuste afwijkingen van de borden (voor de design-review):
- **A2:** het bord toont een eigen galerij van de hele fotobibliotheek. We gebruiken de systeemkiezer (geen toegang tot alle foto's nodig, §4); A2 toont wat gekozen is, met "Meer kiezen" en "Camera". Header lilac in plaats van tangerine (geen headerkleur in het ontwerpsysteem).
- **A1:** "Foto’s" zonder "of een video" (video niet bij de launch).
- **A3:** de week begint bij de week waarin de eerste foto genomen is, zodat oudere foto's in hun eigen week landen; "gedeeld met 5 mensen" komt met familie in stap 4.
- **A4:** "Delen buiten TeddySteps" (SH2) en wie een kaartje krijgt, komen in latere stappen.
- **T1:** de "Wat komt eraan"-kaart (stap 9, met child-development-reviewer) en de activiteit-bel (stap 4) ontbreken nog; het rondje rechtsboven toont de eerste letter van het kind tot de voornaam van de ouder bekend is.
- **T2:** knuffels en berichtjes (stap 4 en 6), opties T8 (stap 9), "toegevoegd door" (wacht op de voornaam van de ouder).

Uit de reviews van stap 3 al opgelost: de wachtrij hoort bij één ouder en één pad (eigen map, controle vóór elke stap, `create_moment` met `expected_trail`), zodat foto's nooit in het pad van een ander account landen; blijvende fouten stoppen ("vastgelopen", met "Van telefoon verwijderen"), tijdelijke fouten wachten steeds langer (1, 2, 5, 15, 60 minuten), en alleen ontbrekende bestanden gaan opnieuw; een moment dat tijdens een upload wordt vastgepind, wacht niet meer; afronden kan alleen via de serverfunctie `finish-upload`, die elke JPEG en WebP doorloopt en alles met EXIF, XMP of IPTC weigert en verwijdert; unieke indexen op de fotopaden; uploads stoppen bij een pad dat verwijderd wordt; geheugen van de fotobewerking direct vrijgegeven; kopieën van de fotokiezer opgeruimd; meer Android-rechten geblokkeerd; het pad toont offline de laatst bekende momenten met een melding in plaats van een leeg pad; T2 heeft laad- en "niet meer"-toestanden; uitloggen telt alle wachtende momenten, zegt dat ze weg zijn en wist links, beeldcache en de kopie van het pad. 41 databasetests, plus end-to-end-tests tegen de opslag en de serverfunctie.

Nog te doen:
- **Opgelost 19 oktober (echt toestel):** iOS zet in elke JPEG een klein EXIF-blok (kleurruimte, afmetingen); de server weigerde daardoor elke iPhone-foto. Nu haalt de app EXIF, XMP, IPTC en commentaar weg vóór het versturen (`packages/core/src/metadata.ts`, met tests); de server controleert nog steeds. Oorspronkelijke notitie: de controle in `finish-upload` weigert elke foto met metadata. Schrijft de fotobewerking op iOS of Android toch EXIF mee (zoals `sips` op de Mac doet), dan lopen alle uploads vast. Test met exiftool op de uitvoer, met een foto mét GPS en een staande foto (oriëntatie 6).
- **Uploaden als de app dicht is en minder geheugen:** bestanden vanaf schijf versturen (`uploadAsync` naar een `createSignedUploadUrl`, op iOS als achtergrondsessie) in plaats van als ArrayBuffer; later hervatbaar (TUS) voor de printversie.
- **Opslagkosten:** printversies zijn het grootste deel (ruwe schatting 2 GB per gezin per jaar, ~€40/mnd bij 1.000 gezinnen eind jaar één). JPEG-kwaliteit 0,85 in plaats van 0,9 scheelt ~25% zonder zichtbaar verschil in print; beslissing eigenaar.
- **Opruimen:** de map `queue/` buiten iCloud- en Android-back-ups houden; een dagelijkse taak die momenten wist die al 30 dagen op "uploading" staan (verloren telefoon), met bestanden; tijdelijke links in één keer opvragen (`createSignedUrls`).
- **Vóór familie (stap 4):** familie krijgt geen database-login en geen opslagregels; `family-api` maakt alleen links voor kijk- en kleine versies van momenten die klaar zijn, van een pad dat niet gepauzeerd of verwijderd is, voor een familielid dat niet is ingetrokken, met een geldigheid van hoogstens 15 tot 60 minuten.
- **Tabbladen Boek, Familie en Ik** zijn tijdelijk ("Hier wordt nog aan gebouwd"); uitloggen staat op Ik en vraagt bevestiging als er nog foto's alleen op de telefoon staan.

**Stap 4 (20 oktober 2026): wat gebouwd is en wat openstaat**

Gebouwd: de kring (`circle_members`, met relatie tot het kind), persoonlijke links (alleen de hash van de code bewaard), familiesessies met cookie `__Host-ts` (max. 5 toestellen per persoon), knuffels (`reactions`), één bezoektelling per pad per dag, en de boeklijst. Familie heeft geen database-login: alles loopt via de serverfunctie `family-api`, die links van 15 minuten geeft naar kijk- en kleine versies van momenten die klaar zijn. Familiepagina: `/j#code` (code direct uit de adresbalk), F2, F3 en F7 (breed scherm), knuffelen, F4 met "Laat het me weten". App: O3 na O2 (overslaan kan), "Iemand toevoegen" (naam en relatie), F1 met deelmenu en "Kopieer de link", het Familie-tabblad met nieuwe link en "Uit de kring halen", T6 Activiteit met belletje op het pad, knuffels op T1 en T2. 20 nieuwe databasetests (61 in totaal, na de reviews 74) en een end-to-end-test van uitnodigen tot intrekken.

Bewuste afwijkingen van de borden (voor de design-review):
- **Headerkleur:** F3, F7 en T6 in pistachio (familie) in plaats van rose; rose is in het ontwerpsysteem een accent, geen headerband.
- **Namen van ouders:** "Sam nodigt je uit" (F2), "Knuffel verstuurd naar Sam en Alex" (F4) en "Bericht van Sam" (F1) zonder naam, want de voornaam van de ouder wordt nog niet gevraagd.
- **O3:** geen "Uit je contacten" en geen algemene privélink; iedereen krijgt een eigen link, zodat je per persoon kunt intrekken. De andere ouder uitnodigen komt met M3 in stap 8.
- **F3/F4:** "Inspreken" en het berichtje komen in stap 6.
- **F1:** het linkvoorbeeld zonder naam of foto van het kind (besluit 17 oktober).

Uit de reviews van stap 4 al opgelost: een nieuwe link stopt ook alle toestellen waarop de oude link al geopend was (handig bij een doorgestuurde link), en de teksten in F1 en "Wijzig" zeggen dat; dezelfde telefoon die de link opnieuw opent houdt zijn sessie en telt niet als nieuw toestel; het zesde toestel krijgt een eigen melding in plaats van "link werkt niet"; familiesessies verlopen na 180 dagen zonder bezoek; foute codes worden per (ingekort, gehasht) IP en in totaal beperkt en na een uur gewist, het IP-adres zelf wordt nergens bewaard; "Ik wil niet meer meekijken" op F2 (twee keer tikken) wist het e-mailadres en alle toestellen; de familiepagina laadt per 12 kaartjes ("Eerdere kaartjes") en vraagt op de telefoon alleen kleine foto's op; F7 op laptopbreedte heeft twee kolommen zoals het bord (groot nieuwste moment, "Eerder" in een raster, rechts begroeting, kaartjes, boek en privacyregel); knuffelen toont meteen "Je knuffelde dit" en de telling; privacyregel en link naar de privacybelofte op F2; laadtekst in de HTML en opnieuw laden na 10 minuten weg; T6-rijen openen het moment en "Nieuw" wordt voorgelezen; O3 in lila tijdens onboarding. 33 familietests (74 databasetests in totaal) en een uitgebreide end-to-end-test: claim van een andere site geweigerd, cookie-instellingen, geen printpaden, vijf toestellen plus een zesde, nieuwe link, afmelden en intrekken.

Nog te doen:
- **Bij het online zetten:** de rewrite `/api/*` naar `family-api` en de exacte Supabase-host in `img-src` (zie README); testen dat de cookie door de rewrite van Vercel komt (§2, reserve: Vercel-functies in Frankfurt); controleren dat `x-forwarded-for` achter Vercel het echte IP van de bezoeker is, anders telt de beperking op foute codes iedereen samen.
- **`og:image`** (De Knuffel, absolute URL) voor het WhatsApp-linkvoorbeeld; nu alleen titel en tekst.
- **"Alles downloaden"** stond in stap 4 maar is nog niet gebouwd; schuift naar M6 (export) in stap 8. Tot dan geldt de back-up op de Mac (§1).
- **Opruimen:** een dagelijkse taak (pg_cron) wist ingetrokken sessies en links na 30 dagen.
- **Vóór stap 7:** `access_keys` krijgt `expires_at` en de soorten voor e-mailknoppen (7 dagen) en `/e/`-foto's.
- **Stap 5 (push):** trigger op `reactions` met een wachtrij, één melding per moment per 10 minuten gebundeld ("Oma Ria en 2 anderen…"), tabel `push_tokens` per toestel.
- **Sentry (stap 10):** de code staat in de route-parameters van F1 (`/uitnodiging/[id]?code=`); die moet uit breadcrumbs en URL's blijven (`beforeBreadcrumb`).
- **Stap 7 (mail):** het e-mailadres uit F2 wordt bewaard maar nog niet bevestigd; kaartjes gaan pas na bevestiging.
- **M3 (stap 8):** apparaten per persoon tonen en per toestel intrekken, de andere ouder uitnodigen.
- **Besluit eigenaar:** mogen ouders zien wanneer iemand voor het laatst keek (`last_seen_on`, alleen een datum)? Nu niet getoond.
- **Privacyverklaring (jurist):** een eigen blok voor familieleden zonder account, waar F2 naar linkt.

**Landingspagina teddysteps.nl (18 oktober 2026): wat gebouwd is en wat openstaat**

Gebouwd op verzoek van de eigenaar, vóór stap 5, zodat hij de pagina kan laten zien. Online op https://teddysteps.nl sinds 18 oktober (Vercel Hobby, DNS bij TransIP, `www` stuurt door met 308); vindbaar voor zoekmachines (besluit eigenaar), met `robots.txt`, `sitemap.xml` en een eigen 404-pagina. `apps/landing`: gewone HTML en CSS zonder script, de componenten uit `bundle.js` bij het bouwen omgezet naar HTML, zelf gehoste variabele lettertypes, en `/privacy` met onze privacybelofte (de familiepagina linkt naar `/privacy#familie`). CI-controle `check:landing`: geen scripts, niets van andere hosts, `script-src 'none'`.

Uit de reviews (ontwerp, groei, kinderontwikkeling, techniek) al opgelost: "Binnenkort" bovenaan en "Hou me op de hoogte" en "Ik wil meetesten" als mailtjes, met het adres zichtbaar; linkvoorbeeld voor WhatsApp (`og.png`) en icoon; sprongetjes overal als ruwe schatting ("misschien", "rond week 26"), geen item meer dat lijkt op een bekende sprongnaam, voorbeelden die bij de leeftijd passen, een vangnet ("Huilt ze anders dan anders…? bel je huisarts"), de tijdlijn begint bij "uitgerekend"; LeapTimeline kreeg `nextWeekWord` voor "rond week"; alleen beloftes die bij de launch kloppen ("Jij bepaalt of familie mag bewaren", geen bestelbelofte, "We verkopen je gegevens niet"); privacybelofte volledig over wat we van familie bewaren en wat blijft na afmelden; maten, ruimtes en randen uit de tokens; decoratie `inert`; tikvlakken van 44px. Ook in de app en database: ouders kunnen het e-mailadres van familie niet meer lezen (kolomrechten), afmelden en intrekken wissen links en toestellen in plaats van ze te blokkeren, en de familiepagina heeft geen "Bewaar afbeelding" meer bij lang drukken. 77 databasetests.

Nog te doen:
- **Besloten (eigenaar, 18 oktober):** de pagina gaat online op Vercel Hobby, maar wordt nergens gepubliceerd of gepromoot, en de app is gratis. Tech-architect waarschuwde dat Vercel een pagina voor een product dat boeken verkoopt ook zonder prijs commercieel kan vinden; het risico (blokkade, ook van familie.teddysteps.nl) is gemeld. Uiterlijk bij promotie, een prijs of de launch: Vercel Pro. De GitHub-repo blijft openbaar (besluit eigenaar); er staan geen sleutels of persoonsgegevens in.
- **Bedrijfsgegevens in de footer (wettelijk verplicht, art. 3:15d BW):** Haagen Trade en KvK 97569089 staan erin; vestigingsadres en btw-id nog van de eigenaar. Jurist: ook in de app-mails?
- **Mailtjes van geïnteresseerden:** verwerkersovereenkomst met TransIP, hallo@ niet doorsturen naar een privé-mailbox, de launchmail per persoon of in BCC, adressen daarna wissen.
- **Beloftes op /privacy die pas later gebouwd worden:** export, verwijderen met 30 dagen terugdraaien en de dagelijkse opruimtaak (stap 8), "zonder namen tellen" uitzetten (stap 10). Op de launch-checklist (stap 11); de jurist kijkt naar het woord "zonder namen".
- **Plausible:** bij toevoegen ook `script-src`, `check-landing.mjs` en het stuk "Deze website" op /privacy aanpassen.
- **Later:** een aanmeldformulier zonder script (post naar een functie in Frankfurt, dubbele bevestiging via Lettermint) in plaats van de mailtjes.

**Landingspagina: app-schermen en vooraanmelding (18 oktober 2026)**

Gebouwd op verzoek van de eigenaar: twee secties met schermen uit de journeys ("Een kijkje in de app": T1, A4, F3; "Elke maand een feestje": X3, B1 zonder prijs), gebouwd met de componenten uit het ontwerpsysteem, en een vooraanmelding zonder script (plan en review tech-architect). Werking, limieten en het online zetten staan in de README, "Pre-registration".

Besluiten:
- Dubbele bevestiging met een knoppagina (een mailscanner bevestigt niets), codes alleen in het pad en alleen als hash, alles in `private` (niet via de Data API), geen JavaScript op de pagina.
- Bewaren: onbevestigd 7 dagen na de laatste mail, uiterlijk 12 maanden; na de lanceringsmail wist de eigenaar de lijst. De lijst gaat nooit naar analytics of naar de gebruikers van de app; `baby_month` dient alleen om testgezinnen te kiezen.
- Limieten: 5 pogingen per IP per 10 minuten, 300 per uur, 150 bevestigingsmails per dag, 3 per adres. De IP-limiet werkt alleen via Vercel (een directe aanroep kan `x-forwarded-for` vervalsen); de daglimiet beschermt `post.teddysteps.nl` hoe dan ook.
- IP-adressen alleen als HMAC met een geheime sleutel (`_shared/ip.ts`), ook in `family-api` (was een gewone hash, terug te rekenen).
- Keten: Vercel (doorgeefluik), Supabase Frankfurt, Lettermint. De lanceringsmail per persoon, met afmeldmogelijkheid, zonder tracking.
- Migraties: nieuwe bestanden krijgen een naam ná `20261021120000` (de bestaande namen liggen in de toekomst; anders weigert `db push`).

Nog te doen:
- **Regio (besluit eigenaar, 19 oktober):** het Supabase-project staat in Ierland (eu-west-1), niet in Frankfurt; ook EU. Teksten op teddysteps.nl zeggen "in de EU, in Ierland". Waar dit plan Frankfurt noemt, geldt nu Ierland.
- **Online zetten** (eigenaar, zie README): Supabase-project (gekoppeld, database en functie `waitlist` staan online sinds 19 oktober), Lettermint met `post.teddysteps.nl`, secrets, rewrites in `vercel.json`. Tot dan toont teddysteps.nl de mailknoppen.
- **Vercel Hobby:** met een aanmeldformulier wordt de pagina duidelijker commercieel (tech-architect); besluit eigenaar of dat het moment is voor Pro. Supabase Free pauzeert een project na een week zonder activiteit, en dan werkt het formulier stil niet meer.
- **Jurist:** de uitgerekende maand verraadt een zwangerschap (mogelijk een gezondheidsgegeven), de grondslag (toestemming), de bewaartermijn.
- **Later:** foto's in de app-schermen in plaats van de dieren (groei-advies; besluit eigenaar), een deelknop op `/bevestigd`.

**Echte omgeving ingericht (19 oktober 2026)**

- Supabase `TeddySteps` (Ierland, ref `rzckkognfzjxlvymmgrr`): alle migraties, functies `waitlist`, `family-api`, `family-mail`, `push`, secrets en Vault-regels. Inloggen met een 6-cijferige code (10 minuten), Nederlandse codemail, Data API alleen `public` (`supabase config push`). Mail van Supabase Auth via Lettermint-SMTP (`smtp.lettermint.co:587`, gebruiker `lettermint`, token als wachtwoord), getest met een echte code.
- Online: teddysteps.nl (landing en aanmelden) en familie.teddysteps.nl (familiepagina, `/api` naar `family-api`), beide getest op productie.
- Apple: APNs-sleutel (sandbox en productie) in Supabase. Expo-project `@beervanhaagen/teddysteps` met `eas.json`; het distributiecertificaat wordt gedeeld met een ander project van de eigenaar en verloopt op 15 december 2026. "Sign In with Apple" staat uit tot het inlogscherm met Apple er is (dan `ios.usesAppleSignIn` aan).
- Nog niet: Firebase (Android-push), een betaald Lettermint-plan (vóór de launch), automatisch antwoord op hallo@.

**Stap 7 bij de launch (19 oktober 2026): de zondagmail F8, alleen tekst**

Gebouwd (plan tech-architect): bevestigen van het familieadres (mail zonder kindnaam of label, knop op `familie.teddysteps.nl/bevestig#<code>`, eenmalig, 7 dagen, alleen voor het adres waarvoor hij gemaakt is, 3 per persoon en 200 per dag), de zondagmail (zondag vanaf 20:00, alleen bevestigde adressen, alleen als er die week momenten klaar zijn, één per persoon per week, rij eerst en dan de mail met een Idempotency-Key, herkansing elk uur tot middernacht), "Noor via TeddySteps" met "Hoi Oma Ria,", hooguit 5 momenten als tekst (bijschriften veilig), een persoonlijke 7-dagenlink (`/m#<code>`, opent pas na een tik), afmelden met één klik (`List-Unsubscribe` met verzegelde token), en het opruimen van onbevestigde adressen na 7 dagen. "Bij elk moment" is weg uit F2; wie dat had, krijgt de zondagmail. Mailcode gedeeld in `supabase/functions/_shared/mail.ts`. 25 databasetests en een eindtest (`scripts/check-family-mail.mjs`, 20 controles).

Uit de reviews al opgelost: de knop in de mail werkt eenmalig (een doorgestuurde mail geeft niemand anders toegang), een herkansing controleert opnieuw of het pad gepauzeerd of verwijderd is, momenten tot zondag 20:00 (nooit twee weken dezelfde), dezelfde link en inhoud bij elke herkansing en Lettermint-duplicaten tellen als verstuurd, hooguit 300 per aanroep met de taak elke 10 minuten op zondagavond, een eerlijke melding als er vandaag geen bevestigingsmail meer kan (3 per persoon, 30 per pad, 1000 per dag), mislukte mails gelogd met alleen de statuscode, afzendernaam opgeschoond, afmeldtoets in constante tijd. Uit de design-review: volle knop, cornflower-band met het woordmerk, voorbeeldregel in de inbox, geen donkere modus, eerlijke foutmeldingen op de familiepagina.

Bewust later: foto's in de mail (met de M6-schakelaar, stap 8), mail bij elk moment, "Wijzig hoe vaak", maandverjaardag, namen van ouders, boekprompt, bounces in onze database, de bevestigingscode koppelen aan een hash van het adres (twee gelijktijdige wijzigingen), tests rond de zomertijdwissel.

Vóór de launch (eigenaar en jurist): een betaald Lettermint-plan (het gratis plan stopt bij 300 mails per maand; ruwweg €20–40 per maand bij 1.000 gezinnen), één echte testmail via Lettermint (tracking uit, `List-Unsubscribe` meegetekend), de zondagmail en Lettermint in de privacyverklaring en de verwerkerslijst.

Nog te doen (eigenaar): de familiepagina online zetten (Vercel-project `apps/family`, DNS `familie` bij TransIP), secrets en Vault-regels (README, "Family mail"), een automatisch antwoord op hallo@ ("Knuffels stuur je via de familiepagina"), en zelf testen in Gmail en Apple Mail.

**Stap 5 (19 oktober 2026): push, minimaal**

Besluit eigenaar: pushmeldingen zijn bij de launch het absolute minimum, hooguit één per dag, niet bij elke interactie. Gebouwd: `private.push_tokens` (één rij per toestel; een gedeelde telefoon gaat over naar het account dat inlogt), `public.push_digest` (alleen om 19:00 Amsterdamse tijd, één per ouder per dag, knuffels van familie uit de laatste 24 uur, niet bij gepauzeerde paden, verwijderde momenten of als de ouder het uit heeft gezet), de functie `push` (APNs en FCM rechtstreeks, zonder Expo-pushdienst, tokens die Apple of Google afwijzen worden gewist), elk uur aangeroepen door pg_cron via pg_net met URL en geheim uit Vault. App: toestemming vragen op A4 na het eerste moment met één zin uitleg, toestel aanmelden bij elke start, afmelden bij uitloggen, tikken opent T6. 18 databasetests.

Bewust niet bij de launch: een melding per knuffel of bundelen per 10 minuten, de ochtendsamenvatting, het zondagseintje voor ouders (komt met M5 in stap 8), opnieuw proberen binnen de dag, de events `notification_permission` en `nudge_opened` (stap 10).

Nog te doen (eigenaar): Apple Developer (App ID `nl.teddysteps.app` met Push en Sign in with Apple, APNs-sleutel .p8 met Key ID en Team ID), Firebase-project voor Android (Analytics uit, serviceaccount met alleen FCM), een Expo-account voor een development build, en de secrets en Vault-regels uit de README, "Push".

**Toestemming wachtlijst**

Bij bevestigen bewaart `private.waitlist` het tijdstip (`confirmed_at`) en de versie van de tekst (`consent_version`). Verandert een van de teksten hieronder inhoudelijk, dan krijgt de nieuwe tekst een nieuwe versie (in `waitlist_confirm`) en komt hij hier bij.

- **wachtlijst-v1** (19 oktober 2026). Formulier: "Je krijgt eerst een mailtje om te bevestigen. Daarna mailen we je alleen als de app er is, of om je te vragen voor een test. Geen nieuwsbrief, geen reclame. Uiterlijk na 12 maanden wissen we je adres." Knoppen "Hou me op de hoogte" of "Ik wil meetesten", met optioneel de maand van geboorte of uitgerekende datum. Mail: "Verder mailen we je alleen als de app er is. Geen nieuwsbrief, geen reclame. Uiterlijk na 12 maanden wissen we je adres." Bevestigingspagina: "Dan zet je jezelf op de lijst en hoor je het als eerste als TeddySteps er is." Knop "Ja, zet me op de lijst". Privacybelofte: teddysteps.nl/privacy#site.

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
| `profiles` (ouders) | `id`, `first_name`, `analytics_opt_out`, `notify_nudges`, `notify_reactions`, `notify_month` | Geen achternaam-kolom. |
| `trails` | `id`, `created_at`, `family_may_keep_photos` (standaard false), `paused_at`, `delete_requested_at`, `purge_after` (+30 dagen), `deleted_at` | M6-schakelaar "mag foto's bewaren". |
| `children` | `trail_id`, `first_name`, `birth_date` (leeg bij "Nog onderweg"), `due_date` (verplicht), `avatar_path`, `leap_cards_on` | |
| `trail_parents` | `trail_id`, `user_id`, `joined_at` | Rol "ouder". |
| `parent_invites` | `trail_id`, `email`, `sent_at`, `accepted_at` | Medeouder via e-mail; inloggen met dat adres = lid. |
| `circle_members` (familie) | `id`, `trail_id`, `label` ("Oma Ria"), `relation` (oma, opa, oom, tante, vriend, vriendin, peetoom, peettante, anders; mag leeg), `email` (leeg bij "Liever niet"), `email_confirmed_at`, `email_frequency` (weekly/never bij de launch; each bestaat voor later), `invited_at`, `joined_at`, `revoked_at`, `last_seen_at`, `book_list_at` | Relatie bij O3 (ouder) of F2 (familie). |
| `private.access_keys` | `circle_member_id`, `kind` (invite; email_signin: eenmalig, 7 dagen; email_confirm: 7 dagen; image komt met de foto's in de mail), `token_hash`, `expires_at`, `revoked_at`. Afmelden gebruikt geen rij maar een verzegelde token (HMAC met `MAIL_LINK_KEY`). | 32 willekeurige bytes, alleen de hash bewaard. |
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
- Zondag (F8): versturen op zondag vanaf 20:00 Amsterdamse tijd (na het ouderseintje van 19:00); geen nieuwe momenten, geen mail.
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

Daarnaast Apple €99/jaar en Google $25 eenmalig. Boven ~5 TB loont het om `print` naar goedkopere EU-opslag te verhuizen. Supabase maakt geen back-up van de opslag: na de launch een wekelijkse kopie van `print` naar koude EU-opslag (een paar euro per maand), hooguit 21 dagen bewaard, zodat "binnen 60 dagen helemaal weg" (/privacy) blijft kloppen.

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
| 9 | Rest: O6, T8, Pad 2.0 (tijdlijn en raster), A3b eerste keren, X1/X4, "Wat komt eraan"-kaart, SH2/X3 deelkaarten. Het jaarboek (B1 en de boeklijst) is van de lancering af: backlog (eigenaar, 20 okt 2026). | Alle 32 schermen klikbaar. | L |
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
| **Voor de launch** | 17. Jurist: privacyverklaring, voorwaarden, DPIA, register van verwerkers. 18. Supabase Pro, Vercel Pro, Lettermint Starter, budgetwaarschuwingen; testfase-back-ups wissen. 19. Privacylabels in App Store Connect en Google Play. 20. Opruimtaak controleren (anders blijven verwijderde foto's stilletjes staan): functie `purge` gedeployd, `CRON_SECRET` gezet, Vault-geheim `purge_function_url` aanwezig, en `select count(*) from public.moments where deleted_at < now() - interval '32 days'` geeft 0. |

## 10. Bevindingen, open vragen en juristpunten

**Bevindingen in de ontwerpen (privacy eerst)**
1. Typefout in het familie-e-mailadres (F2) stuurt Lottes naam naar een vreemde → dubbele bevestiging (in het plan).
2. Google-login geeft volledige naam en profielfoto mee → na elke login wissen; testen in stap 2.
3. F1: het linkvoorbeeld toont "Lottes pad" → algemeen voorbeeld; naam alleen in de berichttekst.
4. T2: "Gezien door oma Ria, opa Henk…" botst met "geen bezoekgeschiedenis" → afleiden uit `last_seen_at`, of weglaten.
5. A1 zegt "of een video"; video zit niet in de scope → weglaten.
6. M7 verwijdert alleen het pad; Apple eist account verwijderen → "Pad en account verwijderen".
7. M5 "Nieuws van TeddySteps" is marketing en vraagt aparte toestemming → niet bij de launch.
8. Pad 2.0 (eigenaar, 20 okt 2026): kaarten staan recht als in een fotoalbum, foto's tot de rand op een vaste hoogte, een rustig label per eerste keer (icoon en kleur per soort) en een schakelaar Tijdlijn/Raster. Eerste keren kies je uit een lijst (A3b) of typ je zelf; we bewaren alleen het label, de kaart zoekt het icoon erbij, dus geen databasewijziging.
9. Het jaarboek gaat naar de backlog (eigenaar, 20 okt 2026): geen tab Boek, geen B1, geen boeklijst op de familiepagina, geen schakelaar "In het jaarboek" in T8. De kolommen `in_book` en de tabel `book_list` blijven staan, ongebruikt.
10. Pad 3.0 (eigenaar, 21 okt 2026): elk moment één grote foto (400px) om door te vegen, per week "Bekijk week" naar T2b, de week schermvullend als een verhaal. De schakelaar Tijdlijn/Raster is weg; het menu krijgt twee tabbladen aan elke kant van de + ("Knuffels" in plaats van het belletje).
11. O6 Inhalen (eigenaar, 21 okt 2026): geen scan van de fotobibliotheek zoals op het bord, maar de fotokiezer van de telefoon (max. 20 foto's tot de lancering); wij sorteren per week en stellen per dag een foto voor. Inhaalmomenten tellen niet als nieuw in de zondagmail.
12. Seintjes voor ouders (eigenaar, 21 okt 2026; plan tech-architect en design-reviewer): in de pushdigest van 19.00 uur, hooguit één push per dag (knuffels gaan voor). Eerste 4 weken max. 2 per week (een ideetje halverwege, het seintje op de laatste dag van de padweek, alleen als die week leeg is), daarna 1; eenmalig kring uitnodigen en inhalen; nog niets vastgepind: dag 1, 4 en 18. Na 3 genegeerd om de week, na 6 alleen op de maandverjaardag; app openen of vastpinnen zet het terug. Op iPhone vragen we meteen stil (provisional) toestemming; de echte vraag blijft op A4. Uit te zetten in M5 Meldingen (`profiles.notify_nudges`); Android-kanaal "Seintjes". Aantal weken op rij mag op het vergrendelscherm, een weeknummer niet.
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
8. **Vercel Pro:** zodra de landingspagina openbaar is met een prijs; tot dan een pagina zonder prijs. *(18 oktober: de eigenaar houdt Hobby zolang de pagina niet gepromoot wordt; Pro uiterlijk bij promotie, een prijs of de launch.)*
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
