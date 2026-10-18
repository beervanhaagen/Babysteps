-- Privacy tests for step 2. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- Every table in public has row level security on.
select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint,
  'every public table has RLS on'
);
select hasnt_extension('pg_graphql', 'GraphQL is not installed');

-- Safety nets for anything added later.
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  0::bigint,
  'no function in public can be run without signing in'
);
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce(c.reloptions @> array['security_invoker=true'], false)),
  0::bigint,
  'every view in public respects RLS (security_invoker)'
);
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'),
  0::bigint,
  'anon has no rights on any table'
);
select ok(
  not has_function_privilege('anon', 'public.create_trail(text,date,date)', 'execute'),
  'anon cannot run create_trail'
);

-- Two parents. Apple and Google style metadata, including a surname and a photo.
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'sam@voorbeeld.nl',
   '{"full_name": "Sam de Vries", "given_name": "Sam", "family_name": "de Vries", "avatar_url": "https://x/y.jpg", "email_verified": true}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'kim@voorbeeld.nl', '{}');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'g-123', 'google',
  '{"sub": "g-123", "email": "sam@voorbeeld.nl", "name": "Sam de Vries", "picture": "https://x/y.jpg"}', now(), now(), now());

select is(
  (select raw_user_meta_data from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  '{"email_verified": true}'::jsonb,
  'names and photo are dropped from the user'
);
select is(
  (select identity_data from auth.identities where user_id = '11111111-1111-1111-1111-111111111111'),
  '{"sub": "g-123", "email": "sam@voorbeeld.nl"}'::jsonb,
  'names and photo are dropped from the Google identity'
);
select is(
  (select count(*) from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2::bigint,
  'each new parent gets a profile'
);

-- Nobody signed in sees nothing.
set local role anon;
select throws_ok('select * from public.children', '42501', null, 'anon cannot read children');
reset role;

-- Sam starts a trail for Lotte.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.create_trail('Lotte', '2026-03-12', '2026-03-19')$$, 'a parent starts a trail');
select is((select first_name from public.children), 'Lotte', 'the parent sees their child');
select is(
  public.create_trail('Lotte', '2026-03-12', '2026-03-19'),
  (select id from public.trails),
  'a second call (double tap, retry) returns the same trail'
);
select is((select count(*) from public.trails), 1::bigint, 'still one trail');
select throws_ok(
  $$update public.children set avatar_path = '00000000-0000-0000-0000-000000000000/x.jpg'$$, '42501', null,
  'a parent cannot set a photo path'
);
select throws_ok(
  $$update public.children set birth_date = (now() + interval '3 days')::date, due_date = (now() + interval '3 days')::date$$, '22023', null,
  'a birth date in the future is refused on update too'
);
select throws_ok('update public.trails set deleted_at = now()', '42501', null, 'deletion columns cannot be set directly');
select lives_ok('update public.trails set family_may_keep_photos = true', 'the photo switch can be changed');
select throws_ok(
  $$update public.children set birth_date = '2020-01-01'$$, '23514', null,
  'a birth date far from the due date is refused'
);

-- Kim, another parent, sees nothing of Lotte.
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*) from public.children), 0::bigint, 'another parent cannot see the child');
select is((select count(*) from public.trails), 0::bigint, 'another parent cannot see the trail');
select is((select count(*) from public.profiles), 1::bigint, 'a parent only sees their own profile');
select throws_ok(
  $$select public.create_trail('Max', '2030-01-01', '2030-01-01')$$, '22023', null,
  'a birth date in the future is refused'
);
reset role;

select * from finish();
rollback;
