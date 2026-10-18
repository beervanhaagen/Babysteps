-- Fixes from the step 4 review (tech-architect, 20 October 2026).

-- IP addresses for the rate limit are kept as a hash, for one hour only.
truncate private.claim_failures;
alter table private.claim_failures rename column ip to ip_hash;

-- A session lasts 180 days after its last use, also on the server.
create or replace function public.family_member(session_hash text)
returns table (member uuid, member_trail uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  found_member uuid;
  found_trail uuid;
  seen date;
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  select c.id, c.trail_id, c.last_seen_on into found_member, found_trail, seen
  from private.family_sessions s
  join public.circle_members c on c.id = s.circle_member_id
  join public.trails t on t.id = c.trail_id
  where s.token_hash = session_hash and s.revoked_at is null and s.last_used_on >= today - 180
    and c.revoked_at is null and t.paused_at is null and t.delete_requested_at is null;
  if found_member is null then
    return;
  end if;
  update private.family_sessions set last_used_on = today where token_hash = session_hash and last_used_on <> today;
  if seen is distinct from today then
    update public.circle_members set last_seen_on = today where id = found_member;
    insert into public.family_visits_daily (trail_id, day, count) values (found_trail, today, 1)
      on conflict (trail_id, day) do update set count = public.family_visits_daily.count + 1;
  end if;
  return query select found_member, found_trail;
end;
$$;

-- Opening the link again on a device that is already in creates no new session; at most
-- 5 devices per person, and a sixth is refused instead of pushing someone out.
drop function public.family_claim(text, text, text, text);

create function public.family_claim(code_hash text, session_hash text, device text, ip text, existing_session_hash text)
returns table (member uuid, status text)
language plpgsql security definer set search_path = ''
as $$
declare
  found_member uuid;
  hashed_ip text := encode(extensions.digest(coalesce(ip, ''), 'sha256'), 'hex');
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  delete from private.claim_failures where at < now() - interval '1 hour';
  if (select count(*) from private.claim_failures f where f.ip_hash = hashed_ip and f.at > now() - interval '10 minutes') >= 20
     or (select count(*) from private.claim_failures f where f.at > now() - interval '10 minutes') >= 1000 then
    return query select null::uuid, 'blocked';
    return;
  end if;
  select k.circle_member_id into found_member
  from private.access_keys k
  join public.circle_members c on c.id = k.circle_member_id
  join public.trails t on t.id = c.trail_id
  where k.token_hash = code_hash and k.kind = 'invite' and k.revoked_at is null and c.revoked_at is null
    and t.paused_at is null and t.delete_requested_at is null;
  if found_member is null then
    insert into private.claim_failures (ip_hash) values (hashed_ip);
    return query select null::uuid, 'unknown';
    return;
  end if;
  if existing_session_hash is not null and exists (
    select 1 from private.family_sessions s
    where s.token_hash = existing_session_hash and s.circle_member_id = found_member
      and s.revoked_at is null and s.last_used_on >= today - 180
  ) then
    return query select found_member, 'same';
    return;
  end if;
  if (select count(*) from private.family_sessions s
      where s.circle_member_id = found_member and s.revoked_at is null and s.last_used_on >= today - 180) >= 5 then
    return query select found_member, 'full';
    return;
  end if;
  insert into private.family_sessions (circle_member_id, token_hash, device_hint) values (found_member, session_hash, left(device, 40));
  return query select found_member, 'ok';
end;
$$;

-- "Nieuwe link sturen": the old link and every device stop; the person simply opens the new link.
create or replace function public.new_family_link(member uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  new_code text := private.new_code();
begin
  if not exists (
    select 1 from public.circle_members c where c.id = member and c.revoked_at is null and private.is_parent(c.trail_id)
  ) then
    raise exception 'Not your circle' using errcode = '42501';
  end if;
  update private.access_keys set revoked_at = now() where circle_member_id = member and kind = 'invite' and revoked_at is null;
  update private.family_sessions set revoked_at = now() where circle_member_id = member and revoked_at is null;
  insert into private.access_keys (circle_member_id, kind, token_hash) values (member, 'invite', private.hash(new_code));
  return new_code;
end;
$$;

-- Taken out of the circle (by a parent, or by themselves): nothing to reach them by stays behind.
create function private.end_membership(member uuid) returns void
language sql security definer set search_path = ''
as $$
  update public.circle_members
    set revoked_at = coalesce(revoked_at, now()), email = null, email_confirmed_at = null, email_frequency = 'never'
    where id = member;
  update private.access_keys set revoked_at = now() where circle_member_id = member and revoked_at is null;
  update private.family_sessions set revoked_at = now() where circle_member_id = member and revoked_at is null;
$$;

create or replace function public.revoke_family(member uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.circle_members c where c.id = member and private.is_parent(c.trail_id)) then
    raise exception 'Not your circle' using errcode = '42501';
  end if;
  perform private.end_membership(member);
end;
$$;

-- "Ik wil niet meer meekijken" on the family page.
create function public.family_leave(member uuid)
returns void
language sql security definer set search_path = ''
as $$
  select private.end_membership(member);
$$;

-- One page of postcards: at most 12, with hug counts counted in the database, older ones on request.
create function public.family_page(member uuid, skip integer, page_size integer)
returns table (
  id uuid, trail_week smallint, caption text, is_first boolean, first_label text, day date,
  created_at timestamptz, hugs integer, my_hugs integer, photos jsonb
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.trail_week, m.caption, m.is_first, m.first_label,
    coalesce(m.happened_on, (m.created_at at time zone 'Europe/Amsterdam')::date), m.created_at,
    (select count(*)::integer from public.reactions r where r.moment_id = m.id and r.kind = 'hug'),
    (select count(*)::integer from public.reactions r where r.moment_id = m.id and r.kind = 'hug' and r.circle_member_id = member),
    (select jsonb_agg(jsonb_build_object('position', p.position, 'width', p.width, 'height', p.height, 'view_path', p.view_path, 'small_path', p.small_path) order by p.position)
     from public.moment_photos p where p.moment_id = m.id)
  from public.moments m
  join public.circle_members c on c.id = member and c.trail_id = m.trail_id and c.revoked_at is null
  where m.status = 'ready' and m.deleted_at is null
  order by m.trail_week desc, m.created_at desc, m.id
  offset greatest(skip, 0)
  limit least(greatest(page_size, 1), 25);
$$;

-- A hug answers with the new counts, so the page doesn't have to load everything again.
drop function public.family_hug(uuid, uuid);

create function public.family_hug(member uuid, hugged_moment uuid)
returns table (mine integer, total integer)
language plpgsql security definer set search_path = ''
as $$
declare
  member_trail uuid;
  my_count integer;
begin
  select c.trail_id into member_trail from public.circle_members c where c.id = member and c.revoked_at is null;
  if not exists (
    select 1 from public.moments m
    where m.id = hugged_moment and m.trail_id = member_trail and m.status = 'ready' and m.deleted_at is null
  ) then
    raise exception 'Not a moment you can see' using errcode = '42501';
  end if;
  select count(*) into my_count from public.reactions r where r.moment_id = hugged_moment and r.circle_member_id = member and r.kind = 'hug';
  if my_count < 10 then
    insert into public.reactions (moment_id, trail_id, circle_member_id, kind) values (hugged_moment, member_trail, member, 'hug');
  end if;
  return query select
    (select count(*)::integer from public.reactions r where r.moment_id = hugged_moment and r.circle_member_id = member and r.kind = 'hug'),
    (select count(*)::integer from public.reactions r where r.moment_id = hugged_moment and r.kind = 'hug');
end;
$$;

revoke all on function
  public.family_claim(text, text, text, text, text), public.family_leave(uuid),
  public.family_page(uuid, integer, integer), public.family_hug(uuid, uuid)
  from public, anon, authenticated;
grant execute on function
  public.family_claim(text, text, text, text, text), public.family_leave(uuid),
  public.family_page(uuid, integer, integer), public.family_hug(uuid, uuid)
  to service_role;
