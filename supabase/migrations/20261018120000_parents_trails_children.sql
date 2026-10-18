-- Step 2: parents, trails and children (docs/bouwplan.md §3).
-- Every table has row level security on. Nothing is open to `anon`. Parents only ever see
-- their own trail. Writes that create things go through security-definer functions.

-- The API exposes only what we choose; GraphQL would also reveal table and column names.
drop extension if exists pg_graphql;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Nothing in public is readable without a policy, and anon never gets table rights.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon, public;

---------------------------------------------------------------------------------------------
-- Tables
---------------------------------------------------------------------------------------------

-- One row per parent. First name only: we never ask for or keep surnames.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text check (first_name is null or char_length(btrim(first_name)) between 1 and 40),
  analytics_opt_out boolean not null default false,
  notify_sunday boolean not null default true,
  notify_reactions boolean not null default true,
  notify_month boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.trails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- M6 "Familie mag foto's bewaren": off by default.
  family_may_keep_photos boolean not null default false,
  paused_at timestamptz,
  delete_requested_at timestamptz,
  purge_after timestamptz,
  deleted_at timestamptz
);

-- One child per trail at launch. Weeks on the trail count from birth_date,
-- leaps from due_date (packages/core/src/weeks.ts).
create table public.children (
  trail_id uuid primary key references public.trails on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  -- Empty while "Nog onderweg".
  birth_date date,
  due_date date not null,
  avatar_path text,
  leap_cards_on boolean not null default true,
  -- Born at most 20 weeks before or 8 weeks after the due date.
  constraint birth_near_due_date check (birth_date is null or birth_date between due_date - 140 and due_date + 56)
);

create table public.trail_parents (
  trail_id uuid not null references public.trails on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (trail_id, user_id)
);
create index trail_parents_user_id on public.trail_parents (user_id);

---------------------------------------------------------------------------------------------
-- Who may see what
---------------------------------------------------------------------------------------------

-- Security definer, so the policy on trail_parents can use it without recursion.
create function private.is_parent(trail uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trail_parents p where p.trail_id = trail and p.user_id = (select auth.uid())
  );
$$;
grant usage on schema private to authenticated;
revoke all on function private.is_parent(uuid) from public, anon;
grant execute on function private.is_parent(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.trails enable row level security;
alter table public.children enable row level security;
alter table public.trail_parents enable row level security;

revoke all on public.profiles, public.trails, public.children, public.trail_parents from anon, authenticated;

-- Parents read and change their own profile; it is created by the trigger below.
create policy "Own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Change own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update (first_name, analytics_opt_out, notify_sunday, notify_reactions, notify_month) on public.profiles to authenticated;

-- Parents see their own trail. Deletion columns only change through functions (step 8).
create policy "Own trail" on public.trails
  for select to authenticated using (private.is_parent(id));
create policy "Change own trail" on public.trails
  for update to authenticated using (private.is_parent(id)) with check (private.is_parent(id));
grant select on public.trails to authenticated;
grant update (family_may_keep_photos) on public.trails to authenticated;

create policy "Own child" on public.children
  for select to authenticated using (private.is_parent(trail_id));
create policy "Change own child" on public.children
  for update to authenticated using (private.is_parent(trail_id)) with check (private.is_parent(trail_id));
grant select on public.children to authenticated;
grant update (first_name, birth_date, due_date, avatar_path, leap_cards_on) on public.children to authenticated;

-- Parents see who else is a parent of their trail.
create policy "Parents of own trail" on public.trail_parents
  for select to authenticated using (private.is_parent(trail_id));
grant select on public.trail_parents to authenticated;

---------------------------------------------------------------------------------------------
-- No surnames: Apple and Google send a full name and a photo; we drop them on arrival.
---------------------------------------------------------------------------------------------

create function private.forget_names(data jsonb) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(data, '{}'::jsonb)
    - 'name' - 'full_name' - 'given_name' - 'family_name' - 'middle_name' - 'nickname'
    - 'preferred_username' - 'user_name' - 'avatar_url' - 'picture';
$$;

create function private.scrub_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.raw_user_meta_data := private.forget_names(new.raw_user_meta_data);
  return new;
end;
$$;

create function private.scrub_identity() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.identity_data := private.forget_names(new.identity_data);
  return new;
end;
$$;

create trigger scrub_names before insert or update of raw_user_meta_data on auth.users
  for each row execute function private.scrub_user();
create trigger scrub_names before insert or update of identity_data on auth.identities
  for each row execute function private.scrub_identity();

-- Every new parent gets an empty profile.
create function private.create_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger create_profile after insert on auth.users
  for each row execute function private.create_profile();

---------------------------------------------------------------------------------------------
-- O2: start a trail for a child, in one go.
---------------------------------------------------------------------------------------------

create function public.create_trail(child_first_name text, child_birth_date date, child_due_date date)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_trail uuid;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  -- One trail per parent at launch (siblings come later, M2).
  if exists (select 1 from public.trail_parents where user_id = me) then
    raise exception 'Already has a trail' using errcode = '23505';
  end if;
  if child_birth_date > (now() at time zone 'Europe/Amsterdam')::date then
    raise exception 'Birth date in the future' using errcode = '22023';
  end if;

  insert into public.trails default values returning id into new_trail;
  insert into public.children (trail_id, first_name, birth_date, due_date)
    values (new_trail, btrim(child_first_name), child_birth_date, child_due_date);
  insert into public.trail_parents (trail_id, user_id) values (new_trail, me);
  return new_trail;
end;
$$;

revoke all on function public.create_trail(text, date, date) from public, anon;
grant execute on function public.create_trail(text, date, date) to authenticated;
