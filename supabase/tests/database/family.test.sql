-- Privacy tests for step 4: the circle, links, sessions and hugs. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- The same SHA-256 the edge function uses, for the steps that stand in for it.
create function pg_temp.h(text) returns text language sql as $$ select encode(extensions.digest($1, 'sha256'), 'hex') $$;
grant execute on function pg_temp.h(text) to service_role;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'kim@voorbeeld.nl');

-- Kim has her own trail with a moment.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.create_trail('Noa', '2026-05-01', '2026-05-01');

-- Sam starts Lotte's trail and invites Oma Ria.
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-12', '2026-03-19');
create temp table invite on commit drop as select * from public.invite_family('Oma Ria', 'oma');
grant select on invite to service_role;
select is((select count(*) from public.circle_members), 1::bigint, 'the parent sees the invited person');
select throws_ok($$select email from public.circle_members$$, '42501', null, 'but never their e-mail address');
select ok((select length(code) >= 40 from invite), 'the link code is long and random');
reset role;

create temp table trail_of on commit drop as
select (select trail_id from public.trail_parents where user_id = '11111111-1111-1111-1111-111111111111') as lotte,
       (select trail_id from public.trail_parents where user_id = '22222222-2222-2222-2222-222222222222') as noa;
grant select on trail_of to service_role, authenticated;

insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select lotte from trail_of), '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 31, 1, 'ready'),
       ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select lotte from trail_of), '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 31, 1, 'uploading'),
       ('cccccccc-cccc-cccc-cccc-cccccccccccc', (select noa from trail_of), '22222222-2222-2222-2222-222222222222', gen_random_uuid(), 3, 1, 'ready');

select is((select count(*) from private.access_keys where token_hash = (select code from invite)), 0::bigint, 'the code itself is never stored, only its hash');

-- Family functions are for the server only.
set local role authenticated;
select throws_ok($$select * from public.family_claim('x', 'y', 'z', '1.2.3.4', null)$$, '42501', null, 'a parent cannot call family functions');
reset role;
set local role anon;
select throws_ok($$select * from public.family_member('x')$$, '42501', null, 'nobody signed in can call family functions');
select is((select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'), 0::bigint, 'anon still has no table rights');
reset role;

-- Opening the link: a session; again on the same device: the same session.
set local role service_role;
select is((select status from public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('s1'), 'iPhone · Safari', '1.2.3.4', null)), 'ok', 'a valid code opens a session');
select is((select status from public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('s1b'), 'iPhone · Safari', '1.2.3.4', pg_temp.h('s1'))), 'same', 'the same device opening the link again gets no new session');
select is((select status from public.family_claim(pg_temp.h('wrong'), pg_temp.h('sx'), null, '9.9.9.9', null)), 'unknown', 'a wrong code opens nothing');
select is((select count(*) from public.family_member(pg_temp.h('s1'))), 1::bigint, 'the session finds its member');
select is((select count from public.family_visits_daily where trail_id = (select lotte from trail_of)), 1, 'a visit is one number per trail per day');
select is((select count(*) from public.family_member(pg_temp.h('s1'))), 1::bigint, 'a second visit the same day');
select is((select count from public.family_visits_daily where trail_id = (select lotte from trail_of)), 1, '... is not counted twice');

-- Five devices at most; a sixth is refused, nobody is pushed out.
select public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('s' || i), null, '1.2.3.4', null) from generate_series(2, 5) i;
select is((select status from public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('s6'), null, '1.2.3.4', null)), 'full', 'a sixth device is refused');
select is((select count(*) from public.family_member(pg_temp.h('s1'))), 1::bigint, 'and the first device is still in');

-- What family sees.
select is((select count(*) from public.family_page((select member_id from invite), 0, 12)), 1::bigint, 'family sees only ready moments of their own trail');
select is((select mine from public.family_hug((select member_id from invite), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')), 1, 'family can hug a visible moment');
select is((select hugs from public.family_page((select member_id from invite), 0, 12)), 1, 'the page counts the hug');
select throws_ok(
  $$select * from public.family_hug((select member_id from invite), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, '42501', null,
  'family cannot hug a moment that is still uploading'
);
select throws_ok(
  $$select * from public.family_hug((select member_id from invite), 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$, '42501', null,
  'family cannot hug a moment of another trail'
);
select public.family_join((select member_id from invite), 'Oma Ria', 'ria@voorbeeld.nl', 'never');
select is((select email from public.circle_members where id = (select member_id from invite)), null, '"Liever niet" keeps no e-mail address');

-- A session not used for more than 180 days has expired.
reset role;
update private.family_sessions set last_used_on = current_date - 181 where token_hash = pg_temp.h('s2');
set local role service_role;
select is((select count(*) from public.family_member(pg_temp.h('s2'))), 0::bigint, 'a session unused for 180 days has expired');

-- Too many wrong codes from one address: even the right code is refused for a while.
select public.family_claim(pg_temp.h('wrong-' || i), pg_temp.h('w-' || i), null, '6.6.6.6', null) from generate_series(1, 20) i;
select is((select status from public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('s7'), null, '6.6.6.6', null)), 'blocked', 'after 20 wrong codes in 10 minutes an address is blocked');
reset role;
select is((select count(*) from private.claim_failures where ip_hash = '6.6.6.6'), 0::bigint, 'the address itself is never stored');

-- A paused trail: no way in.
update public.trails set paused_at = now() where id = (select lotte from trail_of);
set local role service_role;
select is((select count(*) from public.family_member(pg_temp.h('s1'))), 0::bigint, 'nobody gets in while a trail is paused');
reset role;
update public.trails set paused_at = null where id = (select lotte from trail_of);

-- Kim sees nothing of Lotte's circle or hugs.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*) from public.circle_members), 0::bigint, 'another parent cannot see the circle');
select is((select count(*) from public.reactions), 0::bigint, 'another parent cannot see the hugs');
select throws_ok($$select public.revoke_family((select member_id from invite))$$, '42501', null, 'another parent cannot revoke');

-- A new link: the old link and every device stop.
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
create temp table fresh on commit drop as select public.new_family_link((select member_id from invite)) as code;
grant select on fresh to service_role;
reset role;
set local role service_role;
select is((select status from public.family_claim(pg_temp.h((select code from invite)), pg_temp.h('s8'), null, '1.2.3.4', null)), 'unknown', 'the old link stops after a new one is sent');
select is((select count(*) from public.family_member(pg_temp.h('s1'))), 0::bigint, 'and so do the devices that used it');
select is((select status from public.family_claim(pg_temp.h((select code from fresh)), pg_temp.h('s9'), null, '1.2.3.4', null)), 'ok', 'the new link works');

-- Oma stops herself: out, and her address is gone.
select public.family_join((select member_id from invite), 'Oma Ria', 'ria@voorbeeld.nl', 'weekly');
select public.family_leave((select member_id from invite));
select is((select count(*) from public.family_member(pg_temp.h('s9'))), 0::bigint, 'after leaving, the page is closed');
select is((select email from public.circle_members where id = (select member_id from invite)), null, 'and no e-mail address stays behind');
reset role;
select is((select count(*) from private.family_sessions where circle_member_id = (select member_id from invite)), 0::bigint, 'her devices are deleted, not just blocked');
select is((select count(*) from private.access_keys where circle_member_id = (select member_id from invite)), 0::bigint, 'and so are her links');

select * from finish();
rollback;
