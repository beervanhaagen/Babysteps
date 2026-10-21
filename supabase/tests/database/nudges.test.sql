-- Tests for the seintjes (parent nudges in the push digest). Run: npx supabase test db
-- 19:00 Amsterdam on Monday 2026-11-02 is 18:00 UTC (winter time). Each family is set up so that
-- day is the day of its trail week we want (day_of_week = (today - birth) % 7).
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

create temp table t on commit drop as select '2026-11-02 18:00:00+00'::timestamptz as seven_pm, '2026-11-02'::date as today;
grant select on t to service_role;

-- A parent with a trail, a device that was last opened long ago, and a signup date.
create function pg_temp.family(uid uuid, child text, born date, signed_up date) returns uuid language plpgsql as $$
declare trail uuid;
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', uid || '@voorbeeld.nl');
  insert into public.profiles (id, created_at) values (uid, signed_up::timestamptz) on conflict (id) do update set created_at = excluded.created_at;
  insert into public.trails default values returning id into trail;
  insert into public.children (trail_id, first_name, birth_date, due_date) values (trail, child, born, born);
  insert into public.trail_parents (trail_id, user_id) values (trail, uid);
  insert into private.push_tokens (user_id, platform, token, last_seen_on) values (uid, 'ios', 'token-' || uid, '2026-10-01');
  return trail;
end $$;
create function pg_temp.moment(trail uuid, uid uuid, week smallint, made timestamptz) returns void language sql as $$
  insert into public.moments (trail_id, created_by, client_id, trail_week, photo_count, status, created_at, ready_at)
  values (trail, uid, gen_random_uuid(), week, 1, 'ready', made, made);
$$;
create function pg_temp.kind_for(uid uuid) returns text language sql as $$
  select kind from private.push_digest_sent where user_id = uid and day = '2026-11-02';
$$;

-- Lotte: born 2026-03-03, so 2026-11-02 is the last day (6) of week 35. Weeks 1-34 full: a streak.
create temp table lotte on commit drop as select pg_temp.family('81111111-1111-1111-1111-111111111111', 'Lotte', '2026-03-03', '2026-03-10') as id;
select pg_temp.moment((select id from lotte), '81111111-1111-1111-1111-111111111111', w::smallint, '2026-10-20') from generate_series(1, 34) w;
insert into public.circle_members (trail_id, label, invited_by) values ((select id from lotte), 'Oma Ria', '81111111-1111-1111-1111-111111111111');
-- Noor: born 2026-09-04, so 2026-11-02 is day 3 of week 9; signed up 10 days ago: an idea midweek.
create temp table noor on commit drop as select pg_temp.family('82222222-2222-2222-2222-222222222222', 'Noor', '2026-09-04', '2026-10-23') as id;
select pg_temp.moment((select id from noor), '82222222-2222-2222-2222-222222222222', 1::smallint, '2026-10-24');
insert into public.circle_members (trail_id, label, invited_by) values ((select id from noor), 'Opa Henk', '82222222-2222-2222-2222-222222222222');
-- Max: signed up yesterday, nothing pinned yet: the first "start" seintje.
create temp table max on commit drop as select pg_temp.family('83333333-3333-3333-3333-333333333333', 'Max', '2026-10-01', '2026-11-01') as id;
-- Sem: first moment 3 days ago, nobody invited yet: the circle seintje.
create temp table sem on commit drop as select pg_temp.family('84444444-4444-4444-4444-444444444444', 'Sem', '2026-10-15', '2026-10-28') as id;
select pg_temp.moment((select id from sem), '84444444-4444-4444-4444-444444444444', 3::smallint, '2026-10-30 10:00+01');
-- Fien: last day of the week and empty, but she opened the app today: nothing.
create temp table fien on commit drop as select pg_temp.family('85555555-5555-5555-5555-555555555555', 'Fien', '2026-03-03', '2026-03-10') as id;
select pg_temp.moment((select id from fien), '85555555-5555-5555-5555-555555555555', 30::smallint, '2026-10-01');
update private.push_tokens set last_seen_on = '2026-11-02' where user_id = '85555555-5555-5555-5555-555555555555';
-- Bo: last day of week 35, but switched seintjes off.
create temp table bo on commit drop as select pg_temp.family('86666666-6666-6666-6666-666666666666', 'Bo', '2026-03-03', '2026-03-10') as id;
select pg_temp.moment((select id from bo), '86666666-6666-6666-6666-666666666666', 30::smallint, '2026-10-01');
update public.profiles set notify_nudges = false where id = '86666666-6666-6666-6666-666666666666';
-- Teun: ignored six seintjes in a row: only on the month birthday (born on the 2nd).
create temp table teun on commit drop as select pg_temp.family('87777777-7777-7777-7777-777777777777', 'Teun', '2026-05-02', '2026-05-10') as id;
select pg_temp.moment((select id from teun), '87777777-7777-7777-7777-777777777777', 2::smallint, '2026-05-20');
insert into private.nudge_state (user_id, last_sent_on, answered, ignored_in_row) values ('87777777-7777-7777-7777-777777777777', '2026-10-26', false, 5);
-- Isa: ignored three; Monday is the last day of week 31 (odd): no seintje this week.
create temp table isa on commit drop as select pg_temp.family('88888888-8888-8888-8888-888888888888', 'Isa', '2026-03-31', '2026-04-05') as id;
select pg_temp.moment((select id from isa), '88888888-8888-8888-8888-888888888888', 20::smallint, '2026-08-20');
insert into private.nudge_state (user_id, last_sent_on, answered, ignored_in_row) values ('88888888-8888-8888-8888-888888888888', '2026-10-26', false, 2);

