-- Fixes from the step 3 review (tech-architect, 19 October 2026).

-- Each path exists once, and uploads find their row fast.
create unique index moment_photos_print_path on public.moment_photos (print_path);
create unique index moment_photos_view_path on public.moment_photos (view_path);
create unique index moment_photos_small_path on public.moment_photos (small_path);

-- Uploads stop as soon as a trail is being deleted (M7, step 8).
create or replace function private.may_upload(bucket text, object_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.moment_photos p
    join public.moments m on m.id = p.moment_id
    join public.trails t on t.id = p.trail_id
    where m.deleted_at is null
      and t.delete_requested_at is null
      and private.is_parent(p.trail_id)
      and ((bucket = 'print' and p.print_path = object_name)
        or (bucket = 'view' and object_name in (p.view_path, p.small_path)))
  );
$$;

-- The phone says which trail it is working for. If the signed-in parent has another trail
-- (someone else signed in on this phone), the moment is refused instead of landing there.
drop function public.create_moment(uuid, smallint, date, text, boolean, text, jsonb);

create function public.create_moment(
  expected_trail uuid,
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
  new_moment uuid;
  photo jsonb;
  i smallint := 0;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.trail_parents tp join public.trails t on t.id = tp.trail_id
    where tp.user_id = me and tp.trail_id = expected_trail and t.delete_requested_at is null
  ) then
    raise exception 'Not your trail' using errcode = '42501';
  end if;
  if jsonb_typeof(photos) <> 'array' or jsonb_array_length(photos) not between 1 and 10 then
    raise exception 'Between 1 and 10 photos' using errcode = '22023';
  end if;

  select m.id into new_moment from public.moments m where m.client_id = moment_client_id and m.trail_id = expected_trail;
  if new_moment is null then
    insert into public.moments (trail_id, created_by, client_id, trail_week, happened_on, caption, is_first, first_label, photo_count)
    values (
      expected_trail, me, moment_client_id, moment_trail_week, moment_happened_on,
      nullif(btrim(moment_caption), ''), moment_is_first,
      case when moment_is_first then nullif(btrim(moment_first_label), '') end,
      jsonb_array_length(photos)
    )
    returning id into new_moment;

    for photo in select value from jsonb_array_elements(photos) loop
      insert into public.moment_photos (moment_id, trail_id, position, taken_at, width, height, print_long_edge, print_path, view_path, small_path)
      values (
        new_moment, expected_trail, i, (photo ->> 'taken_at')::date,
        (photo ->> 'width')::integer, (photo ->> 'height')::integer, (photo ->> 'print_long_edge')::integer,
        format('%s/%s/%s-print.jpg', expected_trail, new_moment, i),
        format('%s/%s/%s-view.webp', expected_trail, new_moment, i),
        format('%s/%s/%s-small.jpg', expected_trail, new_moment, i)
      );
      i := i + 1;
    end loop;
  elsif exists (select 1 from public.moments m where m.id = new_moment and m.deleted_at is not null) then
    raise exception 'Moment was deleted' using errcode = 'P0002';
  end if;

  return query
    select p.moment_id, p.position, p.print_path, p.view_path, p.small_path
    from public.moment_photos p where p.moment_id = new_moment order by p.position;
end;
$$;

revoke all on function public.create_moment(uuid, uuid, smallint, date, text, boolean, text, jsonb) from public, anon;
grant execute on function public.create_moment(uuid, uuid, smallint, date, text, boolean, text, jsonb) to authenticated;

-- Finishing an upload goes through the edge function `finish-upload`, which first reads the
-- start of every file and refuses anything with EXIF, XMP or the wrong file type. So the
-- phone can't call this directly any more; the function calls it on the parent's behalf.
drop function public.finish_upload(uuid, text);

create function public.finish_upload(parent uuid, finished_moment uuid, part text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  missing integer;
begin
  if exists (select 1 from public.moments m where m.id = finished_moment and m.deleted_at is not null) then
    raise exception 'Moment was deleted' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.moments m join public.trail_parents tp on tp.trail_id = m.trail_id
    where m.id = finished_moment and tp.user_id = parent
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

revoke all on function public.finish_upload(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.finish_upload(uuid, uuid, text) to service_role;
