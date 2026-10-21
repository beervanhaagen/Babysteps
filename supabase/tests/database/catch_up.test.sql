-- Tests for O6 Inhalen: older weeks pinned now stay out of the Sunday mail, and at most 100 new
-- moments per trail per day. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '71111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'inhaal-sam@voorbeeld.nl');

-- A Sunday 20:30 in Amsterdam, and Lotte born 70 days before it: that Sunday is in week 11.
create temp table t on commit drop as
  select ((date_trunc('week', now() at time zone 'Europe/Amsterdam')::date + 13) + time '20:30') at time zone 'Europe/Amsterdam' as sunday;
grant select on t to authenticated, service_role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "71111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', ((select sunday from t) at time zone 'Europe/Amsterdam')::date - 70, ((select sunday from t) at time zone 'Europe/Amsterdam')::date - 70);
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
reset role;
create temp table lotte on commit drop as select trail_id from public.trail_parents where user_id = '71111111-1111-1111-1111-111111111111';
grant select on lotte, ria to authenticated, service_role;
update public.circle_members set email = 'ria@voorbeeld.nl', email_confirmed_at = now(), email_frequency = 'weekly', joined_at = now() where id = (select member_id from ria);

-- Pinned the Saturday before that Sunday: a moment of week 11, and two catch-up moments (week 2 and 5).
insert into public.moments (trail_id, created_by, client_id, trail_week, caption, photo_count, status, created_at, ready_at)
select (select trail_id from lotte), '71111111-1111-1111-1111-111111111111', gen_random_uuid(), w, c, 1, 'ready', (select sunday from t) - interval '1 day', (select sunday from t) - interval '1 day'
from (values (11::smallint, 'Deze week'), (2::smallint, 'Ingehaald'), (5::smallint, 'Ook ingehaald')) v(w, c);

set local role service_role;
create temp table run on commit drop as select * from public.family_sunday_mail((select sunday from t));
reset role;
select is((select moment_count from run), 1, 'the Sunday mail counts only the moment of this week');
select is((select moments -> 0 ->> 'caption' from run), 'Deze week', 'and shows only that one');
select ok(private.pinned_on_time((select trail_id from lotte), 10::smallint, (select sunday from t)), 'last week still counts as news');
select ok(not private.pinned_on_time((select trail_id from lotte), 9::smallint, (select sunday from t)), 'two weeks back does not');

-- The daily cap: with the three above (pinned "today" as far as the cap knows) and 96 more, moment
-- 100 still fits; 101 says "later".
insert into public.moments (trail_id, created_by, client_id, trail_week, photo_count, status, created_at)
select (select trail_id from lotte), '71111111-1111-1111-1111-111111111111', gen_random_uuid(), 1, 1, 'uploading', now() from generate_series(1, 96);
set local role authenticated;
set local request.jwt.claims = '{"sub": "71111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select from public.create_moment((select trail_id from lotte), gen_random_uuid(), 3::smallint, null, '', false, '', '[{"taken_at": null, "width": 10, "height": 10, "print_long_edge": 3600}]'::jsonb)$$, 'moment 100 of the day is fine');
select throws_ok($$select from public.create_moment((select trail_id from lotte), gen_random_uuid(), 3::smallint, null, '', false, '', '[{"taken_at": null, "width": 10, "height": 10, "print_long_edge": 3600}]'::jsonb)$$, '54000', null, 'moment 101 waits until tomorrow');

select * from finish();
rollback;
