-- Step 3: moments, their photos and private storage (docs/bouwplan.md §3 and §4).
-- The phone makes the photo versions itself (no metadata, no GPS). The server decides every
-- storage path, so a parent can only ever upload into their own trail's folder.

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails on delete cascade,
  created_by uuid references auth.users on delete set null,
  -- Made on the phone, so a retry from the offline queue never creates a second moment.
  client_id uuid not null unique,
  trail_week smallint not null check (trail_week between 1 and 104),
  -- The day of the first photo, for the book. Null if the phone didn't know.
  happened_on date,
  caption text check (char_length(caption) <= 500),
  is_first boolean not null default false,
  first_label text check (char_length(btrim(first_label)) between 1 and 60),
  -- The milestone map comes in v1.1.
  milestone_key text,
  -- 'uploading' until every view and small version is in storage; family only sees 'ready'.
  status text not null default 'uploading' check (status in ('uploading', 'ready')),
  photo_count smallint not null check (photo_count between 1 and 10),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  deleted_at timestamptz,
  constraint first_has_label check (not is_first or first_label is not null)
);
create index moments_trail on public.moments (trail_id, trail_week desc, created_at desc);

create table public.moment_photos (
  moment_id uuid not null references public.moments on delete cascade,
  trail_id uuid not null references public.trails on delete cascade,
  position smallint not null check (position between 0 and 9),
  taken_at date,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  print_long_edge integer not null check (print_long_edge between 1 and 6000),
  print_path text not null,
  view_path text not null,
  small_path text not null,
  print_uploaded_at timestamptz,
  primary key (moment_id, position),
  constraint paths_in_own_trail check (
    print_path like trail_id::text || '/%' and view_path like trail_id::text || '/%' and small_path like trail_id::text || '/%'
  )
);

alter table public.moments enable row level security;
alter table public.moment_photos enable row level security;
revoke all on public.moments, public.moment_photos from anon, authenticated;

-- Parents read the moments and photos of their own trail. Writes go through the functions below.
create policy "Moments of own trail" on public.moments
  for select to authenticated using (private.is_parent(trail_id) and deleted_at is null);
create policy "Change own moments" on public.moments
  for update to authenticated using (private.is_parent(trail_id) and deleted_at is null) with check (private.is_parent(trail_id));
grant select on public.moments to authenticated;
-- Editing words and week (T8 in step 9); status, paths and deletion only through functions.
grant update (caption, is_first, first_label, trail_week) on public.moments to authenticated;

create policy "Photos of own trail" on public.moment_photos
  for select to authenticated using (private.is_parent(trail_id));
grant select on public.moment_photos to authenticated;

