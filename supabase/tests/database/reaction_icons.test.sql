-- Tests for reacting with icons (heart, laugh, wow, star, sun). Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '97111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'icoon-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '97222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'icoon-kim@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "97111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
set local request.jwt.claims = '{"sub": "97222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.create_trail('Noa', '2026-05-10', '2026-05-10');
reset role;
grant select on ria to service_role;
insert into public.moments (id, trail_id, created_by, client_id, trail_week, happened_on, photo_count, status)
values
  ('e7111111-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from public.trail_parents where user_id = '97111111-1111-1111-1111-111111111111'), '97111111-1111-1111-1111-111111111111', gen_random_uuid(), 3, '2026-03-20', 1, 'ready'),
  ('e7222222-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from public.trail_parents where user_id = '97222222-2222-2222-2222-222222222222'), '97222222-2222-2222-2222-222222222222', gen_random_uuid(), 2, '2026-05-15', 1, 'ready');

set local role service_role;
select is((select total from public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'heart') where kind = 'heart'), 1, 'Oma sends a heart');
select public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'star');
select public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'hug');
select is((select reactions->'star'->>'mine' from public.family_page((select member_id from ria), 0, 10)), '1', 'the family page counts each kind, with her own');
select is((select hugs from public.family_page((select member_id from ria), 0, 10)), 1, 'hugs still count only hugs');
select throws_ok($$select * from public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'poop')$$, '22023', null, 'only our own icons');
select throws_ok($$select * from public.family_react((select member_id from ria), 'e7222222-eeee-eeee-eeee-eeeeeeeeeeee', 'heart')$$, '42501', null, 'never on another trail');
select public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'sun') from generate_series(1, 15);
select is((select mine from public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'sun') where kind = 'sun'), 10, 'at most ten of a kind per moment');
select public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', k) from unnest(array['laugh', 'wow', 'heart', 'star']) k, generate_series(1, 10);
select is((select sum(mine)::integer from public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'wow')), 30, 'and thirty in all');
reset role;
-- The parents see who sent what; another parent sees nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub": "97111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is((select count(*) from public.reactions where kind = 'heart'), 1::bigint, 'the parent sees the heart');
set local request.jwt.claims = '{"sub": "97222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*) from public.reactions where moment_id = 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee'), 0::bigint, 'another parent sees nothing');
reset role;
select is(private.push_love_sentence('Lotte', array['Oma Ria'], 3, 1), 'Oma Ria stuurde Lotte iets liefs', 'a push with icons never names them');

-- While Lotte's trail is in its 30 days before deletion, or after Oma is taken off the circle: nothing.
set local role service_role;
select public.request_deletion('97111111-1111-1111-1111-111111111111', 'trail', false);
select throws_ok($$select * from public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'heart')$$, '42501', null, 'no reactions on a trail being deleted');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "97111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.restore_deletion();
select public.revoke_family((select member_id from ria));
reset role;
set local role service_role;
select throws_ok($$select * from public.family_react((select member_id from ria), 'e7111111-eeee-eeee-eeee-eeeeeeeeeeee', 'heart')$$, '42501', null, 'nor from someone taken off the circle');
reset role;

select * from finish();
rollback;
