-- Tests for M1 "Profiel van Lotte": a new birth date moves the weeks along. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '91111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'profiel-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '91222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'profiel-kim@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "91111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
reset role;
create temp table lotte on commit drop as select trail_id from public.trail_parents where user_id = '91111111-1111-1111-1111-111111111111';
grant select on lotte to authenticated;
-- 2026-03-20 is in week 3. One moment in its own week, one moved by hand to week 5, one without a
-- photo day (pinned 2026-03-20, also week 3), and one from the first days (2026-03-04, week 1).
insert into public.moments (id, trail_id, created_by, client_id, trail_week, happened_on, created_at, photo_count, status)
values
  ('e1111111-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), '91111111-1111-1111-1111-111111111111', gen_random_uuid(), 3, '2026-03-20', '2026-03-21 10:00+01', 1, 'ready'),
  ('e2222222-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), '91111111-1111-1111-1111-111111111111', gen_random_uuid(), 5, '2026-03-20', '2026-03-21 10:00+01', 1, 'ready'),
  ('e3333333-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), '91111111-1111-1111-1111-111111111111', gen_random_uuid(), 3, null, '2026-03-20 10:00+01', 1, 'ready'),
  ('e4444444-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), '91111111-1111-1111-1111-111111111111', gen_random_uuid(), 1, '2026-03-04', '2026-03-05 10:00+01', 1, 'ready');

-- The birth date was a week off: born 2026-03-09, so 2026-03-20 is in week 2.
set local role authenticated;
set local request.jwt.claims = '{"sub": "91111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$update public.children set first_name = 'Lot', birth_date = '2026-03-09' where trail_id = (select trail_id from lotte)$$, 'the parent edits the profile');
reset role;
select is((select first_name from public.children where trail_id = (select trail_id from lotte)), 'Lot', 'the new name is kept');
select is((select trail_week from public.moments where id = 'e1111111-eeee-eeee-eeee-eeeeeeeeeeee'), 2::smallint, 'a moment in its own week moves along');
select is((select trail_week from public.moments where id = 'e2222222-eeee-eeee-eeee-eeeeeeeeeeee'), 5::smallint, 'one moved by hand stays where the parent put it');
select is((select trail_week from public.moments where id = 'e3333333-eeee-eeee-eeee-eeeeeeeeeeee'), 2::smallint, 'one without a photo day moves by the day it was pinned');
select is((select trail_week from public.moments where id = 'e4444444-eeee-eeee-eeee-eeeeeeeeeeee'), 1::smallint, 'one from before the new birth date stays in week 1');

-- And back again, a week earlier than first: weeks go up.
set local role authenticated;
set local request.jwt.claims = '{"sub": "91111111-1111-1111-1111-111111111111", "role": "authenticated"}';
update public.children set birth_date = '2026-02-23' where trail_id = (select trail_id from lotte);
reset role;
select is((select trail_week from public.moments where id = 'e1111111-eeee-eeee-eeee-eeeeeeeeeeee'), 4::smallint, 'an earlier birth date moves it to a later week');

set local role authenticated;
set local request.jwt.claims = '{"sub": "91111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$update public.children set birth_date = null where trail_id = (select trail_id from lotte)$$, '22023', null, 'the birth date cannot be taken away');
select throws_ok($$update public.children set birth_date = current_date + 30 where trail_id = (select trail_id from lotte)$$, '22023', null, 'or set in the future');
-- Another parent changes nothing.
set local request.jwt.claims = '{"sub": "91222222-2222-2222-2222-222222222222", "role": "authenticated"}';
update public.children set birth_date = '2026-03-16' where trail_id = (select trail_id from lotte);
reset role;
select is((select birth_date::text from public.children where trail_id = (select trail_id from lotte)), '2026-02-23', 'another parent cannot change it');
select is((select trail_week from public.moments where id = 'e1111111-eeee-eeee-eeee-eeeeeeeeeeee'), 4::smallint, 'nor move the weeks');

select * from finish();
rollback;
