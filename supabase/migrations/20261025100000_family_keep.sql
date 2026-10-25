-- M6 "Familie mag foto's bewaren" (off by default): while it's on, family get a "Bewaar" button
-- that downloads the view version (1280px), never the print version. Checked here, on every tap,
-- so switching it off works at once. Photos in the Sunday mail follow later (docs/family-email.md).
create function public.family_keep_photo(member uuid, kept_moment uuid, photo_position smallint)
returns text
language sql stable security definer set search_path = ''
as $$
  select p.view_path
  from public.moment_photos p
  join public.moments m on m.id = p.moment_id
  join public.circle_members c on c.id = member and c.trail_id = m.trail_id and c.revoked_at is null
  join public.trails t on t.id = m.trail_id
  where p.moment_id = kept_moment and p.position = photo_position
    and m.status = 'ready' and m.deleted_at is null
    and t.family_may_keep_photos and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null;
$$;
revoke all on function public.family_keep_photo(uuid, uuid, smallint) from public, anon, authenticated;
grant execute on function public.family_keep_photo(uuid, uuid, smallint) to service_role;
