-- M7 "Pad en account verwijderen" (step 8; plan tech-architect; owner decisions 25 October 2026):
-- - 30 days to change your mind; "Nu meteen definitief wissen" also exists (Apple expects it).
-- - "Alleen mijn account": the trail stays with the other parent. "Het pad en mijn account": the
--   trail goes for both; the other parent gets a mail and may bring it back within the 30 days.
--   A parent on their own (or the last one not leaving) always deletes both: a trail is never
--   left without a parent.
-- - "Nu meteen" wipes the account within the hour; a trail shared with another parent still
--   keeps its 30 days, so the other parent can always save it (review tech-architect).
-- - At once: family links are blocked (not deleted, so "Toch bewaren" brings them back), pushes,
--   mails and nudges stop (they already check delete_requested_at), this parent's devices go.
-- - While pending, nothing on the trail can change except bringing it back.
-- - After the 30 days the function `purge` removes the files (Storage API), then the rows, then
--   the account (Auth API) with a last mail.

-- trails already has delete_requested_at, purge_after and deleted_at (step 2).
alter table public.trails add column delete_requested_by uuid references auth.users on delete set null;
alter table public.profiles
  add column delete_requested_at timestamptz,
  add column purge_after timestamptz;

-- Read-only while being deleted: every way in (policies, functions, the app) hits this. Only the
-- database's own "set null" when an account goes (created_by, deleted_by) passes.
create function private.refuse_on_leaving_trail() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(new) - '{created_by,deleted_by}'::text[] = to_jsonb(old) - '{created_by,deleted_by}'::text[] then
    return new;
  end if;
  if exists (select 1 from public.trails t where t.id = new.trail_id and (t.delete_requested_at is not null or t.deleted_at is not null)) then
    raise exception 'Trail is being deleted' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger leaving_moments before insert or update on public.moments for each row execute function private.refuse_on_leaving_trail();
create trigger leaving_photos before insert on public.moment_photos for each row execute function private.refuse_on_leaving_trail();
create trigger leaving_children before update on public.children for each row execute function private.refuse_on_leaving_trail();
-- Nobody new joins; but unsubscribing and the daily mail cleanup keep working (they only remove).
create trigger leaving_circle before insert on public.circle_members for each row execute function private.refuse_on_leaving_trail();
create trigger leaving_invites before insert on public.parent_invites for each row execute function private.refuse_on_leaving_trail();

-- The family page shows nothing of a trail being deleted (the session check does too).
create or replace function public.family_page(member uuid, skip integer, page_size integer)
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
  -- Also here, not only at the session: nothing of a trail that is being deleted.
  join public.trails t on t.id = m.trail_id and t.delete_requested_at is null and t.deleted_at is null
  where m.status = 'ready' and m.deleted_at is null
  order by m.trail_week desc, m.created_at desc, m.id
  offset greatest(skip, 0)
  limit least(greatest(page_size, 1), 25);
$$;

-- On the trail itself only the deletion columns may change while it's pending.
create function private.refuse_changes_while_leaving() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.delete_requested_at is not null and new.delete_requested_at is not null
     and (new.family_may_keep_photos is distinct from old.family_may_keep_photos or new.paused_at is distinct from old.paused_at) then
    raise exception 'Trail is being deleted' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger leaving_trail before update on public.trails for each row execute function private.refuse_changes_while_leaving();

