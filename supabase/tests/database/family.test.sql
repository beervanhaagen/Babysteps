-- Privacy tests for step 4: the circle, links, sessions and hugs. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- The same SHA-256 the edge function uses, for the steps that stand in for it.
create function pg_temp.h(text) returns text language sql as $$ select encode(extensions.digest($1, 'sha256'), 'hex') $$;
grant execute on function pg_temp.h(text) to service_role;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'kim@voorbeeld.nl');

-- Sam starts Lotte's trail, pins a moment that is ready, and invites Oma Ria.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-12', '2026-03-19');
create temp table invite on commit drop as select * from public.invite_family('Oma Ria', 'oma');
grant select on invite to service_role;
select is((select count(*) from public.circle_members), 1::bigint, 'the parent sees the invited person');
select ok((select length(code) >= 40 from invite), 'the link code is long and random');
reset role;

insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from public.trail_parents where user_id = '11111111-1111-1111-1111-111111111111'), '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 31, 1, 'ready'),
       ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select trail_id from public.trail_parents where user_id = '11111111-1111-1111-1111-111111111111'), '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 31, 1, 'uploading');

select is(
  (select count(*) from private.access_keys where token_hash = (select code from invite)),
  0::bigint,
  'the code itself is never stored, only its hash'
);

-- Family functions are for the server only.
set local role authenticated;
select throws_ok($$select public.family_claim('x', 'y', 'z', '1.2.3.4')$$, '42501', null, 'a parent cannot call family functions');
reset role;
set local role anon;
select throws_ok($$select public.family_member('x')$$, '42501', null, 'nobody signed in can call family functions');
select is((select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'), 0::bigint, 'anon still has no table rights');
reset role;

-- The edge function swaps the code for a session.
set local role service_role;
select isnt(
  public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('session-1'), 'iPhone · Safari', '1.2.3.4'),
  null,
  'a valid code opens a session'
);
select is(public.family_claim(pg_temp.h('wrong'), pg_temp.h('session-x'), null, '9.9.9.9'), null, 'a wrong code opens nothing');
select is((select count(*) from public.family_member(pg_temp.h('session-1'))), 1::bigint, 'the session finds its member');
select is((select count from public.family_visits_daily where trail_id = (select trail_id from public.trail_parents where user_id = '11111111-1111-1111-1111-111111111111')), 1, 'a visit is one number per trail per day');
select is((select count(*) from public.family_member(pg_temp.h('session-1'))), 1::bigint, 'a second visit the same day');
select is((select count from public.family_visits_daily where trail_id = (select trail_id from public.trail_parents where user_id = '11111111-1111-1111-1111-111111111111')), 1, '... is not counted twice');

select is(public.family_hug((select member_id from invite), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1, 'family can hug a visible moment');
select throws_ok(
  $$select public.family_hug((select member_id from invite), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, '42501', null,
  'family cannot hug a moment that is still uploading'
);
select public.family_join((select member_id from invite), 'Oma Ria', 'ria@voorbeeld.nl', 'never');
select is((select email from public.circle_members where id = (select member_id from invite)), null, '"Liever niet" keeps no e-mail address');
reset role;

-- Too many wrong codes from one address: even the right code is refused for a while.
set local role service_role;
select public.family_claim(pg_temp.h('wrong-' || i), pg_temp.h('s-' || i), null, '6.6.6.6') from generate_series(1, 20) i;
select is(
  public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('session-2'), null, '6.6.6.6'), null,
  'after 20 wrong codes in 10 minutes an address is blocked'
);
reset role;

-- Kim sees nothing of Lotte's circle or hugs.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*) from public.circle_members), 0::bigint, 'another parent cannot see the circle');
select is((select count(*) from public.reactions), 0::bigint, 'another parent cannot see the hugs');
select throws_ok($$select public.revoke_family((select member_id from invite))$$, '42501', null, 'another parent cannot revoke');

-- Sam revokes Oma Ria: her session stops at once.
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.revoke_family((select member_id from invite));
reset role;
set local role service_role;
select is((select count(*) from public.family_member(pg_temp.h('session-1'))), 0::bigint, 'a revoked person is out on every device');
reset role;

select * from finish();
rollback;
