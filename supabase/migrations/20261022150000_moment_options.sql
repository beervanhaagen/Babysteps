-- T8 Moment options (step 9, plan tech-architect 19 October 2026): edit and move a moment
-- through one function with all the rules, delete with 30 days to undo, and purge after that.
-- The family page, the Sunday mail, push and hugs already leave out deleted moments.

alter table public.moments add column in_book boolean not null default true;
alter table public.moments add column deleted_by uuid references auth.users on delete set null;

-- No more direct updates: update_moment holds every rule.
drop policy "Change own moments" on public.moments;
revoke update on public.moments from authenticated;

-- Caption, week, first and "in het jaarboek". A new week runs from 1 to this week of the trail
-- (from the birth date, Amsterdam time), never into the future. An unchanged week is never
-- checked, so a later change of the birth date can't lock old moments.
create function public.update_moment(moment uuid, caption text, trail_week integer, is_first boolean, first_label text, in_book boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  found_trail uuid;
  current_week smallint;
  born date;
  this_week integer;
  clean_caption text := nullif(btrim(coalesce(update_moment.caption, '')), '');
  clean_label text := nullif(btrim(coalesce(update_moment.first_label, '')), '');
begin
  select m.trail_id, m.trail_week, c.birth_date into found_trail, current_week, born
  from public.moments m join public.children c on c.trail_id = m.trail_id
  where m.id = moment and m.deleted_at is null;
  if found_trail is null or not private.is_parent(found_trail) then
    raise exception 'Not your moment' using errcode = '42501';
  end if;
  if update_moment.trail_week is distinct from current_week then
    this_week := floor(((now() at time zone 'Europe/Amsterdam')::date - born) / 7) + 1;
    if born is null or update_moment.trail_week < 1 or update_moment.trail_week > least(this_week, 104) then
      raise exception 'Week out of range' using errcode = '22023';
    end if;
  end if;
  if char_length(clean_caption) > 500 then
    raise exception 'Caption too long' using errcode = '22023';
  end if;
  if update_moment.is_first and (clean_label is null or char_length(clean_label) > 60) then
    raise exception 'A first needs a label' using errcode = '22023';
  end if;
  update public.moments m set
    caption = clean_caption,
    trail_week = update_moment.trail_week,
    is_first = update_moment.is_first,
    first_label = case when update_moment.is_first then clean_label end,
    in_book = update_moment.in_book
  where m.id = moment;
end;
$$;

-- "Moment verwijderen": gone at once for everyone, and for 30 days the parents can bring it back.
create function public.delete_moment(moment uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.moments m set deleted_at = now(), deleted_by = (select auth.uid())
  where m.id = moment and m.deleted_at is null and private.is_parent(m.trail_id);
  if not found then
    raise exception 'Not your moment' using errcode = '42501';
  end if;
end;
$$;

-- "Terugzetten": within 30 days, for moments that were complete, not while the trail itself is being deleted.
create function public.restore_moment(moment uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.moments m set deleted_at = null, deleted_by = null
  from public.trails t
  where m.id = moment and t.id = m.trail_id and private.is_parent(m.trail_id)
    and m.deleted_at > now() - interval '30 days' and m.status = 'ready'
    and t.delete_requested_at is null and t.deleted_at is null;
  if not found then
    raise exception 'Cannot be restored' using errcode = 'P0002';
  end if;
end;
$$;

-- "Onlangs verwijderd" (M6, step 8): what can still come back, newest first.
create function public.deleted_moments()
returns table (id uuid, trail_week smallint, caption text, is_first boolean, first_label text, deleted_at timestamptz, small_path text)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.trail_week, m.caption, m.is_first, m.first_label, m.deleted_at,
    (select p.small_path from public.moment_photos p where p.moment_id = m.id order by p.position limit 1)
  from public.moments m
  where private.is_parent(m.trail_id) and m.deleted_at > now() - interval '30 days' and m.status = 'ready'
  order by m.deleted_at desc;
$$;

-- For the nightly purge: moments deleted more than 30 days ago, or stuck uploading for 30 days
-- (a lost phone), with every stored file. The function `purge` removes the files, then the rows.
create function public.purge_candidates()
returns table (moment uuid, view_paths text[], print_paths text[])
language sql stable security definer set search_path = ''
as $$
  select m.id,
    coalesce(array_agg(p.view_path) filter (where p.view_path is not null), '{}') || coalesce(array_agg(p.small_path) filter (where p.small_path is not null), '{}'),
    coalesce(array_agg(p.print_path) filter (where p.print_path is not null), '{}')
  from public.moments m
  left join public.moment_photos p on p.moment_id = m.id
  where m.deleted_at < now() - interval '30 days'
     or (m.status = 'uploading' and m.created_at < now() - interval '30 days')
  group by m.id
  order by coalesce(min(m.deleted_at), min(m.created_at))
  limit 200;
$$;

-- Checked again at the moment of deleting the row: never a moment that came back meanwhile.
create function public.purge_moment(moment uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.moments m
  where m.id = moment
    and (m.deleted_at < now() - interval '30 days' or (m.status = 'uploading' and m.created_at < now() - interval '30 days'));
$$;

revoke all on function public.update_moment(uuid, text, integer, boolean, text, boolean), public.delete_moment(uuid),
  public.restore_moment(uuid), public.deleted_moments() from public, anon;
grant execute on function public.update_moment(uuid, text, integer, boolean, text, boolean), public.delete_moment(uuid),
  public.restore_moment(uuid), public.deleted_moments() to authenticated;
revoke all on function public.purge_candidates(), public.purge_moment(uuid) from public, anon, authenticated;
grant execute on function public.purge_candidates(), public.purge_moment(uuid) to service_role;

-- Nightly at 03:41, the function `purge` gets a nudge (URL and secret in Vault, as for push).
select cron.schedule('purge', '41 3 * * *', $job$
  select net.http_post(
    url := s.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  from (
    select max(decrypted_secret) filter (where name = 'purge_function_url') as url,
           max(decrypted_secret) filter (where name = 'cron_secret') as secret
    from vault.decrypted_secrets
  ) s
  where s.url is not null and s.secret is not null
$job$);
