-- Tests for M3: devices per family member, and logging out one. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

create function pg_temp.h(text) returns text language sql as $$ select encode(extensions.digest($1, 'sha256'), 'hex') $$;
grant execute on function pg_temp.h(text) to service_role;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '94444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'toestel-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '95555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'toestel-kim@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "94444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
reset role;
grant select on ria to authenticated, service_role;
insert into private.family_sessions (id, circle_member_id, token_hash, device_hint)
values
  ('a5555555-0000-0000-0000-000000000001', (select member_id from ria), pg_temp.h('sessie-1'), 'iPhone · Safari'),
  ('a5555555-0000-0000-0000-000000000002', (select member_id from ria), pg_temp.h('sessie-2'), 'Windows · Edge');

set local role authenticated;
set local request.jwt.claims = '{"sub": "94444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select is((select count(*) from public.member_devices((select member_id from ria))), 2::bigint, 'the parent sees both devices');
select ok(not exists (select 1 from public.member_devices((select member_id from ria)) d where d.device_hint like '%sessie%'), 'never a token');
set local request.jwt.claims = '{"sub": "95555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok($$select * from public.member_devices((select member_id from ria))$$, '42501', null, 'another parent sees nothing');
select throws_ok($$select public.revoke_device('a5555555-0000-0000-0000-000000000001')$$, '42501', null, 'and logs out nothing');
set local request.jwt.claims = '{"sub": "94444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select public.revoke_device('a5555555-0000-0000-0000-000000000001');
select is((select count(*) from public.member_devices((select member_id from ria))), 1::bigint, 'one device logged out');
reset role;
set local role service_role;
select is((select count(*) from public.family_member(pg_temp.h('sessie-1'))), 0::bigint, 'and that device can no longer open the page');
reset role;

select * from finish();
rollback;
