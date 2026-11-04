-- Written reactions ("reacties") under a moment (owner, 3 November 2026; plan tech-architect,
-- docs/bouwplan.md §10 item 17). The whole circle reads them: family and parents. Parents can
-- delete any of them, family their own; no editing. Never in a mail and never as text in a push:
-- the 19:00 push counts them as "iets liefs". Someone who leaves or is taken off the circle takes
-- their reacties along at once. Plain text only, shown with <Text>, never as HTML or a link.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments on delete cascade,
  trail_id uuid not null references public.trails on delete cascade,
  circle_member_id uuid references public.circle_members on delete cascade,
  user_id uuid references auth.users on delete cascade,
  -- Trimmed, 1 to 500 characters, line breaks allowed; no other control characters and no
  -- direction overrides or marks (they can make a text read differently from what it says).
  -- The same list as private.comment_text, which takes them out before this check sees them.
  body text not null check (
    char_length(body) between 1 and 500
    and body = btrim(body, E' \n')
    and body !~ '[\x01-\x09\x0B-\x1F\x7F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]'
  ),
  -- Sent again on a slow connection: the same reactie, not a second one.
  client_id uuid not null,
  created_at timestamptz not null default now(),
  -- For the parents' Knuffels tab, like reactions.
  seen_at timestamptz,
  constraint one_author check ((circle_member_id is null) <> (user_id is null))
);
create index comments_moment on public.comments (moment_id, created_at desc, id);
create index comments_trail on public.comments (trail_id, created_at desc);
create index comments_member on public.comments (circle_member_id, created_at desc) where circle_member_id is not null;
create index comments_user on public.comments (user_id, created_at desc) where user_id is not null;
create unique index comments_member_client on public.comments (circle_member_id, client_id) where circle_member_id is not null;
create unique index comments_user_client on public.comments (user_id, client_id) where user_id is not null;

alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
-- Parents read the reacties on their trail (the Knuffels tab, the export) and mark them seen.
-- Writing and deleting only through the functions below.
create policy "Comments on own trail" on public.comments
  for select to authenticated using (private.is_parent(trail_id));
create policy "Mark comments seen" on public.comments
  for update to authenticated using (private.is_parent(trail_id)) with check (private.is_parent(trail_id));
grant select on public.comments to authenticated;
grant update (seen_at) on public.comments to authenticated;

-- What was typed, made tidy: Windows line ends, spaces before a line break and runs of empty lines
-- go, and the ends are trimmed.
create function private.comment_text(raw text) returns text
language sql immutable set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        -- Tabs become spaces; other control characters and direction overrides go.
        regexp_replace(replace(replace(replace(coalesce(raw, ''), E'\r\n', E'\n'), E'\r', E'\n'), E'\t', ' '),
          '[\x01-\x09\x0B-\x1F\x7F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]', '', 'g'),
        E' +\n', E'\n', 'g'),
      E'\n{3,}', E'\n\n', 'g'),
    E' \n');
$$;
revoke all on function private.comment_text(text) from public, anon, authenticated;

