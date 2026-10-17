# ScreenHeader

The coloured band on top of every screen, with a scalloped edge and a peeking character.

One header per screen. Band colours by section: cornflower for the trail, pistachio for family, lilac for settings and onboarding, butter for the book, sunshine for celebrations.

- Provide: `title` (always `title-l`), optional `subtitle`, `back` (true or a link), `step` ([current, total]) for onboarding, `color` (a soft-block token), `character` to peek in the top-right, `action` for a right-hand control.
- Celebration screens (splash, pinned, order placed) drop the band and go full colour.
