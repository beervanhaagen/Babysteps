# FirstLabel and FirstIcon

A first on a card, T2 and A3b: a calm label ("Eerste keer · Los gezeten", or just "Eerste hapje" when the label says it already) with a small line icon in the colour of its kind. It replaces the yellow "Eerste keer!" sticker (Pad 2.0).

The firsts, their kinds, colours and icons live in `packages/core/src/firsts.ts` (wording checked by child-development-reviewer). We store only the label; `firstLook(label)` finds the icon and colour, and a first the parent typed gets a star on butter. Never show counts or "x of 37": it's a list to choose from, not a checklist.

- Provide: `label`, `icon` (24×24 path data), `tone` (a soft block). `FirstIcon` takes `icon`, `tone`, `size` and `iconSize` (44/24 on A3b's tiles, 26/16 in the grid).
