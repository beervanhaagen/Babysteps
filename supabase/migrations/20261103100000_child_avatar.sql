-- The child's own animal and colour (owner, 3 November 2026): one of the gang on a soft block,
-- shown as the child's avatar in the app and on the family page. The artwork itself is never
-- recoloured; the colour is the circle behind it. A photo avatar (avatar_path) stays unused.
alter table public.children
  add column avatar_animal text not null default 'bo' check (avatar_animal in ('bo', 'tiggy', 'bizzy', 'puddle')),
  add column avatar_tone text not null default 'lilac' check (avatar_tone in ('lilac', 'pistachio', 'butter', 'cornflower', 'sunshine', 'apricot'));

grant update (avatar_animal, avatar_tone) on public.children to authenticated;
