-- Review of the privacy promise (teddysteps.nl/privacy, "Voor familie").

-- Parents see their circle, but never a family member's e-mail address: it is only for
-- postcards (docs/family-email.md). Column grants instead of the whole row.
revoke select on public.circle_members from authenticated;
grant select (id, trail_id, label, relation, email_frequency, invited_by, invited_at, joined_at, revoked_at, last_seen_on, book_list_at)
  on public.circle_members to authenticated;

-- Leaving or being taken out of the circle: links and devices are deleted, not just blocked,
-- so no device hints or dates stay behind. Hugs and the name the parents gave stay with the trail.
create or replace function private.end_membership(member uuid) returns void
language sql security definer set search_path = ''
as $$
  update public.circle_members
    set revoked_at = coalesce(revoked_at, now()), email = null, email_confirmed_at = null, email_frequency = 'never'
    where id = member;
  delete from private.access_keys where circle_member_id = member;
  delete from private.family_sessions where circle_member_id = member;
$$;
