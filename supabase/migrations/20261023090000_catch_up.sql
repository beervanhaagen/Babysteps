-- O6 Inhalen (plan tech-architect 21 October 2026, decisions owner): catching up older weeks is
-- N ordinary moments through the queue, so no new tables. Two rules on the server:
-- 1. at most 100 new moments per trail per 24 hours (create_moment), a safety net for storage;
-- 2. the Sunday mail only counts moments of this week or last: older weeks pinned now (a
--    catch-up, or "Oudere weken" on A1) show on the family page in their week, not as news.

-- True when a moment was pinned in its own week or the week after (Amsterdam time, from the birth).
create function private.pinned_on_time(trail uuid, week smallint, pinned timestamptz)
returns boolean
language sql stable set search_path = ''
as $$
  -- No birth date (or no child row): count it, rather than leave news out.
  select coalesce((
    select week >= floor(((pinned at time zone 'Europe/Amsterdam')::date - c.birth_date) / 7) + 1 - 1
    from public.children c where c.trail_id = trail
  ), true);
$$;
revoke all on function private.pinned_on_time(uuid, smallint, timestamptz) from public, anon, authenticated;

create or replace function public.create_moment(
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
    -- A safety net for storage (O6 catch-up, a stuck loop): at most 100 new moments per trail
    -- per 24 hours. Not permanent: the queue tries again later.
    if (select count(*) from public.moments m where m.trail_id = expected_trail and m.created_at > now() - interval '24 hours') >= 100 then
      raise exception 'Too many moments today' using errcode = '54000';
    end if;
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

create or replace function public.family_sunday_mail(at timestamptz default now())
returns table (send_id uuid, member uuid, email text, label text, child text, moment_count integer, moments jsonb)
language plpgsql security definer set search_path = ''
as $$
declare
  local timestamp := at at time zone 'Europe/Amsterdam';
  sunday date := local::date;
  since timestamptz := ((local::date - 7) + time '20:00') at time zone 'Europe/Amsterdam';
  -- Up to this Sunday 20:00, so a retry later that evening sends the same moments, and a moment
  -- ready at 21:00 waits for next week instead of showing up twice.
  until timestamptz := (local::date + time '20:00') at time zone 'Europe/Amsterdam';
begin
  if extract(isodow from local) <> 7 or extract(hour from local) < 20 then
    return;
  end if;
  insert into private.mail_sends (circle_member_id, week)
  select c.id, sunday
  from public.circle_members c
  join public.trails t on t.id = c.trail_id
  where c.email is not null and c.email_confirmed_at is not null and c.revoked_at is null
    and c.email_frequency in ('weekly', 'each')
    and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
    and exists (
      select 1 from public.moments m
      where m.trail_id = c.trail_id and m.status = 'ready' and m.deleted_at is null and m.ready_at > since and m.ready_at <= until
        and private.pinned_on_time(m.trail_id, m.trail_week, m.created_at)
    )
  on conflict (circle_member_id, week) do nothing;

  return query
  select s.id, c.id, c.email, c.label, ch.first_name,
    (select count(*)::integer from public.moments m
     where m.trail_id = c.trail_id and m.status = 'ready' and m.deleted_at is null and m.ready_at > since and m.ready_at <= until
        and private.pinned_on_time(m.trail_id, m.trail_week, m.created_at)),
    (select coalesce(jsonb_agg(jsonb_build_object('week', w.trail_week, 'first', w.is_first, 'label', w.first_label, 'caption', w.caption) order by w.ready_at), '[]'::jsonb)
     from (
       select m.trail_week, m.is_first, m.first_label, m.caption, m.ready_at from public.moments m
       where m.trail_id = c.trail_id and m.status = 'ready' and m.deleted_at is null and m.ready_at > since and m.ready_at <= until
        and private.pinned_on_time(m.trail_id, m.trail_week, m.created_at)
       order by m.ready_at desc limit 5
     ) w)
  from private.mail_sends s
  join public.circle_members c on c.id = s.circle_member_id
  join public.trails t on t.id = c.trail_id
  join public.children ch on ch.trail_id = c.trail_id
  where s.week = sunday and s.sent_at is null
    -- Checked again for retries: paused, deleted or unsubscribed since the first run means no mail.
    and c.email is not null and c.email_confirmed_at is not null and c.revoked_at is null
    and c.email_frequency in ('weekly', 'each')
    and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
  -- At most 300 per call; the job runs every 10 minutes on Sunday evening.
  order by s.created_at, s.id
  limit 300;
end;
$$;