---------------------------------------------------------------------------------------------
-- Storage: two private buckets. `print` is never shown to family; `view` holds the
-- 1280px WebP and the 600px JPEG that the app, the family page and e-mails use.
---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('print', 'print', false, 26214400, array['image/jpeg']),
  ('view', 'view', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- A parent may write an object only at a path the server handed out for a moment that is
-- still theirs, and read only what is in their own trail's folder.
create function private.may_upload(bucket text, object_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.moment_photos p
    join public.moments m on m.id = p.moment_id
    where m.deleted_at is null
      and private.is_parent(p.trail_id)
      and ((bucket = 'print' and p.print_path = object_name)
        or (bucket = 'view' and object_name in (p.view_path, p.small_path)))
  );
$$;

create function private.may_read(object_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trail_parents p
    where p.user_id = (select auth.uid()) and p.trail_id::text = split_part(object_name, '/', 1)
  );
$$;

revoke all on function private.may_upload(text, text), private.may_read(text) from public, anon;
grant execute on function private.may_upload(text, text), private.may_read(text) to authenticated;

create policy "Parents read own photos" on storage.objects
  for select to authenticated using (bucket_id in ('print', 'view') and private.may_read(name));
create policy "Parents upload to handed-out paths" on storage.objects
  for insert to authenticated with check (bucket_id in ('print', 'view') and private.may_upload(bucket_id, name));
-- Overwriting is needed when a retry follows a half-finished upload.
create policy "Parents retry uploads" on storage.objects
  for update to authenticated
  using (bucket_id in ('print', 'view') and private.may_upload(bucket_id, name))
  with check (bucket_id in ('print', 'view') and private.may_upload(bucket_id, name));

---------------------------------------------------------------------------------------------
-- A1 to A4: pin a moment. Safe to call again with the same client_id (offline queue).
---------------------------------------------------------------------------------------------

create function public.create_moment(
  moment_client_id uuid,
  moment_trail_week smallint,
  moment_happened_on date,
  moment_caption text,
  moment_is_first boolean,
  moment_first_label text,
  -- [{ "taken_at": "2026-05-03" | null, "width": 1280, "height": 960, "print_long_edge": 3600 }, ...]
  photos jsonb
)
returns table (moment_id uuid, photo_position smallint, print_path text, view_path text, small_path text)
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_trail uuid;
  new_moment uuid;
  photo jsonb;
  i smallint := 0;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  select tp.trail_id into my_trail from public.trail_parents tp where tp.user_id = me limit 1;
  if my_trail is null then
    raise exception 'No trail' using errcode = '42501';
  end if;
  if jsonb_typeof(photos) <> 'array' or jsonb_array_length(photos) not between 1 and 10 then
    raise exception 'Between 1 and 10 photos' using errcode = '22023';
  end if;

  select m.id into new_moment from public.moments m where m.client_id = moment_client_id and m.trail_id = my_trail;
  if new_moment is null then
    insert into public.moments (trail_id, created_by, client_id, trail_week, happened_on, caption, is_first, first_label, photo_count)
    values (
      my_trail, me, moment_client_id, moment_trail_week, moment_happened_on,
      nullif(btrim(moment_caption), ''), moment_is_first,
      case when moment_is_first then nullif(btrim(moment_first_label), '') end,
      jsonb_array_length(photos)
    )
    returning id into new_moment;

    for photo in select value from jsonb_array_elements(photos) loop
      insert into public.moment_photos (moment_id, trail_id, position, taken_at, width, height, print_long_edge, print_path, view_path, small_path)
      values (
        new_moment, my_trail, i, (photo ->> 'taken_at')::date,
        (photo ->> 'width')::integer, (photo ->> 'height')::integer, (photo ->> 'print_long_edge')::integer,
        format('%s/%s/%s-print.jpg', my_trail, new_moment, i),
        format('%s/%s/%s-view.webp', my_trail, new_moment, i),
        format('%s/%s/%s-small.jpg', my_trail, new_moment, i)
      );
      i := i + 1;
    end loop;
  end if;

  return query
    select p.moment_id, p.position, p.print_path, p.view_path, p.small_path
    from public.moment_photos p where p.moment_id = new_moment order by p.position;
end;
$$;

-- After the uploads: the server checks storage itself before it believes the phone.
-- part 'view': every view and small version is there, so the moment becomes visible.
-- part 'print': every print version is there (needed for export and the book).
create function public.finish_upload(finished_moment uuid, part text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  missing integer;
begin
  if not exists (
    select 1 from public.moments m where m.id = finished_moment and m.deleted_at is null and private.is_parent(m.trail_id)
  ) then
    raise exception 'Not your moment' using errcode = '42501';
  end if;

  if part = 'view' then
    select count(*) into missing from public.moment_photos p
    where p.moment_id = finished_moment
      and (not exists (select 1 from storage.objects o where o.bucket_id = 'view' and o.name = p.view_path)
        or not exists (select 1 from storage.objects o where o.bucket_id = 'view' and o.name = p.small_path));
    if missing = 0 then
      update public.moments set status = 'ready', ready_at = coalesce(ready_at, now()) where id = finished_moment;
    end if;
  elsif part = 'print' then
    update public.moment_photos p set print_uploaded_at = coalesce(p.print_uploaded_at, now())
    where p.moment_id = finished_moment
      and exists (select 1 from storage.objects o where o.bucket_id = 'print' and o.name = p.print_path);
    select count(*) into missing from public.moment_photos p where p.moment_id = finished_moment and p.print_uploaded_at is null;
  else
    raise exception 'Unknown part' using errcode = '22023';
  end if;

  return case when missing = 0 then 'done' else 'missing' end;
end;
$$;

revoke all on function public.create_moment(uuid, smallint, date, text, boolean, text, jsonb), public.finish_upload(uuid, text) from public, anon;
grant execute on function public.create_moment(uuid, smallint, date, text, boolean, text, jsonb), public.finish_upload(uuid, text) to authenticated;
