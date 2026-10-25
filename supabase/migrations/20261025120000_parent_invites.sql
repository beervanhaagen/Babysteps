-- M3, inviting the other parent (step 8, decision 6 of the build plan: by e-mail; plan
-- tech-architect 25 October 2026). The invite names no child (a typo in the address mustn't leak
-- anything); only someone who signs in with exactly that confirmed address sees it, within 7
-- days. At most two parents per trail, one open invite at a time, three a day. The inviter gets
-- a mail when someone joins, so a mistake never goes unnoticed. Both parents have the same
-- rights (owner, 25 October 2026).
create table public.parent_invites (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails on delete cascade,
  -- Cleared 30 days after joining; the row stays as a record of who invited whom.
  email text check (email is null or (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$')),
  invited_by uuid references auth.users on delete set null,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users on delete set null,
  cancelled_at timestamptz
);
create index parent_invites_trail on public.parent_invites (trail_id);
create index parent_invites_email on public.parent_invites (email);
-- One open invite per trail, also when two phones invite at the same moment.
create unique index parent_invites_one_open on public.parent_invites (trail_id) where accepted_at is null and cancelled_at is null;
alter table public.parent_invites enable row level security;
create policy "Invites of own trail" on public.parent_invites for select to authenticated using (private.is_parent(trail_id));
grant select on public.parent_invites to authenticated;

-- The trail of the signed-in parent (one per parent at launch).
create function private.my_trail() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.trail_id from public.trail_parents p where p.user_id = (select auth.uid()) order by p.joined_at limit 1;
$$;

-- Returns the address as stored (the mail goes there) and whether to mail it: at most one mail
-- per address per 7 days across all trails, and a daily cap as a safety switch, so the function
-- can't be used to flood someone's inbox.
create function public.invite_parent(email text)
returns table (id uuid, sent_to text, mail boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  trail uuid := private.my_trail();
  clean text := lower(btrim(coalesce(invite_parent.email, '')));
  new_invite uuid;
begin
  if trail is null or exists (select 1 from public.trails t where t.id = trail and (t.delete_requested_at is not null or t.deleted_at is not null)) then
    raise exception 'No trail' using errcode = '42501';
  end if;
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or clean = (select lower(u.email) from auth.users u where u.id = (select auth.uid())) then
    raise exception 'Not a usable address' using errcode = '22023';
  end if;
  -- One at a time per trail, also with two phones.
  perform 1 from public.trails t where t.id = trail for update;
  if (select count(*) from public.trail_parents p where p.trail_id = trail) >= 2 then
    raise exception 'Two parents already' using errcode = '23514';
  end if;
  if (select count(*) from public.parent_invites i where i.trail_id = trail and i.sent_at > now() - interval '1 day') >= 3 then
    raise exception 'Too many invites today' using errcode = '54000';
  end if;
  -- One open invite at a time: a new one replaces the old.
  update public.parent_invites i set cancelled_at = now()
  where i.trail_id = trail and i.accepted_at is null and i.cancelled_at is null;
  insert into public.parent_invites (trail_id, email, invited_by) values (trail, clean, (select auth.uid()))
  returning parent_invites.id into new_invite;
  return query select new_invite, clean,
    not exists (select 1 from public.parent_invites i where i.email = clean and i.id <> new_invite and i.sent_at > now() - interval '7 days')
    and (select count(*) from public.parent_invites i where i.sent_at > now() - interval '1 day') <= 500;
end;
$$;

create function public.cancel_parent_invite(invite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.parent_invites i set cancelled_at = now()
  where i.id = invite and private.is_parent(i.trail_id) and i.accepted_at is null and i.cancelled_at is null;
  if not found then
    raise exception 'Not your invite' using errcode = '42501';
  end if;
end;
$$;

-- For someone signed in without a trail: an open invite for their confirmed address, if any.
create function public.my_parent_invite()
returns table (id uuid, child text, inviter text)
language sql stable security definer set search_path = ''
as $$
  select i.id, c.first_name, pr.first_name
  from public.parent_invites i
  join auth.users u on u.id = (select auth.uid()) and u.email_confirmed_at is not null and lower(u.email) = i.email
  join public.trails t on t.id = i.trail_id and t.delete_requested_at is null and t.deleted_at is null
  join public.children c on c.trail_id = i.trail_id
  left join public.profiles pr on pr.id = i.invited_by
  where i.accepted_at is null and i.cancelled_at is null and i.expires_at > now()
    and not exists (select 1 from public.trail_parents p where p.user_id = (select auth.uid()))
  order by i.sent_at desc
  limit 1;
$$;

create function public.accept_parent_invite(invite uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  trail uuid;
begin
  -- Tapped twice, or the answer got lost: already in, so just the trail.
  select i.trail_id into trail from public.parent_invites i where i.id = invite and i.accepted_by = (select auth.uid());
  if trail is not null then
    return trail;
  end if;
  -- Never two trails for one person, also when "eigen pad" and "doe mee" race.
  perform 1 from public.profiles pr where pr.id = (select auth.uid()) for update;
  select i.trail_id into trail
  from public.parent_invites i
  join auth.users u on u.id = (select auth.uid()) and u.email_confirmed_at is not null and lower(u.email) = i.email
  join public.trails t on t.id = i.trail_id and t.delete_requested_at is null and t.deleted_at is null
  where i.id = invite and i.accepted_at is null and i.cancelled_at is null and i.expires_at > now()
  for update of i;
  if trail is null then
    raise exception 'No such invite' using errcode = 'P0002';
  end if;
  -- Siblings (M2) come later: someone who already has a trail can't join a second one.
  if exists (select 1 from public.trail_parents p where p.user_id = (select auth.uid())) then
    raise exception 'Already has a trail' using errcode = '23514';
  end if;
  perform 1 from public.trails t where t.id = trail for update;
  if (select count(*) from public.trail_parents p where p.trail_id = trail) >= 2 then
    raise exception 'Two parents already' using errcode = '23514';
  end if;
  insert into public.trail_parents (trail_id, user_id) values (trail, (select auth.uid()));
  update public.parent_invites i set accepted_at = now(), accepted_by = (select auth.uid()) where i.id = invite;
  return trail;
end;
$$;

-- M3's parents section: first names only, and who is "jij".
create function public.trail_parents_list()
returns table (user_id uuid, first_name text, is_me boolean, joined_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.user_id, pr.first_name, p.user_id = (select auth.uid()), p.joined_at
  from public.trail_parents p
  left join public.profiles pr on pr.id = p.user_id
  where p.trail_id = private.my_trail()
  order by p.joined_at;
$$;

-- For the mail to the inviter after joining (the function `parent-invite`, service role only).
create function public.parent_invite_joined(invite uuid)
returns table (inviter_email text, child text, joiner_email text, joiner_name text)
language sql stable security definer set search_path = ''
as $$
  select inv.email, c.first_name, j.email, pr.first_name
  from public.parent_invites i
  join auth.users inv on inv.id = i.invited_by
  join auth.users j on j.id = i.accepted_by
  join public.children c on c.trail_id = i.trail_id
  left join public.profiles pr on pr.id = i.accepted_by
  where i.id = invite and i.accepted_at > now() - interval '1 hour';
$$;

-- Data minimisation: open invites that never got used go after 30 days; on a used one the
-- address is cleared after 30 days.
create function private.parent_invites_cleanup()
returns void
language sql security definer set search_path = ''
as $$
  delete from public.parent_invites
  where accepted_at is null and (cancelled_at < now() - interval '30 days' or expires_at < now() - interval '30 days');
  update public.parent_invites set email = null where accepted_at < now() - interval '30 days' and email is not null;
$$;
revoke all on function private.parent_invites_cleanup() from public, anon, authenticated;
select cron.schedule('parent-invites-cleanup', '37 3 * * *', 'select private.parent_invites_cleanup()');

revoke all on function private.my_trail() from public, anon, authenticated;
revoke all on function public.invite_parent(text), public.cancel_parent_invite(uuid), public.my_parent_invite(), public.accept_parent_invite(uuid), public.trail_parents_list() from public, anon;
grant execute on function public.invite_parent(text), public.cancel_parent_invite(uuid), public.my_parent_invite(), public.accept_parent_invite(uuid), public.trail_parents_list() to authenticated;
revoke all on function public.parent_invite_joined(uuid) from public, anon, authenticated;
grant execute on function public.parent_invite_joined(uuid) to service_role;
