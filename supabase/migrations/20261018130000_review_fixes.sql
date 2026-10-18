-- Fixes from the step 2 review (tech-architect, 18 October 2026).

-- New functions are not executable by everyone. Revoking per schema can't undo Postgres'
-- global default (EXECUTE for PUBLIC), so revoke it for the role that creates them.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres revoke execute on functions from anon;

-- A photo path always points inside the child's own trail folder, and only server
-- functions set it (step 3), so no parent can point it at someone else's photo.
revoke update (avatar_path) on public.children from authenticated;
alter table public.children
  add constraint avatar_in_own_trail check (avatar_path is null or avatar_path like trail_id::text || '/%');

-- A birth date is never in the future, also when M1 edits it later.
create function private.check_child() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.birth_date > (now() at time zone 'Europe/Amsterdam')::date then
    raise exception 'Birth date in the future' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger check_child before insert or update of birth_date on public.children
  for each row execute function private.check_child();

-- create_trail is safe to call twice: a double tap or a retry after a lost answer returns
-- the trail that was already made, instead of an error or a second trail.
create or replace function public.create_trail(child_first_name text, child_birth_date date, child_due_date date)
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
  -- One at a time per parent.
  perform 1 from public.profiles where id = me for update;

  select trail_id into new_trail from public.trail_parents where user_id = me limit 1;
  if new_trail is not null then
    return new_trail;
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
