-- Step 7 at launch: the Sunday mail for family (F8), text only (photos come with the M6 switch in
-- step 8), plus confirming the family address and unsubscribing. Plan: tech-architect, 19 October.
-- Mail goes through the edge functions `family-api` (confirmation) and `family-mail` (Sunday,
-- called hourly by pg_cron). "Bij elk moment" is not offered at launch: everyone gets the week.

-- New kinds of key: a 7-day sign-in from the Sunday mail, and the address confirmation.
alter table private.access_keys drop constraint access_keys_kind_check;
alter table private.access_keys add constraint access_keys_kind_check check (kind in ('invite', 'email_signin', 'email_confirm'));
alter table private.access_keys add column expires_at timestamptz;

-- When the current address was given, so a confirmation link for an old address never confirms a new one.
alter table public.circle_members add column email_requested_at timestamptz;
update public.circle_members set email_frequency = 'weekly' where email_frequency = 'each';

-- One Sunday mail per person per week; the row is made first, the mail sent after.
create table private.mail_sends (
  id uuid primary key default gen_random_uuid(),
  circle_member_id uuid not null references public.circle_members on delete cascade,
  week date not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (circle_member_id, week)
);
alter table private.mail_sends enable row level security;

-- F2: returns 'confirm' when a confirmation mail should go out for a new address.
drop function public.family_join(uuid, text, text, text);
create function public.family_join(member uuid, member_label text, member_email text, frequency text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  clean text := case when frequency = 'never' then null else nullif(lower(btrim(member_email)), '') end;
  old text;
  confirmed timestamptz;
begin
  select c.email, c.email_confirmed_at into old, confirmed from public.circle_members c where c.id = member and c.revoked_at is null;
  if not found then
    return 'gone';
  end if;
  if clean is distinct from old then
    update private.access_keys set revoked_at = now() where circle_member_id = member and kind = 'email_confirm' and revoked_at is null;
  end if;
  update public.circle_members set
    label = coalesce(nullif(btrim(member_label), ''), label),
    email = clean,
    email_confirmed_at = case when clean is distinct from old then null else email_confirmed_at end,
    email_requested_at = case when clean is null then null when clean is distinct from old then now() else email_requested_at end,
    email_frequency = case when frequency = 'each' then 'weekly' else frequency end,
    joined_at = coalesce(joined_at, now())
  where id = member;
  return case when clean is not null and (clean is distinct from old or confirmed is null) then 'confirm' else 'ok' end;
end;
$$;

-- A confirmation code for the current address: at most 3 per person a day, 200 a day in all.
create function public.family_email_key(member uuid, code_hash text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from private.access_keys k where k.circle_member_id = member and k.kind = 'email_confirm' and k.created_at > now() - interval '24 hours') >= 3
     or (select count(*) from private.access_keys k where k.kind = 'email_confirm' and k.created_at > now() - interval '24 hours') >= 200 then
    return 'limited';
  end if;
  insert into private.access_keys (circle_member_id, kind, token_hash, expires_at) values (member, 'email_confirm', code_hash, now() + interval '7 days');
  return 'ok';
end;
$$;

-- "Ja, dit is mijn adres": once, within 7 days, only for the address the code was made for.
create function public.family_confirm_email(code_hash text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  key_id uuid;
  member uuid;
begin
  select k.id, k.circle_member_id into key_id, member
  from private.access_keys k
  join public.circle_members c on c.id = k.circle_member_id
  where k.token_hash = code_hash and k.kind = 'email_confirm' and k.revoked_at is null and k.expires_at > now()
    and c.revoked_at is null and c.email is not null and k.created_at >= c.email_requested_at;
  if key_id is null then
    return 'invalid';
  end if;
  update private.access_keys set revoked_at = now() where id = key_id;
  update public.circle_members set email_confirmed_at = now() where id = member;
  return 'ok';
end;
$$;

-- The link in the Sunday mail: a 7-day key that opens the family page on a new device.
create function public.family_mail_key(member uuid, code_hash text)
returns void
language sql security definer set search_path = ''
as $$
  insert into private.access_keys (circle_member_id, kind, token_hash, expires_at) values (member, 'email_signin', code_hash, now() + interval '7 days');
$$;

-- Unsubscribing (one click from the mail app, or the page): the address is gone, the page stays open.
create function public.family_unsubscribe(member uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.circle_members
    set email = null, email_confirmed_at = null, email_requested_at = null, email_frequency = 'never'
    where id = member;
  update private.access_keys set revoked_at = now() where circle_member_id = member and kind = 'email_confirm' and revoked_at is null;
$$;

-- The family link and the mail link both open the page; expired or revoked keys don't.
create or replace function public.family_claim(code_hash text, session_hash text, device text, ip text, existing_session_hash text)
returns table (member uuid, status text)
language plpgsql security definer set search_path = ''
as $$
declare
  found_member uuid;
  hashed_ip text := encode(extensions.digest(coalesce(ip, ''), 'sha256'), 'hex');
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  delete from private.claim_failures where at < now() - interval '1 hour';
  if (select count(*) from private.claim_failures f where f.ip_hash = hashed_ip and f.at > now() - interval '10 minutes') >= 20
     or (select count(*) from private.claim_failures f where f.at > now() - interval '10 minutes') >= 1000 then
    return query select null::uuid, 'blocked';
    return;
  end if;
  select k.circle_member_id into found_member
  from private.access_keys k
  join public.circle_members c on c.id = k.circle_member_id
  join public.trails t on t.id = c.trail_id
  where k.token_hash = code_hash and k.kind in ('invite', 'email_signin') and k.revoked_at is null
    and (k.expires_at is null or k.expires_at > now())
    and c.revoked_at is null and t.paused_at is null and t.delete_requested_at is null;
  if found_member is null then
    insert into private.claim_failures (ip_hash) values (hashed_ip);
    return query select null::uuid, 'unknown';
    return;
  end if;
  if existing_session_hash is not null and exists (
    select 1 from private.family_sessions s
    where s.token_hash = existing_session_hash and s.circle_member_id = found_member
      and s.revoked_at is null and s.last_used_on >= today - 180
  ) then
    return query select found_member, 'same';
    return;
  end if;
  if (select count(*) from private.family_sessions s
      where s.circle_member_id = found_member and s.revoked_at is null and s.last_used_on >= today - 180) >= 5 then
    return query select found_member, 'full';
    return;
  end if;
  insert into private.family_sessions (circle_member_id, token_hash, device_hint) values (found_member, session_hash, left(device, 40));
  return query select found_member, 'ok';
end;
$$;

-- "Nieuwe link sturen" also stops the links in mails already sent.
create or replace function public.new_family_link(member uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  new_code text := private.new_code();
begin
  if not exists (
    select 1 from public.circle_members c where c.id = member and c.revoked_at is null and private.is_parent(c.trail_id)
  ) then
    raise exception 'Not your circle' using errcode = '42501';
  end if;
  update private.access_keys set revoked_at = now() where circle_member_id = member and kind in ('invite', 'email_signin') and revoked_at is null;
  update private.family_sessions set revoked_at = now() where circle_member_id = member and revoked_at is null;
  insert into private.access_keys (circle_member_id, kind, token_hash) values (member, 'invite', private.hash(new_code));
  return new_code;
end;
$$;

-- Who gets a Sunday mail now: only on Sundays from 20:00 Amsterdam time, people with a confirmed
-- address on a trail that isn't paused or being deleted, and only when moments became ready since
-- last Sunday 20:00. Rows are claimed here; ones not marked sent come back in the next run that day.
create function public.family_sunday_mail(at timestamptz default now())
returns table (send_id uuid, member uuid, email text, label text, child text, moment_count integer, moments jsonb)
language plpgsql security definer set search_path = ''
as $$
declare
  local timestamp := at at time zone 'Europe/Amsterdam';
  sunday date := local::date;
  since timestamptz := ((local::date - 7) + time '20:00') at time zone 'Europe/Amsterdam';
begin
  if extract(isodow from local) <> 7 or extract(hour from local) < 20 then
    return;
  end if;
  insert into private.mail_sends (circle_member_id, week)
  select c.id, sunday
  from public.circle_members c
  join public.trails t on t.id = c.trail_id
  where c.email is not null and c.email_confirmed_at is not null and c.revoked_at is null
    and c.email_frequency in ('weekly', 'each')
    and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
    and exists (
      select 1 from public.moments m
      where m.trail_id = c.trail_id and m.status = 'ready' and m.deleted_at is null and m.ready_at > since and m.ready_at <= at
    )
  on conflict (circle_member_id, week) do nothing;

  return query
  select s.id, c.id, c.email, c.label, ch.first_name,
    (select count(*)::integer from public.moments m
     where m.trail_id = c.trail_id and m.status = 'ready' and m.deleted_at is null and m.ready_at > since and m.ready_at <= at),
    (select coalesce(jsonb_agg(jsonb_build_object('week', w.trail_week, 'first', w.is_first, 'label', w.first_label, 'caption', w.caption) order by w.ready_at), '[]'::jsonb)
     from (
       select m.trail_week, m.is_first, m.first_label, m.caption, m.ready_at from public.moments m
       where m.trail_id = c.trail_id and m.status = 'ready' and m.deleted_at is null and m.ready_at > since and m.ready_at <= at
       order by m.ready_at desc limit 5
     ) w)
  from private.mail_sends s
  join public.circle_members c on c.id = s.circle_member_id
  join public.children ch on ch.trail_id = c.trail_id
  where s.week = sunday and s.sent_at is null
    and c.email is not null and c.email_confirmed_at is not null and c.revoked_at is null;
end;
$$;

create function public.family_mail_sent(send uuid)
returns void
language sql security definer set search_path = ''
as $$
  update private.mail_sends set sent_at = now() where id = send;
$$;

-- Daily: unconfirmed addresses go after 7 days, old keys and send records after a while.
create function private.family_mail_cleanup()
returns void
language sql security definer set search_path = ''
as $$
  update public.circle_members
    set email = null, email_requested_at = null, email_frequency = 'never'
    where email is not null and email_confirmed_at is null and email_requested_at < now() - interval '7 days';
  delete from private.access_keys where kind in ('email_signin', 'email_confirm') and (expires_at < now() - interval '30 days' or revoked_at < now() - interval '30 days');
  delete from private.mail_sends where created_at < now() - interval '60 days';
$$;

revoke all on function public.family_join(uuid, text, text, text), public.family_email_key(uuid, text), public.family_confirm_email(text),
  public.family_mail_key(uuid, text), public.family_unsubscribe(uuid), public.family_sunday_mail(timestamptz), public.family_mail_sent(uuid)
  from public, anon, authenticated;
grant execute on function public.family_join(uuid, text, text, text), public.family_email_key(uuid, text), public.family_confirm_email(text),
  public.family_mail_key(uuid, text), public.family_unsubscribe(uuid), public.family_sunday_mail(timestamptz), public.family_mail_sent(uuid)
  to service_role;
revoke all on function private.family_mail_cleanup() from public, anon, authenticated;

-- Hourly at :05, the function `family-mail` gets a nudge; family_sunday_mail decides whether it's
-- Sunday after 20:00. URL and shared secret in Vault ("family_mail_url", "cron_secret").
select cron.schedule('family-mail', '5 * * * *', $job$
  select net.http_post(
    url := s.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  from (
    select max(decrypted_secret) filter (where name = 'family_mail_url') as url,
           max(decrypted_secret) filter (where name = 'cron_secret') as secret
    from vault.decrypted_secrets
  ) s
  where s.url is not null and s.secret is not null
$job$);
select cron.schedule('family-mail-cleanup', '29 3 * * *', 'select private.family_mail_cleanup()');
