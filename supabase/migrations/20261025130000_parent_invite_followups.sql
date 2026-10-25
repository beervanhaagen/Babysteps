-- Follow-ups on inviting the other parent (owner, 25 October 2026; review tech-architect):
-- 1. A partner who already made an own trail, still empty (no moments, no circle, nobody else),
--    can swap it for the invite: that empty trail goes when they join.
-- 2. The inviter can take a wrongly joined parent off again, within 7 days of joining (a typo in
--    the address). After that only via hallo@.

-- The signed-in parent's own trail if it is still empty and theirs alone, else null.
create function private.own_empty_trail()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.trail_id
  from public.trail_parents p
  where p.user_id = (select auth.uid())
    and not exists (select 1 from public.trail_parents o where o.trail_id = p.trail_id and o.user_id <> p.user_id)
    and not exists (select 1 from public.moments m where m.trail_id = p.trail_id)
    and not exists (select 1 from public.circle_members c where c.trail_id = p.trail_id)
  limit 1;
$$;
revoke all on function private.own_empty_trail() from public, anon, authenticated;

create or replace function public.my_parent_invite()
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
    and not exists (select 1 from public.trail_parents p where p.user_id = (select auth.uid()) and p.trail_id is distinct from private.own_empty_trail())
  order by i.sent_at desc
  limit 1;
$$;

create or replace function public.accept_parent_invite(invite uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  trail uuid;
  empty uuid;
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
  -- Siblings (M2) come later: someone who already has a trail can't join a second one, unless
  -- it's still empty (owner, 25 October 2026): then it goes, and they join.
  empty := private.own_empty_trail();
  if exists (select 1 from public.trail_parents p where p.user_id = (select auth.uid()) and p.trail_id is distinct from empty) then
    raise exception 'Already has a trail' using errcode = '23514';
  end if;
  if empty is not null then
    delete from public.trails t where t.id = empty;
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

alter table public.parent_invites add column removed_at timestamptz;

create function public.remove_joined_parent(invite uuid)
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
  update public.parent_invites i set removed_at = now() where i.id = invite;
end;
$$;
revoke all on function public.remove_joined_parent(uuid) from public, anon;
grant execute on function public.remove_joined_parent(uuid) to authenticated;
