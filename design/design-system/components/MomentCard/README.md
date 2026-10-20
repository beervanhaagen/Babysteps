# MomentCard

A moment on the trail as a page in a photo album (Pad 2.0): straight, one ink edge, the photos to the edge, the parent's line as the title, a calm first-time label, and the date and hugs at the bottom.

Photos sit at a fixed height (196px) in fixed layouts: one fills the card, two side by side, three or more as one large and two small, with "+N" on the last tile. With no photo yet, a soft block with a happy character. `layout: "compact"` puts one photo (104px) beside the words, for the other moments of a week. Cards never tilt; the `tilt` prop is gone.

- Provide: `photos` (urls; the first three show) and `photoCount`, `alt`, `caption`, optional `first` (`{ label, icon, tone }`: icon is 24×24 path data, tone a soft block), `date` ("za 17 okt"), `hugs`, `layout`, `href`. The landing page's `week`, `note`, `tint` and `character` still work.
