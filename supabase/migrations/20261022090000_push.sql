-- Step 5, push at its minimum (owner, 19 October): at most one push per parent per day, at
-- 19:00 Amsterdam time, only when family sent hugs in the last 24 hours. Sent straight to APNs and
-- FCM by the edge function `push`, which pg_cron calls every hour (pg_net, URL and secret in Vault).
-- A push holds one sentence with first names only; never a photo, caption or week.

create table private.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  -- The device's own APNs or FCM token (not an Expo push token). One row per device.
  token text not null unique check (char_length(token) between 20 and 4096),
  -- Development builds use Apple's sandbox server, TestFlight and the App Store don't.
  apns_sandbox boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_on date not null default (now() at time zone 'Europe/Amsterdam')::date
);
create index push_tokens_user on private.push_tokens (user_id);

-- One digest per parent per day, also if the hourly job runs twice.
create table private.push_digest_sent (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table private.push_tokens enable row level security;
alter table private.push_digest_sent enable row level security;

-- The app registers its device on every start. A shared phone that signs in with another
-- account moves to that account, so Lotte's hugs never show on someone else's lock screen.
create function public.register_push_token(platform text, token text, sandbox boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into private.push_tokens (user_id, platform, token, apns_sandbox)
  values ((select auth.uid()), register_push_token.platform, register_push_token.token, coalesce(sandbox, false))
  on conflict on constraint push_tokens_token_key do update
    set user_id = excluded.user_id, platform = excluded.platform, apns_sandbox = excluded.apns_sandbox,
        last_seen_on = (now() at time zone 'Europe/Amsterdam')::date;
end;
$$;

-- On logout: this device gets nothing more for this account.
create function public.unregister_push_token(token text)
returns void
language sql security definer set search_path = ''
as $$
  delete from private.push_tokens t where t.token = unregister_push_token.token and t.user_id = (select auth.uid());
$$;

-- The sentence for one parent, from the family hugs in a 24-hour window. First names only.
create function private.push_sentence(child text, people text[], hugs integer)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when cardinality(people) = 1 and hugs = 1 then people[1] || ' stuurde ' || child || ' een knuffel'
    when cardinality(people) = 1 then people[1] || ' stuurde ' || child || ' ' || hugs || ' knuffels'
    when cardinality(people) = 2 then people[1] || ' en ' || people[2] || ' stuurden ' || child || ' ' || hugs || ' knuffels'
    else child || ' kreeg vandaag ' || hugs || ' knuffels van ' || people[1] || ' en ' || (cardinality(people) - 1) || ' anderen'
  end;
$$;

-- What to send now: only in the 19:00 hour in Amsterdam (hugs since yesterday 19:00), once per parent per day, for parents
-- who did not switch hug notifications off, on trails that are not paused or being deleted.
-- Claiming happens here, so a second run in the same day returns nothing.
create function public.push_digest(at timestamptz default now())
returns table (token text, platform text, apns_sandbox boolean, body text)
language plpgsql security definer set search_path = ''
as $$
declare
  local timestamp := at at time zone 'Europe/Amsterdam';
  -- Pinned to the clock, so a summer/winter time change neither skips nor doubles an hour.
  vanaf timestamptz := ((local::date - 1) + time '19:00') at time zone 'Europe/Amsterdam';
  tot timestamptz := (local::date + time '19:00') at time zone 'Europe/Amsterdam';
begin
  if extract(hour from local) <> 19 then
    return;
  end if;
  return query
  with hugs as (
    select p.user_id, c.first_name as child, m.label, count(*)::integer as n, min(r.created_at) as first_at
    from public.reactions r
    join public.trail_parents p on p.trail_id = r.trail_id
    join public.trails t on t.id = r.trail_id
    join public.children c on c.trail_id = r.trail_id
    join public.moments mo on mo.id = r.moment_id
    join public.circle_members m on m.id = r.circle_member_id
    join public.profiles pr on pr.id = p.user_id
    where r.kind = 'hug' and r.circle_member_id is not null
      and r.created_at > vanaf and r.created_at <= tot
      and t.paused_at is null and t.delete_requested_at is null and t.deleted_at is null
      and mo.deleted_at is null and pr.notify_reactions
    group by p.user_id, c.first_name, m.label
  ), per_parent as (
    select h.user_id, min(h.child) as child, array_agg(h.label order by h.first_at) as people, sum(h.n)::integer as total
    from hugs h
    group by h.user_id
  ), claimed as (
    insert into private.push_digest_sent (user_id, day)
    select pp.user_id, local::date from per_parent pp
    on conflict do nothing
    returning user_id
  )
  select k.token, k.platform, k.apns_sandbox, private.push_sentence(pp.child, pp.people, pp.total)
  from claimed cl
  join per_parent pp on pp.user_id = cl.user_id
  join private.push_tokens k on k.user_id = cl.user_id;
end;
$$;

-- Apple or Google said the token is no longer valid.
create function public.push_token_invalid(token text)
returns void
language sql security definer set search_path = ''
as $$
  delete from private.push_tokens t where t.token = push_token_invalid.token;
$$;

-- Daily tidy-up, next to the waitlist: devices not seen for 60 days, old digest markers.
create function private.push_cleanup()
returns void
language sql security definer set search_path = ''
as $$
  delete from private.push_tokens where last_seen_on < (now() at time zone 'Europe/Amsterdam')::date - 60;
  delete from private.push_digest_sent where day < (now() at time zone 'Europe/Amsterdam')::date - 7;
$$;

revoke all on function public.register_push_token(text, text, boolean), public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text, boolean), public.unregister_push_token(text) to authenticated;
revoke all on function public.push_digest(timestamptz), public.push_token_invalid(text) from public, anon, authenticated;
grant execute on function public.push_digest(timestamptz), public.push_token_invalid(text) to service_role;
revoke all on function private.push_sentence(text, text[], integer), private.push_cleanup() from public, anon, authenticated;

-- Every hour, the function `push` gets a nudge; push_digest decides whether it's 19:00.
-- The function's URL and shared secret live in Vault ("push_function_url", "cron_secret"),
-- set once per environment (README). Without them the job does nothing.
create extension if not exists pg_net with schema extensions;
select cron.schedule('push-digest', '0 * * * *', $job$
  select net.http_post(
    url := s.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  from (
    select max(decrypted_secret) filter (where name = 'push_function_url') as url,
           max(decrypted_secret) filter (where name = 'cron_secret') as secret
    from vault.decrypted_secrets
  ) s
  where s.url is not null and s.secret is not null
$job$);
select cron.schedule('push-cleanup', '23 3 * * *', 'select private.push_cleanup()');
