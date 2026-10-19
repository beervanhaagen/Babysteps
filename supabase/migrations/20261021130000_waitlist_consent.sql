-- Proof of consent: besides when someone confirmed, keep which wording they agreed to.
-- The versions and their exact text are in docs/bouwplan.md ("Toestemming wachtlijst").
alter table private.waitlist add column consent_version text;

-- Everyone confirmed so far saw version 1.
update private.waitlist set consent_version = 'wachtlijst-v1' where confirmed_at is not null;

create or replace function public.waitlist_confirm(code_hash text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  update private.waitlist w
    set confirmed_at = now(), consent_version = 'wachtlijst-v1',
        forget_hash = w.confirm_hash, confirm_hash = null, confirm_expires_at = null
    where w.confirm_hash = code_hash and w.confirm_expires_at > now() and w.confirmed_at is null;
  return case when found then 'ok' else 'invalid' end;
end;
$$;

revoke all on function public.waitlist_confirm(text) from public, anon, authenticated;
grant execute on function public.waitlist_confirm(text) to service_role;
