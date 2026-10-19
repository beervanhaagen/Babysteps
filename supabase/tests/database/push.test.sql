-- Tests for step 5: at most one push per parent per day, with first names only. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '31111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'push-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '32222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'push-kim@voorbeeld.nl');

-- Sam has Lotte's trail with three family members and a ready moment.
set local role authenticated;
set local request.jwt.claims = '{"sub": "31111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-12', '2026-03-19');
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
create temp table henk on commit drop as select * from public.invite_family('Opa Henk', 'opa');
create temp table sanne on commit drop as select * from public.invite_family('Tante Sanne', 'tante');
select public.register_push_token('ios', 'sam-iphone-token-0000000001', true);
select throws_ok($$select * from private.push_tokens$$, '42501', null, 'the app cannot read device tokens');
select throws_ok($$select * from public.push_digest()$$, '42501', null, 'or ask for the digest');
reset role;

create temp table lotte on commit drop as
select trail_id from public.trail_parents where user_id = '31111111-1111-1111-1111-111111111111';
insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status)
values ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), '31111111-1111-1111-1111-111111111111', gen_random_uuid(), 31, 1, 'ready');

select is((select platform || ' ' || apns_sandbox from private.push_tokens where user_id = '31111111-1111-1111-1111-111111111111'), 'ios true', 'the parent''s device is registered');

-- 19:00 Amsterdam on 2026-11-02 is 18:00 UTC (winter time).
create temp table t on commit drop as select '2026-11-02 18:00:00+00'::timestamptz as seven_pm;
grant select on t, lotte to service_role;
insert into public.reactions (moment_id, trail_id, circle_member_id, kind, created_at)
values ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from ria), 'hug', (select seven_pm from t) - interval '2 hours');

set local role service_role;
select is((select count(*) from public.push_digest((select seven_pm from t) - interval '1 hour')), 0::bigint, 'nothing outside the 19:00 hour');
select is((select body from public.push_digest((select seven_pm from t))), 'Oma Ria stuurde Lotte een knuffel', 'one hug: who sent it');
select is((select count(*) from public.push_digest((select seven_pm from t) + interval '20 minutes')), 0::bigint, 'at most one push per parent per day');
reset role;

-- The next day: more hugs from more people.
update t set seven_pm = seven_pm + interval '1 day';
insert into public.reactions (moment_id, trail_id, circle_member_id, kind, created_at)
values ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from ria), 'hug', (select seven_pm from t) - interval '3 hours'),
       ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from ria), 'hug', (select seven_pm from t) - interval '2 hours');
set local role service_role;
select is((select body from public.push_digest((select seven_pm from t))), 'Oma Ria stuurde Lotte 2 knuffels', 'several hugs from one person');
reset role;

update t set seven_pm = seven_pm + interval '1 day';
insert into public.reactions (moment_id, trail_id, circle_member_id, kind, created_at)
values ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from ria), 'hug', (select seven_pm from t) - interval '3 hours'),
       ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from henk), 'hug', (select seven_pm from t) - interval '2 hours');
set local role service_role;
select is((select body from public.push_digest((select seven_pm from t))), 'Oma Ria en Opa Henk stuurden Lotte 2 knuffels', 'two people');
reset role;

update t set seven_pm = seven_pm + interval '1 day';
insert into public.reactions (moment_id, trail_id, circle_member_id, kind, created_at)
values ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from ria), 'hug', (select seven_pm from t) - interval '5 hours'),
       ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from henk), 'hug', (select seven_pm from t) - interval '4 hours'),
       ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from sanne), 'hug', (select seven_pm from t) - interval '3 hours');
set local role service_role;
select is((select body from public.push_digest((select seven_pm from t))), 'Lotte kreeg vandaag 3 knuffels van Oma Ria en 2 anderen', 'three or more people');
reset role;

-- No push when switched off, when the trail is paused, or for a deleted moment.
update t set seven_pm = seven_pm + interval '1 day';
insert into public.reactions (moment_id, trail_id, circle_member_id, kind, created_at)
values ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from ria), 'hug', (select seven_pm from t) - interval '1 hour');
update public.profiles set notify_reactions = false where id = '31111111-1111-1111-1111-111111111111';
set local role service_role;
select is((select count(*) from public.push_digest((select seven_pm from t))), 0::bigint, 'no push when hug notifications are off');
reset role;
update public.profiles set notify_reactions = true where id = '31111111-1111-1111-1111-111111111111';
update public.trails set paused_at = now() where id = (select trail_id from lotte);
set local role service_role;
select is((select count(*) from public.push_digest((select seven_pm from t))), 0::bigint, 'no push for a paused trail');
reset role;
update public.trails set paused_at = null where id = (select trail_id from lotte);
update public.moments set deleted_at = now() where id = 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role service_role;
select is((select count(*) from public.push_digest((select seven_pm from t))), 0::bigint, 'no push for hugs on a deleted moment');
reset role;
update public.moments set deleted_at = null where id = 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- A shared phone signing in with another account moves to that account.
set local role authenticated;
set local request.jwt.claims = '{"sub": "32222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.register_push_token('ios', 'sam-iphone-token-0000000001', false);
reset role;
select is((select user_id::text from private.push_tokens where token = 'sam-iphone-token-0000000001'), '32222222-2222-2222-2222-222222222222', 'a shared phone moves to the account that signed in');
update t set seven_pm = seven_pm + interval '1 day';
insert into public.reactions (moment_id, trail_id, circle_member_id, kind, created_at)
values ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), (select member_id from ria), 'hug', (select seven_pm from t) - interval '1 hour');
set local role service_role;
select is((select count(*) from public.push_digest((select seven_pm from t))), 0::bigint, 'so Lotte''s hugs no longer reach that phone');
reset role;

-- Logging out removes only your own device.
set local role authenticated;
select public.unregister_push_token('sam-iphone-token-0000000001');
reset role;
select is((select count(*) from private.push_tokens where token = 'sam-iphone-token-0000000001'), 0::bigint, 'logging out removes the device');
set local role anon;
select throws_ok($$select public.register_push_token('ios', 'anon-token-000000000000001', false)$$, '42501', null, 'without an account no device can be added');
reset role;
set local role service_role;
select public.push_token_invalid('nothing-here');
reset role;
select pass('an unknown invalid token is ignored');
select is((select count(*) from cron.job where jobname in ('push-digest', 'push-cleanup')), 2::bigint, 'the hourly job and the cleanup are scheduled');

select * from finish();
rollback;
