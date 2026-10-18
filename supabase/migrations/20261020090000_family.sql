-- Step 4: family (docs/bouwplan.md §3, §4; docs/family-email.md, "Family page sign-in").
-- Family has no database login. Parents invite people and get a personal link once; the
-- family page swaps the code for a session cookie through the edge function `family-api`,
-- which calls the family_* functions below with the service role. Codes and session
-- tokens are only ever stored as SHA-256 hashes.

create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails on delete cascade,
  -- What the child calls them: "Oma Ria". First names only, as everywhere.
  label text not null check (char_length(btrim(label)) between 1 and 40),
  relation text check (relation in ('oma', 'opa', 'oom', 'tante', 'vriend', 'vriendin', 'peetoom', 'peettante', 'anders')),
  -- Empty for "Liever niet". Postcards only after confirming (step 7).
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  email_confirmed_at timestamptz,
  email_frequency text not null default 'weekly' check (email_frequency in ('each', 'weekly', 'never')),
  invited_by uuid references auth.users on delete set null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  revoked_at timestamptz,
  -- One date, no visit history (docs/analytics.md).
  last_seen_on date,
  book_list_at timestamptz
);
create index circle_members_trail on public.circle_members (trail_id);

create table private.access_keys (
  id uuid primary key default gen_random_uuid(),
  circle_member_id uuid not null references public.circle_members on delete cascade,
  kind text not null check (kind in ('invite')),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table private.family_sessions (
  id uuid primary key default gen_random_uuid(),
  circle_member_id uuid not null references public.circle_members on delete cascade,
  token_hash text not null unique,
  device_hint text check (char_length(device_hint) <= 40),
  created_at timestamptz not null default now(),
  last_used_on date not null default current_date,
  revoked_at timestamptz
);

-- Failed link codes per IP, for a simple rate limit; kept one day.
create table private.claim_failures (
  ip text not null,
  at timestamptz not null default now()
);
create index claim_failures_ip on private.claim_failures (ip, at);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments on delete cascade,
  trail_id uuid not null references public.trails on delete cascade,
  circle_member_id uuid references public.circle_members on delete cascade,
  user_id uuid references auth.users on delete cascade,
  kind text not null check (kind in ('hug')),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  constraint one_sender check ((circle_member_id is null) <> (user_id is null))
);
create index reactions_moment on public.reactions (moment_id);
create index reactions_trail on public.reactions (trail_id, created_at desc);

-- One number per trail per day: how many family visits, never who or when.
create table public.family_visits_daily (
  trail_id uuid not null references public.trails on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (trail_id, day)
);

alter table public.circle_members enable row level security;
alter table public.reactions enable row level security;
alter table public.family_visits_daily enable row level security;
alter table private.access_keys enable row level security;
alter table private.family_sessions enable row level security;
alter table private.claim_failures enable row level security;
revoke all on public.circle_members, public.reactions, public.family_visits_daily from anon, authenticated;

-- Parents see their circle and the reactions on their trail. Inviting, revoking and family
-- writes all go through functions.
create policy "Circle of own trail" on public.circle_members
  for select to authenticated using (private.is_parent(trail_id));
grant select on public.circle_members to authenticated;

create policy "Reactions on own trail" on public.reactions
  for select to authenticated using (private.is_parent(trail_id));
create policy "Mark reactions seen" on public.reactions
  for update to authenticated using (private.is_parent(trail_id)) with check (private.is_parent(trail_id));
grant select on public.reactions to authenticated;
grant update (seen_at) on public.reactions to authenticated;

---------------------------------------------------------------------------------------------
-- Parents: invite, new link, revoke (O3, F1, M3)
---------------------------------------------------------------------------------------------

create function private.new_code() returns text
language sql volatile set search_path = ''
as $$
  -- 32 random bytes, URL-safe.
  select translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
$$;

create function private.hash(code text) returns text
language sql immutable set search_path = ''
as $$
  select encode(extensions.digest(code, 'sha256'), 'hex');
$$;

-- Returns the personal link code once; only its hash is kept.
create function public.invite_family(member_label text, member_relation text)
returns table (member_id uuid, code text)
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_trail uuid;
  new_member uuid;
  new_code text := private.new_code();
begin
  select tp.trail_id into my_trail from public.trail_parents tp where tp.user_id = me order by tp.joined_at limit 1;
  if my_trail is null then
    raise exception 'No trail' using errcode = '42501';
  end if;
  insert into public.circle_members (trail_id, label, relation, invited_by)
    values (my_trail, btrim(member_label), nullif(member_relation, ''), me)
    returning id into new_member;
  insert into private.access_keys (circle_member_id, kind, token_hash) values (new_member, 'invite', private.hash(new_code));
  return query select new_member, new_code;
end;
$$;

