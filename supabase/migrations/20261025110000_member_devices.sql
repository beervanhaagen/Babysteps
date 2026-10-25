-- M3 Familie en rollen (step 8): per person in the circle the devices their link is open on
-- ("iPhone · Safari", last used), and logging out one device without a new link for everyone.
-- Parents see only a rough device name and dates; never a token or its hash.
create function public.member_devices(member uuid)
returns table (id uuid, device_hint text, created_at timestamptz, last_used_on date)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.circle_members c where c.id = member and private.is_parent(c.trail_id)) then
    raise exception 'Not your circle' using errcode = '42501';
  end if;
  return query
    select s.id, s.device_hint, s.created_at, s.last_used_on
    from private.family_sessions s
    where s.circle_member_id = member and s.revoked_at is null
      and s.last_used_on >= (now() at time zone 'Europe/Amsterdam')::date - 180
    order by s.last_used_on desc, s.created_at desc;
end;
$$;

create function public.revoke_device(device uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update private.family_sessions s set revoked_at = now()
  from public.circle_members c
  where s.id = device and c.id = s.circle_member_id and private.is_parent(c.trail_id) and s.revoked_at is null;
  if not found then
    raise exception 'Not your device' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.member_devices(uuid), public.revoke_device(uuid) from public, anon;
grant execute on function public.member_devices(uuid), public.revoke_device(uuid) to authenticated;
