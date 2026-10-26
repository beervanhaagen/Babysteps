# MomentCard

A moment on the trail as a page in a photo album (Pad 2.0): straight, one ink edge, the photos to the edge, the parent's line as the title, a calm first-time label, and the date and hugs at the bottom.

Photos sit at a fixed height (196px) in fixed layouts: one fills the card, two side by side, three or more as one large and two small, with "+N" on the last tile. With no photo yet, a soft block with a happy character. `layout: "compact"` puts one photo (104px) beside the words, for the other moments of a week. Cards never tilt; the `tilt` prop is gone.

**On the timeline (T1, since 25 October 2026)** the mosaic card is back, beside the dotted path, with `photoHeight` (React Native) at about 0.8 of the card's width. With `onPress`, each tile calls `onPress(photo)` with its own photo, so the big view (`PhotoViewer`, T2b) opens right there; the card itself stays the one link for screen readers and keyboards. `layout: "album"` (one big photo at a time to swipe through, 21 to 25 October 2026) is no longer used on the trail.

- Provide: `photos` (urls; the first three show) and `photoCount`, `alt`, `caption`, optional `first` (`{ label, icon, tone }`: icon is 24×24 path data, tone a soft block), `date` ("za 17 okt"), `hugs`, `layout`, `href`. The landing page's `week`, `note`, `tint` and `character` still work.