-- "Opnieuw sturen": a fresh link; the old one stops working, devices already in stay in.
create function public.new_family_link(member uuid)
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
  update private.access_keys set revoked_at = now() where circle_member_id = member and revoked_at is null;
  insert into private.access_keys (circle_member_id, kind, token_hash) values (member, 'invite', private.hash(new_code));
  return new_code;
end;
$$;

-- "Intrekken": the person's link and every device stop working at once.
create function public.revoke_family(member uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.circle_members c where c.id = member and private.is_parent(c.trail_id)) then
    raise exception 'Not your circle' using errcode = '42501';
  end if;
  update public.circle_members set revoked_at = coalesce(revoked_at, now()) where id = member;
  update private.access_keys set revoked_at = now() where circle_member_id = member and revoked_at is null;
  update private.family_sessions set revoked_at = now() where circle_member_id = member and revoked_at is null;
end;
$$;

revoke all on function public.invite_family(text, text), public.new_family_link(uuid), public.revoke_family(uuid) from public, anon;
grant execute on function public.invite_family(text, text), public.new_family_link(uuid), public.revoke_family(uuid) to authenticated;

---------------------------------------------------------------------------------------------
-- Family page, through the edge function only (service role)
---------------------------------------------------------------------------------------------

-- The member behind a session, if everything is still allowed. Counts the visit once a day.
create function public.family_member(session_hash text)
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
  where s.token_hash = session_hash and s.revoked_at is null and c.revoked_at is null
    and t.paused_at is null and t.delete_requested_at is null;
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

-- Swaps a link code for a new session (the edge function makes the token and sets the cookie).
-- Returns null for an unknown code, or when this IP tried too many wrong codes.
create function public.family_claim(code_hash text, session_hash text, device text, ip text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  member uuid;
begin
  delete from private.claim_failures where at < now() - interval '1 day';
  if (select count(*) from private.claim_failures f where f.ip = family_claim.ip and f.at > now() - interval '10 minutes') >= 20 then
    return null;
  end if;
  select k.circle_member_id into member
  from private.access_keys k
  join public.circle_members c on c.id = k.circle_member_id
  join public.trails t on t.id = c.trail_id
  where k.token_hash = code_hash and k.kind = 'invite' and k.revoked_at is null and c.revoked_at is null
    and t.delete_requested_at is null;
  if member is null then
    insert into private.claim_failures (ip) values (family_claim.ip);
    return null;
  end if;
  insert into private.family_sessions (circle_member_id, token_hash, device_hint) values (member, session_hash, left(device, 40));
  -- At most 5 devices per person: the oldest drops out.
  update private.family_sessions set revoked_at = now()
  where id in (
    select s.id from private.family_sessions s
    where s.circle_member_id = member and s.revoked_at is null
    order by s.created_at desc offset 5
  );
  return member;
end;
$$;

-- F2: who they are and how often they want a postcard.
create function public.family_join(member uuid, member_label text, member_email text, frequency text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.circle_members set
    label = coalesce(nullif(btrim(member_label), ''), label),
    -- "Liever niet" keeps no address at all.
    email = case when frequency = 'never' then null else nullif(lower(btrim(member_email)), '') end,
    email_confirmed_at = case when frequency = 'never' or lower(btrim(member_email)) is distinct from email then null else email_confirmed_at end,
    email_frequency = frequency,
    joined_at = coalesce(joined_at, now())
  where id = member and revoked_at is null;
end;
$$;

-- F3/F4: a hug; at most 10 per person per moment, only on visible moments of their trail.
create function public.family_hug(member uuid, hugged_moment uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  member_trail uuid;
  mine integer;
begin
  select c.trail_id into member_trail from public.circle_members c where c.id = member and c.revoked_at is null;
  if not exists (
    select 1 from public.moments m
    where m.id = hugged_moment and m.trail_id = member_trail and m.status = 'ready' and m.deleted_at is null
  ) then
    raise exception 'Not a moment you can see' using errcode = '42501';
  end if;
  select count(*) into mine from public.reactions r where r.moment_id = hugged_moment and r.circle_member_id = member and r.kind = 'hug';
  if mine < 10 then
    insert into public.reactions (moment_id, trail_id, circle_member_id, kind) values (hugged_moment, member_trail, member, 'hug');
    mine := mine + 1;
  end if;
  return mine;
end;
$$;

-- F4 "Laat het me weten": on the book list.
create function public.family_book_list(member uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.circle_members set book_list_at = coalesce(book_list_at, now()) where id = member and revoked_at is null;
$$;

revoke all on function
  public.family_member(text), public.family_claim(text, text, text, text), public.family_join(uuid, text, text, text),
  public.family_hug(uuid, uuid), public.family_book_list(uuid)
  from public, anon, authenticated;
grant execute on function
  public.family_member(text), public.family_claim(text, text, text, text), public.family_join(uuid, text, text, text),
  public.family_hug(uuid, uuid), public.family_book_list(uuid)
  to service_role;