-- "Verwijderen", called only by the function `leave` (service role), so the mail to the other
-- parent can't be skipped. scope 'account' (only me) or 'trail' (the trail and me). Returns when
-- the account goes and when the trail goes (null when it stays).
create function public.request_deletion(requester uuid, scope text, right_away boolean default false)
returns table (account_until timestamptz, trail_until timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  trail uuid := (select p.trail_id from public.trail_parents p where p.user_id = requester order by p.joined_at limit 1);
  -- Other parents who aren't leaving themselves.
  others integer := (
    select count(*) from public.trail_parents p join public.profiles pr on pr.id = p.user_id
    where p.trail_id = trail and p.user_id <> requester and pr.delete_requested_at is null
  );
  account_at timestamptz := case when right_away then now() else now() + interval '30 days' end;
  trail_at timestamptz;
begin
  if requester is null or scope not in ('account', 'trail') then
    raise exception 'Not possible' using errcode = '22023';
  end if;
  if trail is not null and (scope = 'trail' or others = 0) then
    -- Shared with someone staying: the trail keeps its 30 days, also with "nu meteen".
    trail_at := case when right_away and others = 0 then now() else now() + interval '30 days' end;
    update public.trails t set delete_requested_at = now(), purge_after = trail_at, delete_requested_by = requester
    where t.id = trail and t.deleted_at is null;
    update public.parent_invites i set cancelled_at = now() where i.trail_id = trail and i.accepted_at is null and i.cancelled_at is null;
  end if;
  update public.profiles pr set delete_requested_at = now(), purge_after = account_at where pr.id = requester;
  delete from private.push_tokens k where k.user_id = requester;
  return query select account_at, trail_at;
end;
$$;

-- "Toch bewaren": my account, and the trail (either parent may bring it back), until the purge starts.
create function public.restore_deletion()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  trail uuid := private.my_trail();
begin
  -- Past the date the purge may already be busy: no half-restores.
  if exists (select 1 from public.profiles pr where pr.id = me and pr.purge_after <= now())
     or exists (select 1 from public.trails t where t.id = trail and (t.deleted_at is not null or t.purge_after <= now())) then
    raise exception 'Too late' using errcode = 'P0002';
  end if;
  update public.profiles pr set delete_requested_at = null, purge_after = null where pr.id = me;
  update public.trails t set delete_requested_at = null, purge_after = null, delete_requested_by = null
  where t.id = trail and t.delete_requested_at is not null and t.deleted_at is null;
end;
$$;

-- What is pending for the signed-in parent (the screen after signing in, and the other parent).
create function public.my_deletion()
returns table (account_until timestamptz, trail_until timestamptz, by_me boolean, by_name text, child text)
language sql stable security definer set search_path = ''
as $$
  select pr.purge_after, t.purge_after, t.delete_requested_by = (select auth.uid()), who.first_name, c.first_name
  from public.profiles pr
  left join public.trails t on t.id = private.my_trail() and t.delete_requested_at is not null and t.deleted_at is null
  left join public.children c on c.trail_id = t.id
  left join public.profiles who on who.id = t.delete_requested_by
  where pr.id = (select auth.uid()) and (pr.purge_after is not null or t.id is not null);
$$;

-- For the mails at the moment of asking (function `leave`, service role): the other parent of
-- the trail, if there is one (`until` is empty when only an account goes and the trail stays).
create function public.deletion_other_parent(requester uuid)
returns table (email text, child text, until timestamptz)
language sql stable security definer set search_path = ''
as $$
  select u.email, c.first_name, t.purge_after
  from public.trail_parents me
  join public.trails t on t.id = me.trail_id and t.deleted_at is null
  join public.trail_parents other on other.trail_id = me.trail_id and other.user_id <> requester
  join public.profiles op on op.id = other.user_id and op.delete_requested_at is null
  join auth.users u on u.id = other.user_id
  join public.children c on c.trail_id = me.trail_id
  where me.user_id = requester;
$$;

-- The purge, in steps the function `purge` can repeat until done (each run stops after ~100 s).
-- 1. Trails past their date get deleted_at: from then on "Toch bewaren" no longer works.
create function public.trails_to_purge()
returns setof uuid
language plpgsql security definer set search_path = ''
as $$
begin
  update public.trails t set deleted_at = now()
  where t.purge_after <= now() and t.delete_requested_at is not null and t.deleted_at is null;
  return query select t.id from public.trails t where t.deleted_at is not null order by t.deleted_at limit 20;
end;
$$;

-- 2. Its files, a batch at a time (removed through the Storage API, never with SQL).
create function public.trail_files(trail uuid)
returns table (bucket text, name text)
language sql stable security definer set search_path = ''
as $$
  select o.bucket_id, o.name from storage.objects o
  where o.bucket_id in ('view', 'print') and o.name like trail::text || '/%'
  limit 1000;
$$;

-- 3. The rows, once no file is left (everything else hangs off the trail and goes with it).
create function public.purge_trail(trail uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from storage.objects o where o.bucket_id in ('view', 'print') and o.name like trail::text || '/%') then
    return false;
  end if;
  delete from public.trails t where t.id = trail and t.deleted_at is not null;
  return true;
end;
$$;

-- 4. Accounts past their date, once their trail (if it was going) is gone.
create function public.accounts_to_purge()
returns table (user_id uuid, email text, trail_stays boolean)
language sql stable security definer set search_path = ''
as $$
  select pr.id, u.email, exists (select 1 from public.trail_parents p where p.user_id = pr.id)
  from public.profiles pr
  join auth.users u on u.id = pr.id
  where pr.purge_after <= now()
    -- The last parent of a trail that is going waits until the trail is gone.
    and not exists (
      select 1 from public.trail_parents p join public.trails t on t.id = p.trail_id
      where p.user_id = pr.id and t.delete_requested_at is not null
        and not exists (select 1 from public.trail_parents q where q.trail_id = p.trail_id and q.user_id <> pr.id)
    )
  limit 20;
$$;

-- 5. Before the Auth API deletes the user: files they uploaded to a trail that stays belong to
--    nobody (Supabase refuses to delete a user who owns files), and their sign-in log goes.
create function public.release_account(account uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  -- Checked again (and held) at the last moment: a "Toch bewaren" just now wins.
  perform 1 from public.profiles pr where pr.id = account and pr.purge_after <= now() for update;
  if not found then
    raise exception 'Not due' using errcode = 'P0002';
  end if;
  update storage.objects set owner = null, owner_id = null where owner_id = account::text or owner = account;
  delete from auth.audit_log_entries a where a.payload ->> 'actor_id' = account::text;
end;
$$;

-- After the Auth API deleted the user: its own "user deleted" log line (with the address) goes
-- too, and a trail that no longer has any parent never lingers with live family links.
create function public.after_account_purge(account uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from auth.audit_log_entries a where a.payload -> 'traits' ->> 'user_id' = account::text or a.payload ->> 'actor_id' = account::text;
  update public.trails t set delete_requested_at = now(), purge_after = now()
  where t.deleted_at is null and t.delete_requested_at is null
    and not exists (select 1 from public.trail_parents p where p.trail_id = t.id);
$$;

-- A parent who asked to leave gets no pushes, also when the app registers its device again.
create or replace function public.register_push_token(platform text, token text, sandbox boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and pr.delete_requested_at is not null) then
    return;
  end if;
  insert into private.push_tokens (user_id, platform, token, apns_sandbox)
  values ((select auth.uid()), register_push_token.platform, register_push_token.token, coalesce(sandbox, false))
  on conflict on constraint push_tokens_token_key do update
    set user_id = excluded.user_id, platform = excluded.platform, apns_sandbox = excluded.apns_sandbox,
        last_seen_on = (now() at time zone 'Europe/Amsterdam')::date;
end;
$$;

revoke all on function private.refuse_on_leaving_trail(), private.refuse_changes_while_leaving() from public, anon, authenticated;
revoke all on function public.restore_deletion(), public.my_deletion() from public, anon;
grant execute on function public.restore_deletion(), public.my_deletion() to authenticated;
revoke all on function public.request_deletion(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.request_deletion(uuid, text, boolean) to service_role;
revoke all on function public.deletion_other_parent(uuid), public.trails_to_purge(), public.trail_files(uuid), public.purge_trail(uuid), public.accounts_to_purge(), public.release_account(uuid), public.after_account_purge(uuid) from public, anon, authenticated;
grant execute on function public.deletion_other_parent(uuid), public.trails_to_purge(), public.trail_files(uuid), public.purge_trail(uuid), public.accounts_to_purge(), public.release_account(uuid), public.after_account_purge(uuid) to service_role;

-- The purge runs every hour now (it was nightly): "Nu meteen definitief wissen" is done within the hour.
select cron.unschedule('purge');
select cron.schedule('purge', '41 * * * *', $job$
  select net.http_post(
    url := s.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  from (
    select max(decrypted_secret) filter (where name = 'purge_function_url') as url,
           max(decrypted_secret) filter (where name = 'cron_secret') as secret
    from vault.decrypted_secrets
  ) s
  where s.url is not null and s.secret is not null
$job$);
