-- Tests for the keyring: one browser following two grandchildren. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create function pg_temp.h(text) returns text language sql as $$ select encode(extensions.digest($1, 'sha256'), 'hex') $$;
grant execute on function pg_temp.h(text) to service_role;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '96111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'sleutel-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '96222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'sleutel-kim@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "96111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
create temp table lotte_oma on commit drop as select * from public.invite_family('Oma Ria', 'oma');
set local request.jwt.claims = '{"sub": "96222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.create_trail('Noa', '2026-05-10', '2026-05-10');
create temp table noa_oma on commit drop as select * from public.invite_family('Oma Ria', 'oma');
reset role;
grant select on lotte_oma, noa_oma to service_role;

set local role service_role;
-- Oma opens Lotte's link, then Noa's, on the same phone: two sessions, both kept.
select is((select status from public.family_claim(pg_temp.h((select code from lotte_oma)), pg_temp.h('tok-lotte'), 'iPhone · Safari', '1.2.3.4', '{}')), 'ok', 'the first link opens');
select is((select status from public.family_claim(pg_temp.h((select code from noa_oma)), pg_temp.h('tok-noa'), 'iPhone · Safari', '1.2.3.4', array[pg_temp.h('tok-lotte')])), 'ok', 'the second link adds a session');
-- Opening Lotte's link again is the same device, not a new one.
select is((select status from public.family_claim(pg_temp.h((select code from lotte_oma)), pg_temp.h('tok-nieuw'), 'iPhone · Safari', '1.2.3.4', array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')])), 'same', 'switching back is the same device');
reset role;
select is((select count(*) from private.family_sessions where circle_member_id = (select member_id from lotte_oma)), 1::bigint, 'so no extra device session');
set local role service_role;

-- Asking for a child.
select is((select member from public.family_member_in(array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')], (select member_id from lotte_oma)) where chosen), (select member_id from lotte_oma), 'Lotte when asked for Lotte');
select is((select member from public.family_member_in(array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')], null) where chosen), (select member_id from noa_oma), 'without a wish, the last one opened');
select is((select count(*) from public.family_member_in(array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')], null)), 2::bigint, 'both sessions still work');
-- The main test: a member id that isn't in the cookie gets nothing.
select is((select count(*) from public.family_member_in(array[pg_temp.h('tok-lotte')], (select member_id from noa_oma)) where chosen), 0::bigint, 'a child whose key is not on this phone can never be chosen');
select is((select count(*) from public.family_member_in(array[pg_temp.h('verzonnen')], null)), 0::bigint, 'nor does a made-up token');

-- The start page lists both, with the child and how Oma is called there.
select is((select string_agg(first_name || ':' || label, ',' order by first_name) from public.family_keyring(array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')])), 'Lotte:Oma Ria,Noa:Oma Ria', 'the start page shows both children');
reset role;

-- Lotte's parents ask to delete the trail: for 30 days nothing opens, but Oma keeps her key, so
-- "Toch bewaren" brings her back.
select public.request_deletion('96111111-1111-1111-1111-111111111111', 'trail', false);
select is((select count(*) from public.family_member_in(array[pg_temp.h('tok-lotte')], (select member_id from lotte_oma)) where chosen), 0::bigint, 'a trail being deleted opens nothing');
select is((select count(*) from public.family_member_in(array[pg_temp.h('tok-lotte')], null)), 1::bigint, 'but its key stays on the ring');
select is((select count(*) from public.family_keyring(array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')])), 1::bigint, 'and the start page leaves it out for now');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "96111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.restore_deletion();
reset role;
set local role service_role;
select is((select count(*) from public.family_member_in(array[pg_temp.h('tok-lotte')], (select member_id from lotte_oma)) where chosen), 1::bigint, 'after "Toch bewaren" the same key opens the page again');
-- A key pushed off a full ring ends its session.
select public.family_forget_session(pg_temp.h('tok-lotte'));
select is((select count(*) from public.family_keys_alive(array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')])), 1::bigint, 'a forgotten key is gone for good');
reset role;

-- A parent takes Oma off Noa's circle: that session drops out, Lotte stays.
set local role authenticated;
set local request.jwt.claims = '{"sub": "96222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.revoke_family((select member_id from noa_oma));
reset role;
set local role service_role;
select is((select count(*) from public.family_member_in(array[pg_temp.h('tok-lotte'), pg_temp.h('tok-noa')], null)), 0::bigint, 'a revoked circle drops out of the keyring');
reset role;
-- The app can't call any of it.
set local role authenticated;
select throws_ok($$select * from public.family_keyring(array['x'])$$, '42501', null, 'parents cannot read a keyring');
reset role;

select * from finish();
rollback;
