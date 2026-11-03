-- Reacting with our own drawn icons besides the hug (owner, 3 November 2026; plan tech-architect):
-- heart, laugh, wow, star and sun. They float across the screen when sent ("dwarrelen"). Family
-- see totals per kind, as with hugs; parents see who. Pushes name the people, never the icons.

alter table public.reactions drop constraint reactions_kind_check;
alter table public.reactions add constraint reactions_kind_check check (kind in ('hug', 'heart', 'laugh', 'wow', 'star', 'sun'));
-- For the daily cap per person (and a quicker cascade when someone leaves the circle).
create index reactions_member on public.reactions (circle_member_id, created_at desc) where circle_member_id is not null;

-- One reaction from a family member. At most 10 per kind and 30 in all per person per moment, and
-- 300 a day per person: enough to be silly, not enough to flood a parent's Knuffels tab.
create function public.family_react(member uuid, reacted_moment uuid, reaction text)
returns table (kind text, mine integer, total integer)
language plpgsql security definer set search_path = ''
as $$
declare
  member_trail uuid;
begin
  -- One tap at a time per person, so taps sent together can't slip past the caps.
  perform pg_advisory_xact_lock(hashtext(member::text));
  if reaction is null or reaction not in ('hug', 'heart', 'laugh', 'wow', 'star', 'sun') then
    raise exception 'Unknown reaction' using errcode = '22023';
  end if;
  select c.trail_id into member_trail from public.circle_members c where c.id = member and c.revoked_at is null;
  if not exists (
    select 1 from public.moments m
    join public.trails t on t.id = m.trail_id and t.delete_requested_at is null and t.deleted_at is null
    where m.id = reacted_moment and m.trail_id = member_trail and m.status = 'ready' and m.deleted_at is null
  ) then
    raise exception 'Not a moment you can see' using errcode = '42501';
  end if;
  if (select count(*) from public.reactions r where r.moment_id = reacted_moment and r.circle_member_id = member and r.kind = reaction) < 10
     and (select count(*) from public.reactions r where r.moment_id = reacted_moment and r.circle_member_id = member) < 30
     and (select count(*) from public.reactions r where r.circle_member_id = member and r.created_at > now() - interval '1 day') < 300 then
    insert into public.reactions (moment_id, trail_id, circle_member_id, kind) values (reacted_moment, member_trail, member, reaction);
  end if;
  return query
  select r.kind, (count(*) filter (where r.circle_member_id = member))::integer, count(*)::integer
  from public.reactions r where r.moment_id = reacted_moment group by r.kind;
