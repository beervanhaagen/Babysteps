-- Pre-registration on teddysteps.nl ("Hou me op de hoogte", "Ik wil meetesten").
-- A plain form posts to the edge function `waitlist` (service role), which calls the functions
-- below. Double opt-in: a link with a one-time code (only its hash is stored) and a confirm
-- button, so mail scanners can't confirm. Nothing here is reachable through the Data API.

create table private.waitlist (
  id uuid primary key default gen_random_uuid(),
  -- Stored lower-cased and trimmed, so one address is one row.
  email text not null unique check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  wants_test boolean not null default false,
  -- Born or due, as the first day of a month; only kept for people who want to test.
  baby_month date check (baby_month is null or extract(day from baby_month) = 1),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirm_hash text unique,
  confirm_expires_at timestamptz,
  -- After confirming, the link from the mail stays a "wis mijn adres" link.
  forget_hash text unique,
  mails_sent smallint not null default 0,
  last_mail_at timestamptz
);

-- Rate limit: an HMAC of the IP address (the key lives only in the edge function), kept an hour.
create table private.signup_attempts (
  ip_hash text not null,
  at timestamptz not null default now()
);
create index signup_attempts_ip on private.signup_attempts (ip_hash, at);

alter table private.waitlist enable row level security;
alter table private.signup_attempts enable row level security;

-- Returns what the edge function should do: 'mail' (send the confirmation mail with this code),
-- 'quiet' (nothing to send: already confirmed, or the mail limit is reached), 'limited' or
-- 'invalid'. The page looks the same for 'mail' and 'quiet', and the function sends the mail in
-- the background, so neither the answer nor its timing tells who is on the list.
-- The IP limit only holds for requests through Vercel (a direct call can fake x-forwarded-for);
-- the cap of 150 confirmation mails a day protects post.teddysteps.nl in any case.
create function public.waitlist_signup(address text, wants_test boolean, baby_month date, ip_hash text, confirm_hash text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  clean text := lower(btrim(coalesce(address, '')));
  this_month date := date_trunc('month', now() at time zone 'Europe/Amsterdam')::date;
  month_ok date;
  existing private.waitlist;
begin
  delete from private.signup_attempts where at < now() - interval '1 hour';
  if (select count(*) from private.signup_attempts a where a.ip_hash = waitlist_signup.ip_hash and a.at > now() - interval '10 minutes') >= 5
     or (select count(*) from private.signup_attempts) >= 300 then
    return 'limited';
  end if;
  insert into private.signup_attempts (ip_hash) values (waitlist_signup.ip_hash);

  if char_length(clean) > 254 or clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid';
  end if;
  -- Up to 24 months old or 10 months ahead; anything else is dropped, not refused.
  month_ok := case
    when wants_test and baby_month is not null
      and date_trunc('month', baby_month)::date between (this_month - interval '24 months')::date and (this_month + interval '10 months')::date
    then date_trunc('month', baby_month)::date
  end;

  select * into existing from private.waitlist w where w.email = clean;
  if (existing.id is null or (existing.confirmed_at is null and existing.mails_sent < 3 and coalesce(existing.last_mail_at, '-infinity') <= now() - interval '24 hours'))
     and (select count(*) from private.waitlist w where w.last_mail_at > now() - interval '24 hours') >= 150 then
    return 'limited';
  end if;
  if existing.id is null then
    insert into private.waitlist (email, wants_test, baby_month, confirm_hash, confirm_expires_at, mails_sent, last_mail_at)
    values (clean, waitlist_signup.wants_test, month_ok, waitlist_signup.confirm_hash, now() + interval '7 days', 1, now());
    return 'mail';
  end if;

  -- Only the person who confirms decides: a confirmed entry can't be changed by anyone else.
  if existing.confirmed_at is null then
    update private.waitlist w
      set wants_test = w.wants_test or waitlist_signup.wants_test,
          baby_month = case when w.wants_test or waitlist_signup.wants_test then coalesce(month_ok, w.baby_month) end
      where w.id = existing.id;
  end if;
  if existing.confirmed_at is not null
     or existing.mails_sent >= 3
     or existing.last_mail_at > now() - interval '24 hours' then
    return 'quiet';
  end if;
  update private.waitlist w
    set confirm_hash = waitlist_signup.confirm_hash, confirm_expires_at = now() + interval '7 days',
        mails_sent = w.mails_sent + 1, last_mail_at = now()
    where w.id = existing.id;
  return 'mail';
end;
$$;

-- "Ja, zet me op de lijst": 'ok' once, then the code is gone.
create function public.waitlist_confirm(code_hash text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  update private.waitlist w
    set confirmed_at = now(), forget_hash = w.confirm_hash, confirm_hash = null, confirm_expires_at = null
    where w.confirm_hash = code_hash and w.confirm_expires_at > now() and w.confirmed_at is null;
  return case when found then 'ok' else 'invalid' end;
end;
$$;

-- "Niet ik, wis mijn adres": works with the same link, also after it expired or was confirmed.
create function public.waitlist_forget(code_hash text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  delete from private.waitlist w where w.confirm_hash = code_hash or w.forget_hash = code_hash;
  return case when found then 'ok' else 'invalid' end;
end;
$$;

-- The confirmation mail could not be sent: undo the count, so trying again works right away.
-- A first sign-up that never got its mail is not kept at all.
create function public.waitlist_mail_failed(code_hash text)
returns void
language sql security definer set search_path = ''
as $$
  delete from private.waitlist w where w.confirm_hash = code_hash and w.confirmed_at is null and w.mails_sent <= 1;
  update private.waitlist w
    set mails_sent = greatest(w.mails_sent - 1, 0), last_mail_at = null
    where w.confirm_hash = code_hash;
$$;

-- Daily: unconfirmed addresses go once their link has expired (7 days after the last mail), everyone after 12 months at the latest
-- (after the launch mail sooner, by hand: docs/bouwplan.md), attempts after an hour.
create function private.waitlist_cleanup()
returns void
language sql security definer set search_path = ''
as $$
  delete from private.waitlist where confirmed_at is null and coalesce(confirm_expires_at, created_at) < now();
  delete from private.waitlist where created_at < now() - interval '12 months';
  delete from private.signup_attempts where at < now() - interval '1 hour';
$$;

revoke all on function public.waitlist_signup(text, boolean, date, text, text), public.waitlist_confirm(text), public.waitlist_forget(text),
  public.waitlist_mail_failed(text) from public, anon, authenticated;
grant execute on function public.waitlist_signup(text, boolean, date, text, text), public.waitlist_confirm(text), public.waitlist_forget(text),
  public.waitlist_mail_failed(text) to service_role;
revoke all on function private.waitlist_cleanup() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('waitlist-cleanup', '17 3 * * *', 'select private.waitlist_cleanup()');
