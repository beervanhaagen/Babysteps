TeddySteps turns a baby's first 18 months into a trail of moments that family follows along, and at 12 months it becomes a year book. The look is a riso-printed nursery picture book: warm paper, aubergine ink, soft colour blocks, crayon doodles, and a little gang of animals that wander through every screen. Every action is a bright blue sticker you want to press.

Build every screen from `tokens.json` and the components on `window.TeddySteps`. Design phone-first at `screen` (390px). The app journeys canvas (55 screens) is the reference for layouts.

## Platform

The reference components here are DOM React. The app and the family page use a React Native version in `packages/ui` with the same names. Its tokens (`npm run tokens`) and the gang, icons and doodles (`npm run art`) are generated from this folder; when they differ, this folder wins.

Differences in the React Native version:

- Events and state: `onPress` instead of `onClick` or `href`. `ChoiceChip` (`selected`) and `Switch` (`value`, `onValueChange`) are controlled. `ScreenHeader` takes `onBack` instead of `back`, plus `topInset`; `TabBar` takes `bottomInset`. `MomentCard` takes an image `source` instead of `src`.
- Drawing: react-native-svg in the app, plain `<svg>` on the family page. Motion uses React Native's `Animated`, not CSS keyframes, and still stops under reduced motion.
- The crayon-grain filter is not rendered yet (planned: on the web as an SVG filter, in the app as baked images).

## Content fundamentals

**Who we talk to.** First-time parents, often tired and holding a baby in one arm. Speak to them as "you". Call the baby by name ("Lotte's trail"). Family members are called what the parent calls them (Oma Ria, Tante Sanne). In-app, the baby's journey is "the trail"; one entry is "a moment"; a first is "a milestone".

**Voice.** Warm, a little cheeky, never clinical. Short sentences, sentence case, exclamation marks for real wins only.

| Say | Don't say |
| --- | --- |
| Pinned to week 31! | Entry saved successfully. |
| This week is still empty! | No data. |
| Typical range, never a target. | Your baby is behind. |
| Invite someone | Add user |
| Free. Really. | 100% free forever!!! |
| Stored in the EU. Never sold, shared or used to train AI. | We take your privacy seriously. |

**Rules.**

- Ranges, not report cards. Every milestone shows a typical window, never a deadline. Detail screens say "not yet is fine" and point to the baby clinic (consultatiebureau) for real worries. Ranges can be hidden.
- Weeks count the trail ("Week 31 of 78"); months describe ranges ("4 to 12 months").
- Handwriting (`note`) is only for people's own words and feelings, never for instructions.
- No emoji. Use `Icon`, `Doodle` and the gang.
- Prices in euros with a comma: €54,95.

## Colour

One theme, **Paper**. Never hard-code a hex; use the tokens.

- **Ground and ink.** `paper` is every screen's ground. `ink` (aubergine) is all text, every outline and every hard shadow. `ink-muted` for secondary text. `card` and `white` for panels, fields and moment cards.
- **Action.** `bluebird` is the only action colour: primary buttons, the + button, a switch that is on. Text on it is `on-bluebird`.
- **Soft blocks.** `lilac`, `pistachio`, `butter`, `cornflower`, `apricot` and `sunshine` fill header bands, photo slots, callouts and avatars. Text on them is always `ink`. Header bands by section: cornflower for the trail, butter for the book, pistachio for family, lilac for settings and onboarding.
- **Accents.** `plum` for italic feeling words in headlines and for destructive actions. `rose` is cheeks, hearts and the drop under the dark button, never text. `forest` and `tomato` are for crayon doodles and book lettering only.
- **The gang's colours** (`caramel`, `tangerine`, `cornflower`, `sunshine` and their `-deep` and `muzzle` partners) belong to the characters. Don't use the deep shades elsewhere.

## Type

