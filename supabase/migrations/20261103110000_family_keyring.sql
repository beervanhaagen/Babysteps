-- The keyring (owner, 3 November 2026; plan tech-architect): one browser can follow several
-- children, e.g. Oma with two grandchildren from different parents. The cookie holds up to six
-- session tokens, each still exactly one person in one circle; the server never links the trails.
-- Before this, opening a second grandchild's link replaced the first session, and switching back
-- and forth made a new device session every time until "Deze link is al vaak geopend".

-- Opening a link: "the same device" when any session on it belongs to this person already.
create or replace function public.family_claim(code_hash text, session_hash text, device text, ip text, existing_session_hashes text[])
returns table (member uuid, status text)
language plpgsql security definer set search_path = ''
as $$
declare
  found_member uuid;
  found_key uuid;
  found_kind text;
  hashed_ip text := encode(extensions.digest(coalesce(ip, ''), 'sha256'), 'hex');
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  delete from private.claim_failures where at < now() - interval '1 hour';
  if (select count(*) from private.claim_failures f where f.ip_hash = hashed_ip and f.at > now() - interval '10 minutes') >= 20
     or (select count(*) from private.claim_failures f where f.at > now() - interval '10 minutes') >= 1000 then
    return query select null::uuid, 'blocked';
    return;
  end if;
  select k.circle_member_id, k.id, k.kind into found_member, found_key, found_kind
  from private.access_keys k
  join public.circle_members c on c.id = k.circle_member_id
  join public.trails t on t.id = c.trail_id
  where k.token_hash = code_hash and k.kind in ('invite', 'email_signin') and k.revoked_at is null
    and (k.expires_at is null or k.expires_at > now())
    and c.revoked_at is null and t.paused_at is null and t.delete_requested_at is null;
  if found_member is null then
    insert into private.claim_failures (ip_hash) values (hashed_ip);
    return query select null::uuid, 'unknown';
    return;
  end if;
  if exists (
    select 1 from private.family_sessions s
    where s.token_hash = any(coalesce(existing_session_hashes, '{}')) and s.circle_member_id = found_member
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
  if found_kind = 'email_signin' then
    update private.access_keys set revoked_at = now() where id = found_key;
  end if;
  return query select found_member, 'ok';
end;
$$;

-- The sessions of a browser that still work, in cookie order. A trail that is paused or in its
-- 30 days before deletion keeps its keys ("Toch bewaren" brings family back), but they open
-- nothing until then (`paused`).
create or replace function private.keyring_valid(session_hashes text[])
returns table (hash text, ord integer, member uuid, trail uuid, seen date, paused boolean)
language sql stable security definer set search_path = ''
as $$
  select s.token_hash, h.ord::integer, c.id, c.trail_id, c.last_seen_on, t.paused_at is not null or t.delete_requested_at is not null
  from unnest(coalesce(session_hashes, '{}')) with ordinality as h(hash, ord)
  join private.family_sessions s on s.token_hash = h.hash
  join public.circle_members c on c.id = s.circle_member_id
  join public.trails t on t.id = c.trail_id and t.deleted_at is null
  where s.revoked_at is null and s.last_used_on >= (now() at time zone 'Europe/Amsterdam')::date - 180
    and c.revoked_at is null;
$$;
revoke all on function private.keyring_valid(text[]) from public, anon, authenticated;

-- Every request: which sessions on this browser still work (so the cookie can drop dead ones),
-- and which one is asked for (X-Kring, a circle member id). Only a session whose token is in the
-- cookie, and whose trail isn't paused, can be chosen: a made-up member id gets nothing. Without a
-- wish, the last one claimed. Only the chosen one counts as a visit.
create or replace function public.family_member_in(session_hashes text[], wanted uuid)
returns table (member uuid, member_trail uuid, session_hash text, chosen boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Amsterdam')::date;
  pick text;
  pick_member uuid;
  pick_trail uuid;
  seen date;
begin
  select v.hash, v.member, v.trail, v.seen into pick, pick_member, pick_trail, seen
  from private.keyring_valid(session_hashes) v
  where not v.paused and (wanted is null or v.member = wanted)
  order by v.ord desc
  limit 1;

  if pick is not null then
    update private.family_sessions set last_used_on = today where token_hash = pick and last_used_on <> today;
    if seen is distinct from today then
      update public.circle_members set last_seen_on = today where id = pick_member;
      insert into public.family_visits_daily (trail_id, day, count) values (pick_trail, today, 1)
        on conflict (trail_id, day) do update set count = public.family_visits_daily.count + 1;
    end if;
  end if;

  return query select v.member, v.trail, v.hash, v.hash is not distinct from pick from private.keyring_valid(session_hashes) v order by v.ord;
end;
$$;

-- The start page ("Wie wil je zien?") when a browser follows more than one child. Read only:
-- opening it is no visit to any of the trails. New this week leaves out catch-up moments, like
-- the Sunday mail.
create or replace function public.family_keyring(session_hashes text[])
returns table (member uuid, label text, first_name text, birth_date date, avatar_animal text, avatar_tone text, new_this_week integer)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.label, ch.first_name, ch.birth_date, ch.avatar_animal, ch.avatar_tone,
    (select count(*)::integer from public.moments m
     where m.trail_id = c.trail_id and m.status = 'ready' and m.deleted_at is null and m.created_at > now() - interval '7 days'
       and private.pinned_on_time(m.trail_id, m.trail_week, m.created_at))
  from unnest(coalesce(session_hashes, '{}')) with ordinality as h(hash, ord)
  join private.family_sessions s on s.token_hash = h.hash
  join public.circle_members c on c.id = s.circle_member_id
  join public.trails t on t.id = c.trail_id and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
  join public.children ch on ch.trail_id = c.trail_id
  where s.revoked_at is null and s.last_used_on >= (now() at time zone 'Europe/Amsterdam')::date - 180
    and c.revoked_at is null
  order by h.ord;
$$;

-- Which keys of a browser still exist (paused ones too), without counting a visit: for a new
-- key on a full ring.
create or replace function public.family_keys_alive(session_hashes text[])
returns setof text
language sql stable security definer set search_path = ''
as $$
  select v.hash from private.keyring_valid(session_hashes) v order by v.ord;
$$;

-- A working key pushed off a full ring (a seventh child): its session ends, so it no longer
-- counts towards the five devices or shows in the parents' device list (M3).
create or replace function public.family_forget_session(session_hash text)
returns void
language sql security definer set search_path = ''
as $$
  update private.family_sessions set revoked_at = now() where token_hash = session_hash and revoked_at is null;
$$;

revoke all on function public.family_claim(text, text, text, text, text[]), public.family_member_in(text[], uuid), public.family_keyring(text[]),
  public.family_keys_alive(text[]), public.family_forget_session(text)
  from public, anon, authenticated;
grant execute on function public.family_claim(text, text, text, text, text[]), public.family_member_in(text[], uuid), public.family_keyring(text[]),
  public.family_keys_alive(text[]), public.family_forget_session(text)
  to service_role;