-- The moment a reactie may go on: ready, not deleted, on a trail that isn't being deleted.
create function private.comment_moment(moment uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.trail_id from public.moments m
  join public.trails t on t.id = m.trail_id and t.delete_requested_at is null and t.deleted_at is null
  where m.id = moment and m.status = 'ready' and m.deleted_at is null;
$$;
revoke all on function private.comment_moment(uuid) from public, anon, authenticated;

/*
 * The reacties of one moment as one reader sees them, newest first, `n` (at most 50) before a
 * point (`before_at`, `before_id`) or from the newest. Family authors by the name the parents
 * gave them ("Oma Ria"), parents by their first name. Someone taken off the circle shows nothing.
 */
create function private.comments_of(moment uuid, member uuid, parent uuid, before_at timestamptz, before_id uuid, n integer)
returns table (id uuid, body text, author text, author_kind text, mine boolean, can_delete boolean, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.body,
    coalesce(cm.label, nullif(btrim(pr.first_name), ''), 'Ouder'),
    case when c.circle_member_id is not null then 'family' else 'parent' end,
    coalesce(c.circle_member_id = member, false) or coalesce(c.user_id = parent, false),
    parent is not null or coalesce(c.circle_member_id = member, false),
    c.created_at
  from public.comments c
  left join public.circle_members cm on cm.id = c.circle_member_id
  left join public.profiles pr on pr.id = c.user_id
  where c.moment_id = moment
    and (c.circle_member_id is null or cm.revoked_at is null)
    and (before_at is null or (c.created_at, c.id) < (before_at, coalesce(before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by c.created_at desc, c.id desc
  limit least(greatest(coalesce(n, 30), 1), 50);
$$;
revoke all on function private.comments_of(uuid, uuid, uuid, timestamptz, uuid, integer) from public, anon, authenticated;

-- The limits, for family and parents alike: 20 per person per moment, 100 a day. Enough for a
-- real conversation, not enough to flood a moment.
create function private.comment_allowed(moment uuid, member uuid, parent uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.comments c where c.moment_id = moment
            and (c.circle_member_id = member or c.user_id = parent)) < 20
     and (select count(*) from public.comments c where c.created_at > now() - interval '1 day'
            and (c.circle_member_id = member or c.user_id = parent)) < 100;
$$;
revoke all on function private.comment_allowed(uuid, uuid, uuid) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- Family (through family-api, service role only)
---------------------------------------------------------------------------------------------

create function public.family_comment(member uuid, commented_moment uuid, comment_body text, comment_client uuid)
returns table (id uuid, body text, author text, author_kind text, mine boolean, can_delete boolean, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  member_trail uuid;
  clean text := private.comment_text(comment_body);
  made uuid;
begin
  perform pg_advisory_xact_lock(hashtext(member::text));
  if char_length(clean) not between 1 and 500 or comment_client is null then
    raise exception 'Not a reactie' using errcode = '22023';
  end if;
  select c.trail_id into member_trail from public.circle_members c where c.id = member and c.revoked_at is null;
  if member_trail is null or private.comment_moment(commented_moment) is distinct from member_trail then
    raise exception 'Not a moment you can see' using errcode = '42501';
  end if;
  -- The same reactie sent twice (a retry): the first one back.
  select x.id into made from public.comments x where x.circle_member_id = member and x.client_id = comment_client;
  if made is null then
    if not private.comment_allowed(commented_moment, member, null) then
      raise exception 'Too many reacties' using errcode = '54000';
    end if;
    insert into public.comments (moment_id, trail_id, circle_member_id, body, client_id)
    values (commented_moment, member_trail, member, clean, comment_client)
    returning comments.id into made;
  end if;
  return query select * from private.comments_of(commented_moment, member, null, null, null, 50) r where r.id = made;
end;
$$;

create function public.family_delete_comment(member uuid, comment uuid)
returns boolean
language sql security definer set search_path = ''
as $$
  with gone as (
    delete from public.comments c
    using public.circle_members m
    where c.id = comment and c.circle_member_id = member and m.id = member and m.revoked_at is null
    returning c.id
  )
  select exists (select 1 from gone);
$$;

create function public.family_comments(member uuid, commented_moment uuid, before_at timestamptz, before_id uuid, n integer)
returns table (id uuid, body text, author text, author_kind text, mine boolean, can_delete boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.comment_moment(commented_moment) is distinct from
     (select c.trail_id from public.circle_members c where c.id = member and c.revoked_at is null) then
    raise exception 'Not a moment you can see' using errcode = '42501';
  end if;
  return query select * from private.comments_of(commented_moment, member, null, before_at, before_id, n);
end;
$$;

revoke all on function public.family_comment(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.family_delete_comment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.family_comments(uuid, uuid, timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.family_comment(uuid, uuid, text, uuid) to service_role;
grant execute on function public.family_delete_comment(uuid, uuid) to service_role;
grant execute on function public.family_comments(uuid, uuid, timestamptz, uuid, integer) to service_role;

---------------------------------------------------------------------------------------------
-- Parents (the app, signed in)
---------------------------------------------------------------------------------------------

create function public.add_comment(commented_moment uuid, comment_body text, comment_client uuid)
returns table (id uuid, body text, author text, author_kind text, mine boolean, can_delete boolean, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  trail uuid := private.comment_moment(commented_moment);
  clean text := private.comment_text(comment_body);
  made uuid;
begin
  if me is null or trail is null or not private.is_parent(trail) then
    raise exception 'Not your moment' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext(me::text));
  if char_length(clean) not between 1 and 500 or comment_client is null then
    raise exception 'Not a reactie' using errcode = '22023';
  end if;
  select x.id into made from public.comments x where x.user_id = me and x.client_id = comment_client;
  if made is null then
    if not private.comment_allowed(commented_moment, null, me) then
      raise exception 'Too many reacties' using errcode = '54000';
    end if;
    -- A parent's own reactie is no news for the Knuffels tab.
    insert into public.comments (moment_id, trail_id, user_id, body, client_id, seen_at)
    values (commented_moment, trail, me, clean, comment_client, now())
    returning comments.id into made;
  end if;
  return query select * from private.comments_of(commented_moment, null, me, null, null, 50) r where r.id = made;
end;
$$;

-- Parents can delete any reactie on their trail (also the other parent's and family's).
create function public.delete_comment(comment uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.comments c where c.id = comment and private.is_parent(c.trail_id);
  if not found then
    raise exception 'Not a reactie on your trail' using errcode = '42501';
  end if;
end;
$$;

create function public.moment_comments(commented_moment uuid, before_at timestamptz default null, before_id uuid default null, n integer default 30)
returns table (id uuid, body text, author text, author_kind text, mine boolean, can_delete boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  trail uuid := private.comment_moment(commented_moment);
begin
  if trail is null or not private.is_parent(trail) then
    raise exception 'Not your moment' using errcode = '42501';
  end if;
  return query select * from private.comments_of(commented_moment, null, (select auth.uid()), before_at, before_id, n);
end;
$$;

revoke all on function public.add_comment(uuid, text, uuid) from public, anon;
revoke all on function public.delete_comment(uuid) from public, anon;
revoke all on function public.moment_comments(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.add_comment(uuid, text, uuid) to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
grant execute on function public.moment_comments(uuid, timestamptz, uuid, integer) to authenticated;

---------------------------------------------------------------------------------------------
-- Leaving the circle takes the reacties along, at once (nothing to undo there).
---------------------------------------------------------------------------------------------

create or replace function private.end_membership(member uuid) returns void
language sql security definer set search_path = ''
as $$
  update public.circle_members
    set revoked_at = coalesce(revoked_at, now()), email = null, email_confirmed_at = null, email_frequency = 'never'
    where id = member;
  delete from private.access_keys where circle_member_id = member;
  delete from private.family_sessions where circle_member_id = member;
  delete from public.comments where circle_member_id = member;
$$;

-- A co-parent taken off again within 7 days: their reacties go too (they can't delete them any more).
create or replace function public.remove_joined_parent(invite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  found_invite public.parent_invites;
begin
  select * into found_invite from public.parent_invites i
  where i.id = invite and i.invited_by = (select auth.uid()) and i.accepted_by is not null and i.removed_at is null
    and i.accepted_at > now() - interval '7 days'
  for update;
  if found_invite.id is null then
    raise exception 'Not yours to undo' using errcode = '42501';
  end if;
  delete from public.trail_parents p where p.trail_id = found_invite.trail_id and p.user_id = found_invite.accepted_by;
  delete from public.comments c where c.trail_id = found_invite.trail_id and c.user_id = found_invite.accepted_by;
  update public.parent_invites i set removed_at = now() where i.id = invite;
end;
$$;

---------------------------------------------------------------------------------------------
-- The family page: per moment the number of reacties and the newest three (oldest of them first).
---------------------------------------------------------------------------------------------

drop function public.family_page(uuid, integer, integer);
create function public.family_page(member uuid, skip integer, page_size integer)
returns table (
  id uuid, trail_week smallint, caption text, is_first boolean, first_label text, day date,
  created_at timestamptz, hugs integer, my_hugs integer, photos jsonb, reactions jsonb,
  comment_count integer, comments jsonb
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
           from public.reactions r where r.moment_id = m.id group by r.kind) x),
    (select count(*)::integer from public.comments k
     left join public.circle_members km on km.id = k.circle_member_id
     where k.moment_id = m.id and (k.circle_member_id is null or km.revoked_at is null)),
    (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'body', x.body, 'author', x.author, 'author_kind', x.author_kind,
              'mine', x.mine, 'can_delete', x.can_delete, 'created_at', x.created_at) order by x.created_at, x.id), '[]'::jsonb)
     from private.comments_of(m.id, member, null, null, null, 3) x)
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

-- The 19:00 push: reacties from family count as "iets liefs" (only the first CTE changed).
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
  with love as (
    -- Hugs, icons and reacties from family. A reactie counts as "iets liefs"; its text never goes in a push.
    select r.trail_id, r.moment_id, r.circle_member_id, r.created_at, r.kind = 'hug' as is_hug
    from public.reactions r
    where r.circle_member_id is not null and r.created_at > vanaf and r.created_at <= tot
    union all
    select k.trail_id, k.moment_id, k.circle_member_id, k.created_at, false
    from public.comments k
    where k.circle_member_id is not null and k.created_at > vanaf and k.created_at <= tot
  ), hugs as (
    select p.user_id, c.first_name as child, m.label, count(*)::integer as n, count(*) filter (where r.is_hug)::integer as hug_n, min(r.created_at) as first_at
    from love r
    join public.trail_parents p on p.trail_id = r.trail_id
    join public.trails t on t.id = r.trail_id
    join public.children c on c.trail_id = r.trail_id
    join public.moments mo on mo.id = r.moment_id
    join public.circle_members m on m.id = r.circle_member_id
    join public.profiles pr on pr.id = p.user_id
    where t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
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