- `display-xl` to `title-s` in **Fraunces** with `font-variation-settings: 'SOFT' 100, 'WONK' 1`. Every screen title is `title-l` (30px); celebration screens use `display` (36px). Feeling words go in italic `plum` on marketing pages.
- **Bagel Fat One** (`logo`, `button-lg`, `button-md`, `number`) for the wordmark, every button label, big numbers, avatar initials and book-cover names. Never for paragraphs.
- **Nunito** for everything you read and tap: `row-title`, `body`, `field-label`, `meta`, `eyebrow`, `tab`.
- **Shantell Sans** (`note`, `note-s`) for handwritten notes, rotated about -4deg.
- **Fonts are self-hosted, never loaded from Google Fonts**: bundled in the app (expo-font) and served as Latin-subset WOFF2 on familie.teddysteps.nl. The Google Fonts `@import` in `components/bundle.css` is only for the design boards.
- React Native can't use Fraunces' variable axes, so the app uses static Fraunces instances baked with SOFT 100 and WONK 1.

## Shape, edge and depth

- **Stickers.** Anything you can press or collect has an ink edge (`edge-bold` on buttons, `edge` on cards and fields) and a hard drop: `shadow-lg` on 58px buttons, `shadow-md` on cards, `shadow-sm` on week stickers. Pressing moves it 3px down into its shadow. In React Native the hard drop is `boxShadow` with 0 blur (new architecture).
- **Tilt.** Moment cards and callouts tilt a degree or two, alternating, like postcards on a fridge. Fields, rows and buttons never tilt.
- **Scallops.** Every screen header is a soft-block band with a scalloped bottom edge (`ScreenHeader`), with a character peeking over it.
- Corners: `radius-pill` for buttons, avatars and switches; `radius-l` for cards; `radius-m` for fields; `radius-s` for stickers.
- Gutters: `space-6` (24px) on screens, `space-5` (20px) on the trail. Tap targets at least `tap-min` (44px).

## The gang

Four animals made like hand-cut stickers: one round body, one bold pattern, crayon grain, wobbly edges and the same sweet face. Use `Character`.

| Character | Stands for | Idle motion |
| --- | --- | --- |
| Bo the bear | The baby; hugs and naps | bob |
| Tiggy the tiger | Brave physical firsts: rolling, crawling, steps | sway |
| Bizzy the bee | Busy firsts: food, words, everything | drift |
| Puddle the duck | Cosy things: bath, bed, splashes | hop |

- Four ways to show up: **hero** (big, centre, dancing: welcome and celebrations), **peek** (cropped by a header or card edge), **pattern** (small and scattered behind content), **sidekick** (tiny, next to a line of text).
- At most two heroes per screen. Use the `happy` mood (arc eyes) in celebrations.
- Never over text people need to read. Never add outlines, gradients, teeth or new animals.
- **The Hug** (`Hug`) is the brand symbol: Bo hugging Puddle. It means love sent from family.

## Doodles and motion

- `Doodle` (stars, twinkles, hearts, sparkles, suns, zigzags, squiggles) fill gaps and connect the gang to the content. Two to five per area, never behind body text.
- The gang never stands still: slow loops of 2 to 5 seconds (`bob`, `sway`, `drift`, `hop`, `twinkle`), always offset with `delay` so nobody moves in sync.
- Delight screens (splash, pinned, month birthday, recap, order placed) go full colour with the whole gang dancing. Everything else stays calm enough to use one-handed at 3 a.m.
- Under `prefers-reduced-motion` all loops stop. In the app they follow the system's Reduce Motion setting (`useReducedMotion`).

## Iconography

`Icon` has 33 hand-drawn icons on a 24px grid with a 2.2px round stroke in `currentColor`. Chevrons are 20px in `ink-muted`. In the active tab and on buttons, icons are 22px with a 2.6 stroke. Character SVGs for use outside React are in the Characters asset group.

## Accessibility

- `ink` on `paper` is 13:1; `ink-muted` is 4.8:1 or more on every soft block it sits on; white on `bluebird` is 4.8:1.
- Focus: a 3px solid `ink` ring with a 3px offset on every control (rose fails 3:1 on paper, so it is never the focus colour).
- Switch tracks always carry a 2px ink edge so "off" is visible.
- Characters next to text are decorative (`decorative`); a character that carries meaning gets its name as a label.