end;
$$;
revoke all on function public.family_react(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.family_react(uuid, uuid, text) to service_role;

-- The family page gets the counts per kind too (hugs and my_hugs stay for older pages).
drop function public.family_page(uuid, integer, integer);
create function public.family_page(member uuid, skip integer, page_size integer)
returns table (
  id uuid, trail_week smallint, caption text, is_first boolean, first_label text, day date,
  created_at timestamptz, hugs integer, my_hugs integer, photos jsonb, reactions jsonb
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.trail_week, m.caption, m.is_first, m.first_label,
    coalesce(m.happened_on, (m.created_at at time zone 'Europe/Amsterdam')::date), m.created_at,
    (select count(*)::integer from public.reactions r where r.moment_id = m.id and r.kind = 'hug'),
    (select count(*)::integer from public.reactions r where r.moment_id = m.id and r.kind = 'hug' and r.circle_member_id = member),
    (select jsonb_agg(jsonb_build_object('position', p.position, 'width', p.width, 'height', p.height, 'view_path', p.view_path, 'small_path', p.small_path) order by p.position)
     from public.moment_photos p where p.moment_id = m.id),
    -- Per kind: {"heart": {"total": 3, "mine": 1}, ...}; only kinds that were sent.
    (select coalesce(jsonb_object_agg(x.kind, jsonb_build_object('total', x.total, 'mine', x.mine)), '{}'::jsonb)
     from (select r.kind, count(*)::integer as total, count(*) filter (where r.circle_member_id = member)::integer as mine
           from public.reactions r where r.moment_id = m.id group by r.kind) x)
  from public.moments m
  join public.circle_members c on c.id = member and c.trail_id = m.trail_id and c.revoked_at is null
  -- Also here, not only at the session: nothing of a trail that is being deleted.
  join public.trails t on t.id = m.trail_id and t.delete_requested_at is null and t.deleted_at is null
  where m.status = 'ready' and m.deleted_at is null
  order by m.trail_week desc, m.created_at desc, m.id
  offset greatest(skip, 0)
  limit least(greatest(page_size, 1), 25);
$$;
revoke all on function public.family_page(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.family_page(uuid, integer, integer) to service_role;

-- The 19:00 push: hugs keep their sentence; with icons in it, "iets liefs".
create function private.push_love_sentence(child text, people text[], total integer, hugs integer)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when hugs = total then private.push_sentence(child, people, total)
    when cardinality(people) = 1 then people[1] || ' stuurde ' || child || ' iets liefs'
    when cardinality(people) = 2 then people[1] || ' en ' || people[2] || ' stuurden ' || child || ' iets liefs'
    else child || ' kreeg vandaag iets liefs van ' || people[1] || ' en ' || (cardinality(people) - 1) || ' anderen'
  end;
$$;
revoke all on function private.push_love_sentence(text, text[], integer, integer) from public, anon, authenticated;

create or replace function public.push_digest(at timestamptz default now())
returns table (token text, platform text, apns_sandbox boolean, body text, kind text)
language plpgsql security definer set search_path = ''
as $$
declare
  local timestamp := at at time zone 'Europe/Amsterdam';
  today date := local::date;
  -- Pinned to the clock, so a summer/winter time change neither skips nor doubles an hour.
  vanaf timestamptz := ((local::date - 1) + time '19:00') at time zone 'Europe/Amsterdam';
  tot timestamptz := (local::date + time '19:00') at time zone 'Europe/Amsterdam';
begin
  if extract(hour from local) <> 19 then
    return;
  end if;

  return query
  with hugs as (
    select p.user_id, c.first_name as child, m.label, count(*)::integer as n, count(*) filter (where r.kind = 'hug')::integer as hug_n, min(r.created_at) as first_at
    from public.reactions r
    join public.trail_parents p on p.trail_id = r.trail_id
    join public.trails t on t.id = r.trail_id
    join public.children c on c.trail_id = r.trail_id
    join public.moments mo on mo.id = r.moment_id
    join public.circle_members m on m.id = r.circle_member_id
    join public.profiles pr on pr.id = p.user_id
    where r.circle_member_id is not null
      and r.created_at > vanaf and r.created_at <= tot
      and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
      and mo.deleted_at is null and pr.notify_reactions
    group by p.user_id, c.first_name, m.label
  ), per_parent as (
    select h.user_id, min(h.child) as child, array_agg(h.label order by h.first_at) as people, sum(h.n)::integer as total, sum(h.hug_n)::integer as hugs
    from hugs h
    group by h.user_id
  ), claimed as (
    insert into private.push_digest_sent (user_id, day, kind)
    select pp.user_id, today, 'daily' from per_parent pp
    on conflict do nothing
    returning user_id
  )
  select k.token, k.platform, k.apns_sandbox, private.push_love_sentence(pp.child, pp.people, pp.total, pp.hugs), 'daily'::text
  from claimed cl
  join per_parent pp on pp.user_id = cl.user_id
  join private.push_tokens k on k.user_id = cl.user_id;

  -- A parent who came back (opened the app or pinned) since the last seintje starts afresh.
  update private.nudge_state ns set ignored_in_row = 0, answered = true
  where ns.last_sent_on is not null and (ns.ignored_in_row > 0 or not ns.answered) and (
    exists (select 1 from private.push_tokens k where k.user_id = ns.user_id and k.last_seen_on >= ns.last_sent_on)
    or exists (select 1 from public.moments m where m.created_by = ns.user_id and m.created_at > ((ns.last_sent_on + time '19:00') at time zone 'Europe/Amsterdam'))
  );

  return query
  with base as (
    -- One trail per parent (a parent on two trails gets one seintje, for the oldest).
    select distinct on (p.user_id) p.user_id, p.trail_id, c.first_name as child, c.birth_date as birth,
      ((today - c.birth_date) / 7 + 1)::integer as week,
      ((today - c.birth_date) % 7)::integer as day_of_week,
      (today - (pr.created_at at time zone 'Europe/Amsterdam')::date)::integer as since_signup,
      (coalesce(ns.ignored_in_row, 0) + case when coalesce(ns.answered, true) then 0 else 1 end)::integer as ignored,
      coalesce(ns.kring_sent, 0) as kring_sent,
      ns.kring_last_on,
      coalesce(ns.start_sent, 0) as start_sent,
      ns.last_sent_on,
      coalesce(ns.inhalen_sent, false) as inhalen_sent,
      -- Seintjes already sent in this trail week (the digest log keeps 7 days).
      (select count(*) from private.push_digest_sent s
       where s.user_id = p.user_id and s.kind <> 'daily' and s.day >= today - (today - c.birth_date) % 7)::integer as this_week
    from public.trail_parents p
    join public.trails t on t.id = p.trail_id
    join public.children c on c.trail_id = p.trail_id
    join public.profiles pr on pr.id = p.user_id
    left join private.nudge_state ns on ns.user_id = p.user_id
    where pr.notify_nudges
      and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
      and c.birth_date is not null and c.birth_date <= today and (today - c.birth_date) / 7 + 1 <= 78
      and exists (select 1 from private.push_tokens k where k.user_id = p.user_id)
      -- Opened the app today, or anyone pinned since yesterday 19:00: they're here already.
      and not exists (select 1 from private.push_tokens k where k.user_id = p.user_id and k.last_seen_on >= today)
      and not exists (select 1 from public.moments m where m.trail_id = p.trail_id and m.created_at > vanaf)
      -- Hugs (or an earlier run) took today.
      and not exists (select 1 from private.push_digest_sent s where s.user_id = p.user_id and s.day = today)
    order by p.user_id, p.joined_at
  ), facts as (
    select b.*,
      exists (select 1 from public.moments m where m.trail_id = b.trail_id and m.deleted_at is null) as has_any,
      exists (select 1 from public.moments m where m.trail_id = b.trail_id and m.deleted_at is null and m.trail_week = b.week) as week_full,
      exists (select 1 from public.moments m where m.trail_id = b.trail_id and m.deleted_at is null and m.trail_week < b.week) as has_older,
      (select min((m.created_at at time zone 'Europe/Amsterdam')::date) from public.moments m where m.trail_id = b.trail_id) as first_on,
      exists (select 1 from public.circle_members cm where cm.trail_id = b.trail_id and cm.revoked_at is null) as has_circle,
      -- Whole months, with a birthday on the 31st falling on the last day of shorter months.
      (select max(n) from generate_series(0, 24) n where (b.birth + n * interval '1 month')::date <= today)::integer as months
    from base b
    -- In the parent's first 4 weeks two seintjes per trail week, after that one.
    where b.this_week < case when b.since_signup < 28 then 2 else 1 end
  ), picked as (
    select f.*, case
      when f.ignored >= 6 then
        case when f.months >= 1 and (f.birth + f.months * interval '1 month')::date = today and f.week >= 5 then 'terug' end
      -- Not on the exact day? Then the first evening after (a busy new parent opens the app a lot).
      when not f.has_any then
        case when f.start_sent < 3 and f.since_signup >= (array[1, 4, 18])[f.start_sent + 1]
          and (f.last_sent_on is null or f.last_sent_on <= today - 3) then 'start' end
      when not f.has_circle and f.ignored < 3 and (
        (f.kring_sent = 0 and today - f.first_on >= 3) or (f.kring_sent = 1 and f.kring_last_on <= today - 14)
      ) then 'kring'
      when not f.inhalen_sent and f.ignored < 3 and f.week >= 3 and not f.has_older and f.day_of_week = 1 then 'inhalen'
      when f.day_of_week = 6 and not f.week_full and (f.ignored < 3 or f.week % 2 = 0) then 'week'
      when f.day_of_week = 3 and not f.week_full and f.since_signup < 28 and f.ignored < 3 then 'idee'
    end as nudge
    from facts f
  ), claimed as (
    insert into private.push_digest_sent (user_id, day, kind)
    select pk.user_id, today, pk.nudge from picked pk where pk.nudge is not null
    on conflict do nothing
    returning user_id
  ), remembered as (
    insert into private.nudge_state as ns (user_id, last_sent_on, answered, ignored_in_row, kring_sent, kring_last_on, start_sent, inhalen_sent)
    select pk.user_id, today, false, 0, (pk.nudge = 'kring')::integer, case when pk.nudge = 'kring' then today end,
      (pk.nudge = 'start')::integer, pk.nudge = 'inhalen'
    from picked pk join claimed cl on cl.user_id = pk.user_id
    on conflict (user_id) do update set
      last_sent_on = excluded.last_sent_on,
      ignored_in_row = ns.ignored_in_row + case when ns.answered then 0 else 1 end,
      answered = false,
      kring_sent = ns.kring_sent + excluded.kring_sent,
      kring_last_on = coalesce(excluded.kring_last_on, ns.kring_last_on),
      start_sent = ns.start_sent + excluded.start_sent,
      inhalen_sent = ns.inhalen_sent or excluded.inhalen_sent
    returning user_id
  )
  select k.token, k.platform, k.apns_sandbox,
    private.nudge_sentence(pk.nudge, pk.child, private.trail_streak(pk.trail_id, pk.week), pk.months,
      -- The start seintjes go in order: first, second, third.
      case when pk.nudge = 'start' then (array[1, 4, 18])[pk.start_sent + 1] else pk.since_signup end, pk.week),
    pk.nudge
  from picked pk
  join remembered r on r.user_id = pk.user_id
  join private.push_tokens k on k.user_id = pk.user_id;
end;
$$;
