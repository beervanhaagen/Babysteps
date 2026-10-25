-- M1 "Profiel van Lotte" (step 8, plan tech-architect 25 October 2026): parents edit the name and
-- dates (the O2 form in edit mode). When the birth date changes, the weeks of the trail shift:
-- every moment still in the week its own day gave it moves along; a moment a parent moved to
-- another week by hand (T8) stays where they put it. Its day is the photo's day, or else the day
-- it was pinned (as on the family page). Afterwards nothing sits in a week that hasn't come yet.
create function private.renumber_weeks()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  this_week integer := floor(((now() at time zone 'Europe/Amsterdam')::date - new.birth_date) / 7.0)::integer + 1;
begin
  update public.moments m
  set trail_week = least(greatest(floor((coalesce(m.happened_on, (m.created_at at time zone 'Europe/Amsterdam')::date) - new.birth_date) / 7.0)::integer + 1, 1), 104)
  where m.trail_id = new.trail_id
    and m.trail_week = floor((coalesce(m.happened_on, (m.created_at at time zone 'Europe/Amsterdam')::date) - old.birth_date) / 7.0)::integer + 1;
  update public.moments m
  set trail_week = least(greatest(this_week, 1), 104)
  where m.trail_id = new.trail_id and m.trail_week > this_week;
  return new;
end;
$$;
revoke all on function private.renumber_weeks() from public, anon, authenticated;

create trigger renumber_weeks after update of birth_date on public.children
for each row when (old.birth_date is not null and new.birth_date is not null and old.birth_date <> new.birth_date)
execute function private.renumber_weeks();

-- Once born, the birth date can be corrected but never taken away (the trail counts from it).
create or replace function private.check_child() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.birth_date > (now() at time zone 'Europe/Amsterdam')::date then
    raise exception 'Birth date in the future' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and old.birth_date is not null and new.birth_date is null then
    raise exception 'Birth date cannot be removed' using errcode = '22023';
  end if;
  return new;
end;
$$;
