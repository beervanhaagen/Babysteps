-- Seintjes for parents (owner, 21 October 2026; plan tech-architect and design-reviewer): small
-- nudges back to the trail, inside the existing push digest. The rules that keep them friendly:
--   - one push per parent per day, everything included, only at 19:00 Amsterdam time; hugs win;
--   - never on a day the parent opened the app, or when anyone pinned on the trail since yesterday 19:00;
--   - in the parent's first 4 weeks at most 2 a week (an idea midweek, the seintje on the last day
--     of the trail week, both only while that week is empty); after that only the seintje;
--   - once: invite family (from 3 days after the first moment, again 2 weeks later), catch up older weeks;
--   - not pinned anything yet: from day 1, 4 and 18 after signing up (iOS delivers these quietly);
--   - all of it within the weekly maximum, counted per trail week;
--   - ignored 3 in a row: the seintje every other week, no extras; 6: only on the month birthday.
--     Opening the app or pinning resets it. Off with M5 "Seintjes" (profiles.notify_nudges).
-- A push holds one sentence with the child's first name only; never a photo, caption or week number.
-- A streak count ("12 weken op rij") is allowed (owner, 21 October 2026).

alter table public.profiles rename column notify_sunday to notify_nudges;

-- What kind of push went out that day: 'daily' (hugs) or a seintje.
alter table private.push_digest_sent add column kind text not null default 'daily';

-- Per parent: the last seintje and whether the parent came back since. Operational, not analytics.
create table private.nudge_state (
  user_id uuid primary key references auth.users on delete cascade,
  last_sent_on date,
  -- False until the parent opens the app or pins after the last seintje.
  answered boolean not null default true,
  ignored_in_row smallint not null default 0,
  kring_sent smallint not null default 0,
  kring_last_on date,
  start_sent smallint not null default 0,
  inhalen_sent boolean not null default false
);
alter table private.nudge_state enable row level security;

-- Weeks in a row with a moment, ending last week (catch-up moments count).
create function private.trail_streak(trail uuid, this_week integer)
returns integer
language sql stable set search_path = ''
as $$
  select coalesce((this_week - 1) - max(w), this_week - 1)
  from generate_series(1, this_week - 1) w
  where not exists (select 1 from public.moments m where m.trail_id = trail and m.trail_week = w and m.deleted_at is null);
$$;

-- The sentence for a seintje. `variant` rotates the lines so the same one never comes twice in a row.
create function private.nudge_sentence(kind text, child text, streak integer, months integer, since_signup integer, variant integer)
returns text
language sql immutable set search_path = ''
as $$
  select case kind
    when 'week' then case
      when streak >= 2 then streak || ' weken op rij een moment van ' || child || '. Nog iets vastpinnen voor deze week?'
      else (array[
        'Deze week van ' || child || ' is nog leeg. Eén foto is al genoeg.',
        'Een slaperige foto telt ook. Nog eentje van ' || child || ' voor deze week?',
        'Hoe was deze week met ' || child || '? Eén foto en één zinnetje, klaar.'
      ])[variant % 3 + 1] end
    when 'idee' then (array[
      'Klein idee: het handje van ' || child || ' om je vinger. Eén foto is genoeg.',
      'Een geeuw, een handje, een badje: alles telt. Iets van ' || child || ' vastpinnen?',
      'Hoe slaapt ' || child || ' nu? Over een jaar wil je dat terugzien.',
      'De voetjes van ' || child || ' zijn nu nog zo klein. Even vastleggen?'
    ])[variant % 4 + 1]
    when 'kring' then (array[
      'Wie wil ' || child || ' zien groeien? Stuur opa of oma een linkje, dan kijken ze mee.',
      'Het pad van ' || child || ' is nog alleen van jou. Zin om opa en oma erbij te halen?'
    ])[variant % 2 + 1]
    when 'inhalen' then 'Je fotorol zit vol met ' || child || '. Haal de oudere weken erbij?'
    when 'start' then case
      when since_signup <= 1 then 'Het pad van ' || child || ' staat klaar. Eén foto en één zinnetje, meer hoeft niet.'
      when since_signup <= 4 then 'Het hoeft niet bijzonder te zijn. Een handje, een slaapje: pin het eerste moment van ' || child || ' vast.'
      else 'Staan er al foto’s van ' || child || ' op je telefoon? Met Inhalen zet je ze in één keer in de goede week.' end
    when 'terug' then child || ' is vandaag ' || case when months = 1 then 'een maand' when months = 12 then 'een jaar' else months || ' maanden' end || '. Het pad wacht rustig op je. Oudere foto’s kunnen er ook nog op.'
  end;
$$;

drop function public.push_digest(timestamptz);

-- What to send now: only in the 19:00 hour in Amsterdam, once per parent per day. First the hug
-- digest (as in step 5), then the seintjes for parents who got no hug push today.
-- Claiming happens here, so a second run in the same day returns nothing.
create function public.push_digest(at timestamptz default now())
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
    select p.user_id, c.first_name as child, m.label, count(*)::integer as n, min(r.created_at) as first_at
    from public.reactions r
    join public.trail_parents p on p.trail_id = r.trail_id
    join public.trails t on t.id = r.trail_id
    join public.children c on c.trail_id = r.trail_id
    join public.moments mo on mo.id = r.moment_id
    join public.circle_members m on m.id = r.circle_member_id
    join public.profiles pr on pr.id = p.user_id
    where r.kind = 'hug' and r.circle_member_id is not null
      and r.created_at > vanaf and r.created_at <= tot
      and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
      and mo.deleted_at is null and pr.notify_reactions
    group by p.user_id, c.first_name, m.label
  ), per_parent as (
    select h.user_id, min(h.child) as child, array_agg(h.label order by h.first_at) as people, sum(h.n)::integer as total
    from hugs h
    group by h.user_id
  ), claimed as (
    insert into private.push_digest_sent (user_id, day, kind)
    select pp.user_id, today, 'daily' from per_parent pp
    on conflict do nothing
    returning user_id
  )
  select k.token, k.platform, k.apns_sandbox, private.push_sentence(pp.child, pp.people, pp.total), 'daily'::text
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

revoke all on function public.push_digest(timestamptz) from public, anon, authenticated;
grant execute on function public.push_digest(timestamptz) to service_role;
revoke all on function private.trail_streak(uuid, integer), private.nudge_sentence(text, text, integer, integer, integer, integer) from public, anon, authenticated;
