# PhotoViewer

T2b, the big view of the trail (owner, 25 October 2026), the same in the parents' app and on the family page. React Native only (`packages/ui/src/viewer.tsx`); there is no web bundle version.

Every photo of the trail in one row, oldest first, each shown whole on ink. Swipe, tap the photo like a story (right 65% on, left 35% back; hidden from screen readers), use the arrow keys on a laptop (Escape closes), or the paper `Button`s below: "Vorige" and "Volgende", or "Week 29" and "Week 31" when the step crosses into another week ("1j 4w" after the first year, so the buttons fit). Empty weeks are skipped. When a moment has more photos, segments and a "2/3" pill on top of the photo count that moment's photos (owner, 3 November 2026); the header says the week ("Week 30", or "1 jaar en 4 weken" after the first birthday) with its days.

The strip under the header has every week from `from` (default 1) to `now` on a dotted rail: weeks with photos are a dot with the number, empty weeks a short stretch of rail, and Bo stands on the ink dot of the week in view, without a circle. It scrolls sideways and follows along; a tap jumps straight to that week.

- Provide: `weekName` and `weekShort` (from core), `photos` (oldest first; each with `key`, `week`, `index` and `count` in its moment, the rendered `photo`, `caption`, optional `first`, `date`, `hugs`, an `overlay` on the photo such as the options button, and something `below` the words such as the family's "Knuffelen"), `start` (`{ key, week }`), `now`, `span(week)` for the days, `onClose` and `closeLabel`.
- Optional: `addPage` (the last page when this week is still empty: "Deze week is nog leeg!"), `onEmptyNow`, `banner` (offline), `waiting` ("Even laden…"), `from`, `topInset`, `bottomInset`.
- Accessibility: only the page in view is there for screen readers; every change is announced ("Week 30, foto 2 van 5: …"); scrolling doesn't animate under reduced motion, and a jump from the strip never scrolls past the photos in between.
