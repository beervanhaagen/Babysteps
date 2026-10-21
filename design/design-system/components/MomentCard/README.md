# MomentCard

A moment on the trail as a page in a photo album (Pad 2.0): straight, one ink edge, the photos to the edge, the parent's line as the title, a calm first-time label, and the date and hugs at the bottom.

Photos sit at a fixed height (196px) in fixed layouts: one fills the card, two side by side, three or more as one large and two small, with "+N" on the last tile. With no photo yet, a soft block with a happy character. `layout: "compact"` puts one photo (104px) beside the words, for the other moments of a week. Cards never tilt; the `tilt` prop is gone.

**Album (Pad 3.0, the trail's card since 21 October 2026).** `layout: "album"` (React Native only for now) shows one big photo (400px) at a time to swipe through, with "N foto’s" top right and dots at the bottom; each photo and the words call `onPress(photo)` with the photo shown, so the week (T2b) opens right there. The 196px mosaic and the compact card stay for the landing page and later use.

- Provide: `photos` (urls; the first three show) and `photoCount`, `alt`, `caption`, optional `first` (`{ label, icon, tone }`: icon is 24×24 path data, tone a soft block), `date` ("za 17 okt"), `hugs`, `layout`, `href`. The landing page's `week`, `note`, `tint` and `character` still work.
