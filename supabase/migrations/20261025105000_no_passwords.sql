-- TeddySteps signs in with an e-mail code, Apple or Google; never a password. Supabase still
-- accepts a sign-up with a password, which let a stranger register someone's address first and
-- keep a way in after the owner confirmed it by code (found by tech-architect, 25 October 2026;
-- it matters more now that a confirmed address can make someone a parent). So no password is
-- ever stored: password sign-in always fails, every other way keeps working.
create function private.no_password() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.encrypted_password := '';
  return new;
end;
$$;

create trigger no_password before insert or update of encrypted_password on auth.users
  for each row execute function private.no_password();

update auth.users set encrypted_password = '' where coalesce(encrypted_password, '') <> '';
