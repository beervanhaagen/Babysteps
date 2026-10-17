# Character

The gang: Bo the bear, Tiggy the tiger, Bizzy the bee and Puddle the duck, crayon-cut and always moving.

Four animals, each with one job: **Bo** stands in for the baby (default idle: bob), **Tiggy** brings brave physical firsts (sway), **Bizzy** brings busy firsts like food and words (drift), **Puddle** brings cosy things like bath and bed (hop).

- Provide: `name` ("bo", "tiggy", "bizzy", "puddle"), `mood` ("default" or "happy" for celebrations; Tiggy also has "still"), `size` in px, `motion` (defaults to the character's own; `null` for still), `delay` 1-3 to offset loops.
- `decorative` hides it from screen readers; use it whenever the character sits beside text that says the same thing.
- `peek` takes an absolute-position style to crop the character over a header or card edge, with `rotate` in degrees.
- At most two heroes per screen; peeks and patterns are free. Never put them over text people need to read. No outlines, gradients, teeth or new animals.