-- Kees: new (signed up 10 days ago), last day of an empty week, but two seintjes already this trail week.
create temp table kees on commit drop as select pg_temp.family('89999999-9999-9999-9999-999999999999', 'Kees', '2026-03-03', '2026-10-23') as id;
select pg_temp.moment((select id from kees), '89999999-9999-9999-9999-999999999999', 30::smallint, '2026-10-01');
insert into public.circle_members (trail_id, label, invited_by) values ((select id from kees), 'Oma Ria', '89999999-9999-9999-9999-999999999999');
insert into private.push_digest_sent (user_id, day, kind) values ('89999999-9999-9999-9999-999999999999', '2026-10-28', 'kring'), ('89999999-9999-9999-9999-999999999999', '2026-10-30', 'idee');
-- Lars: last day of an empty week, and Oma sent a hug today: the hug push wins.
create temp table lars on commit drop as select pg_temp.family('8aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lars', '2026-03-03', '2026-03-10') as id;
insert into public.moments (id, trail_id, created_by, client_id, trail_week, photo_count, status, created_at, ready_at)
values ('b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select id from lars), '8aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid(), 30, 1, 'ready', '2026-10-01', '2026-10-01');
insert into public.circle_members (id, trail_id, label, invited_by) values ('c1111111-cccc-cccc-cccc-cccccccccccc', (select id from lars), 'Oma Ria', '8aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
insert into public.reactions (moment_id, trail_id, circle_member_id, kind, created_at)
values ('b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select id from lars), 'c1111111-cccc-cccc-cccc-cccccccccccc', 'hug', '2026-11-02 12:00+01');
-- Jet: week 79 (past the trail), last day, empty: nothing.
create temp table jet on commit drop as select pg_temp.family('8bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Jet', '2025-04-29', '2025-05-10') as id;
select pg_temp.moment((select id from jet), '8bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 70::smallint, '2026-09-01');
-- Lotte's parent is also on a second trail that's due: one seintje, and no error.
insert into public.trails (id) values ('d1111111-dddd-dddd-dddd-dddddddddddd');
insert into public.children (trail_id, first_name, birth_date, due_date) values ('d1111111-dddd-dddd-dddd-dddddddddddd', 'Tijn', '2026-03-03', '2026-03-03');
insert into public.trail_parents (trail_id, user_id, joined_at) values ('d1111111-dddd-dddd-dddd-dddddddddddd', '81111111-1111-1111-1111-111111111111', now() + interval '1 day');

set local role service_role;
create temp table run on commit drop as select * from public.push_digest((select seven_pm from t));
reset role;

select is(pg_temp.kind_for('81111111-1111-1111-1111-111111111111'), 'week', 'an empty week on its last day gets the seintje');
select is((select body from run where token = 'token-81111111-1111-1111-1111-111111111111'), '34 weken op rij een moment van Lotte. Nog iets vastpinnen voor deze week?', 'with the streak');
select is(pg_temp.kind_for('82222222-2222-2222-2222-222222222222'), 'idee', 'new parents get an idea midweek');
select is(pg_temp.kind_for('83333333-3333-3333-3333-333333333333'), 'start', 'nothing pinned yet: the start seintje');
select is((select body from run where token = 'token-83333333-3333-3333-3333-333333333333'), 'Het pad van Max staat klaar. Eén foto en één zinnetje, meer hoeft niet.', 'in its own words');
select is(pg_temp.kind_for('84444444-4444-4444-4444-444444444444'), 'kring', 'nobody invited three days after the first moment: the circle');
select is(pg_temp.kind_for('85555555-5555-5555-5555-555555555555'), null, 'opened the app today: nothing');
select is(pg_temp.kind_for('86666666-6666-6666-6666-666666666666'), null, 'seintjes off: nothing');
select is(pg_temp.kind_for('87777777-7777-7777-7777-777777777777'), 'terug', 'after six ignored, only the month birthday');
select is((select body from run where token = 'token-87777777-7777-7777-7777-777777777777'), 'Teun is vandaag 6 maanden. Het pad wacht rustig op je. Oudere foto’s kunnen er ook nog op.', 'that says how old');
select is(pg_temp.kind_for('88888888-8888-8888-8888-888888888888'), null, 'after three ignored, the seintje every other week');
select is((select count(*) from run where body ~ '[0-9]{4}|week [0-9]'), 0::bigint, 'never a date or a week number on the lock screen');
select is(pg_temp.kind_for('89999999-9999-9999-9999-999999999999'), null, 'at most two seintjes per trail week in the first weeks');
select is(pg_temp.kind_for('8aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'daily', 'a hug and a seintje on one day: the hug wins');
select is(pg_temp.kind_for('8bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), null, 'nothing after week 78');
select is((select count(*) from run where token = 'token-81111111-1111-1111-1111-111111111111'), 1::bigint, 'a parent on two trails gets one push');

-- The ladder: Lotte's seintje counts as ignored once the next one goes out without her coming back.
select is((select ignored_in_row::text || answered::text from private.nudge_state where user_id = '81111111-1111-1111-1111-111111111111'), '0false', 'a sent seintje waits for an answer');
update private.push_tokens set last_seen_on = '2026-11-03' where user_id = '81111111-1111-1111-1111-111111111111';
set local role service_role;
select is((select count(*) from public.push_digest((select seven_pm from t) + interval '1 day') where token = 'token-81111111-1111-1111-1111-111111111111'), 0::bigint, 'the next day, not Lotte again');
reset role;
select is((select ignored_in_row::text || answered::text from private.nudge_state where user_id = '81111111-1111-1111-1111-111111111111'), '0true', 'opening the app answers it');

set local role service_role;
select is((select count(*) from public.push_digest((select seven_pm from t))), 0::bigint, 'a second run the same day sends nothing');
reset role;

-- Roos, born on 31 May and quiet for long: her month birthday in November is the 30th.
create temp table roos on commit drop as select pg_temp.family('8ccccccc-cccc-cccc-cccc-cccccccccccc', 'Roos', '2026-05-31', '2026-06-05') as id;
select pg_temp.moment((select id from roos), '8ccccccc-cccc-cccc-cccc-cccccccccccc', 2::smallint, '2026-06-10');
insert into private.nudge_state (user_id, last_sent_on, answered, ignored_in_row) values ('8ccccccc-cccc-cccc-cccc-cccccccccccc', '2026-10-30', false, 6);
set local role service_role;
create temp table late on commit drop as select * from public.push_digest('2026-11-30 18:00:00+00');
reset role;
select is((select body from late where token = 'token-8ccccccc-cccc-cccc-cccc-cccccccccccc'), 'Roos is vandaag 6 maanden. Het pad wacht rustig op je. Oudere foto’s kunnen er ook nog op.', 'a birthday on the 31st falls on the last day of a shorter month');

select * from finish();
rollback;
