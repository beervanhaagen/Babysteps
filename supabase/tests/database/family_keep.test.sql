-- Tests for M6 "Familie mag foto's bewaren": only the view version, only while the switch is on.
-- Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '92222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'bewaar-sam@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "92222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
reset role;
grant select on ria to service_role;
create temp table lotte on commit drop as select trail_id from public.trail_parents where user_id = '92222222-2222-2222-2222-222222222222';
grant select on lotte to authenticated, service_role;
insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status, ready_at)
values ('f1111111-ffff-ffff-ffff-ffffffffffff', (select trail_id from lotte), '92222222-2222-2222-2222-222222222222', gen_random_uuid(), 3, 1, 'ready', now());
insert into public.moment_photos (moment_id, trail_id, position, width, height, print_long_edge, print_path, view_path, small_path)
values ('f1111111-ffff-ffff-ffff-ffffffffffff', (select trail_id from lotte), 0, 1280, 960, 3600,
  (select trail_id from lotte) || '/f1111111-ffff-ffff-ffff-ffffffffffff/0-print.jpg',
  (select trail_id from lotte) || '/f1111111-ffff-ffff-ffff-ffffffffffff/0-view.webp',
  (select trail_id from lotte) || '/f1111111-ffff-ffff-ffff-ffffffffffff/0-small.jpg');

set local role service_role;
select is(public.family_keep_photo((select member_id from ria), 'f1111111-ffff-ffff-ffff-ffffffffffff', 0::smallint), null, 'off by default: family can only look');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "92222222-2222-2222-2222-222222222222", "role": "authenticated"}';
update public.trails set family_may_keep_photos = true where id = (select trail_id from lotte);
reset role;
set local role service_role;
select is(public.family_keep_photo((select member_id from ria), 'f1111111-ffff-ffff-ffff-ffffffffffff', 0::smallint), (select trail_id from lotte) || '/f1111111-ffff-ffff-ffff-ffffffffffff/0-view.webp', 'switched on: the view version, never print');
reset role;
update public.circle_members set revoked_at = now() where id = (select member_id from ria);
set local role service_role;
select is(public.family_keep_photo((select member_id from ria), 'f1111111-ffff-ffff-ffff-ffffffffffff', 0::smallint), null, 'not once taken out of the circle');
reset role;
update public.circle_members set revoked_at = null where id = (select member_id from ria);
update public.moments set deleted_at = now() where id = 'f1111111-ffff-ffff-ffff-ffffffffffff';
set local role service_role;
select is(public.family_keep_photo((select member_id from ria), 'f1111111-ffff-ffff-ffff-ffffffffffff', 0::smallint), null, 'not for a deleted moment');
reset role;
update public.moments set deleted_at = null where id = 'f1111111-ffff-ffff-ffff-ffffffffffff';
update public.trails set paused_at = now() where id = (select trail_id from lotte);
set local role service_role;
select is(public.family_keep_photo((select member_id from ria), 'f1111111-ffff-ffff-ffff-ffffffffffff', 0::smallint), null, 'not on a paused trail');
reset role;
update public.trails set paused_at = null where id = (select trail_id from lotte);
set local role service_role;
select is(public.family_keep_photo((select member_id from ria), 'f1111111-ffff-ffff-ffff-ffffffffffff', 5::smallint), null, 'not a photo that isn''t there');
reset role;
update public.trails set delete_requested_at = now() where id = (select trail_id from lotte);
set local role service_role;
select is(public.family_keep_photo((select member_id from ria), 'f1111111-ffff-ffff-ffff-ffffffffffff', 0::smallint), null, 'not while the trail is being deleted');
reset role;
update public.trails set delete_requested_at = null where id = (select trail_id from lotte);
-- Someone in another family's circle never reaches Lotte's photos.
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '93333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'bewaar-kim@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "93333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select public.create_trail('Noor', '2026-03-02', '2026-03-02');
create temp table henk on commit drop as select * from public.invite_family('Opa Henk', 'opa');
reset role;
grant select on henk to service_role;
update public.trails set family_may_keep_photos = true where id = (select trail_id from public.trail_parents where user_id = '93333333-3333-3333-3333-333333333333');
set local role service_role;
select is(public.family_keep_photo((select member_id from henk), 'f1111111-ffff-ffff-ffff-ffffffffffff', 0::smallint), null, 'never a photo of another family''s trail');
reset role;
set local role authenticated;
select throws_ok($$select public.family_keep_photo(gen_random_uuid(), gen_random_uuid(), 0::smallint)$$, '42501', null, 'parents and the app cannot call it');
reset role;

select * from finish();
rollback;
