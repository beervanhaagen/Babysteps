-- Tests for written reacties under a moment. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '98111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'reactie-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '98222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'reactie-kim@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "98111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
create temp table henk on commit drop as select * from public.invite_family('Opa Henk', 'opa');
create temp table sanne on commit drop as select * from public.invite_family('Tante Sanne', 'tante');
select public.register_push_token('ios', 'reactie-sam-token-000000001', true);
set local request.jwt.claims = '{"sub": "98222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.create_trail('Noa', '2026-05-10', '2026-05-10');
reset role;
update public.profiles set first_name = 'Sam' where id = '98111111-1111-1111-1111-111111111111';
create temp table lotte on commit drop as select trail_id from public.trail_parents where user_id = '98111111-1111-1111-1111-111111111111';
grant select on ria, henk, sanne, lotte to service_role;
insert into public.moments (id, trail_id, created_by, client_id, trail_week, happened_on, photo_count, status)
values
  ('e8111111-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), '98111111-1111-1111-1111-111111111111', gen_random_uuid(), 3, '2026-03-20', 1, 'ready'),
  ('e8333333-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), '98111111-1111-1111-1111-111111111111', gen_random_uuid(), 4, '2026-03-27', 1, 'ready'),
  ('e8222222-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from public.trail_parents where user_id = '98222222-2222-2222-2222-222222222222'), '98222222-2222-2222-2222-222222222222', gen_random_uuid(), 2, '2026-05-15', 1, 'ready');

-- Family writes; the text is tidied, never rejected for a stray space or line.
set local role service_role;
select is(
  (select author || ' ' || author_kind || ' ' || mine || ' ' || can_delete from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', 'Wat een schatje!', 'c8000000-0000-0000-0000-000000000001')),
  'Oma Ria family true true', 'Oma writes a reactie, by the name the parents gave her');
select is(
  (select body from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', E'  Dikke kus \r\n\r\n\r\n\r\nvan oma\t \n', 'c8000000-0000-0000-0000-000000000002')),
  E'Dikke kus\n\nvan oma', 'trimmed, Windows line ends and empty lines tidied');
select is(
  (select body from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', E'ab‮cd\u0007', 'c8000000-0000-0000-0000-000000000003')),
  'abcd', 'direction overrides and control characters are taken out');
select is(
  (select id from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', 'Wat een schatje!', 'c8000000-0000-0000-0000-000000000001')),
  (select id from public.comments where client_id = 'c8000000-0000-0000-0000-000000000001'), 'sent again on a slow line: the same reactie');
select is((select count(*) from public.comments where circle_member_id = (select member_id from ria)), 3::bigint, 'and not a second one');
select throws_ok($$select * from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', E'  \n ', gen_random_uuid())$$, '22023', null, 'an empty reactie is refused');
select throws_ok($$select * from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', repeat('a', 501), gen_random_uuid())$$, '22023', null, 'and one over 500 characters');
select lives_ok($$select * from public.family_comment((select member_id from henk), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', repeat('é', 500), gen_random_uuid())$$, '500 characters is fine');
select throws_ok($$select * from public.family_comment((select member_id from ria), 'e8222222-eeee-eeee-eeee-eeeeeeeeeeee', 'Hallo', gen_random_uuid())$$, '42501', null, 'never on another trail');
reset role;

-- The table itself holds the line too.
select throws_ok($$insert into public.comments (moment_id, trail_id, circle_member_id, body, client_id) values ('e8111111-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), (select member_id from ria), E'a‮b', gen_random_uuid())$$, '23514', null, 'no direction overrides in the table');
select throws_ok($$insert into public.comments (moment_id, trail_id, circle_member_id, body, client_id) values ('e8111111-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), (select member_id from ria), ' hoi', gen_random_uuid())$$, '23514', null, 'nor untrimmed text');
select throws_ok($$insert into public.comments (moment_id, trail_id, body, client_id) values ('e8111111-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), 'hoi', gen_random_uuid())$$, '23514', null, 'a reactie always has one author');

-- The whole circle reads along; only your own is yours to delete.
set local role service_role;
select is(
  (select string_agg(author || ':' || mine || ':' || can_delete, ',' order by created_at, id) from public.family_comments((select member_id from henk), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', null, null, 50) where author_kind = 'family' and author = 'Oma Ria'),
  'Oma Ria:false:false,Oma Ria:false:false,Oma Ria:false:false', 'Opa reads what Oma wrote, but can''t delete it');
select is(public.family_delete_comment((select member_id from henk), (select id from public.comments where client_id = 'c8000000-0000-0000-0000-000000000001')), false, 'and his delete does nothing');
select is((select comment_count from public.family_page((select member_id from henk), 0, 10) where id = 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee'), 4, 'the family page counts the reacties');
select is((select jsonb_array_length(comments) from public.family_page((select member_id from henk), 0, 10) where id = 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee'), 3, 'and brings the newest three');
select throws_ok($$select * from public.family_comments((select member_id from ria), 'e8222222-eeee-eeee-eeee-eeeeeeeeeeee', null, null, 10)$$, '42501', null, 'no reading another trail');
select is(public.family_delete_comment((select member_id from ria), (select id from public.comments where client_id = 'c8000000-0000-0000-0000-000000000003')), true, 'Oma deletes her own');
reset role;

-- The parents: write, read, delete anything on their trail. Another parent sees nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub": "98111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is((select author || ' ' || author_kind from public.add_comment('e8111111-eeee-eeee-eeee-eeeeeeeeeeee', 'Ze lachte de hele dag', 'c8000000-0000-0000-0000-000000000009')), 'Sam parent', 'a parent writes as their first name');
select isnt((select seen_at from public.comments where client_id = 'c8000000-0000-0000-0000-000000000009'), null, 'and their own reactie is no news for the Knuffels tab');
select is((select bool_and(can_delete) from public.moment_comments('e8111111-eeee-eeee-eeee-eeeeeeeeeeee')), true, 'parents may delete every reactie');
select lives_ok($$select public.delete_comment((select id from public.comments where circle_member_id = (select member_id from henk) limit 1))$$, 'and do so');
select throws_ok($$insert into public.comments (moment_id, trail_id, user_id, body, client_id) values ('e8111111-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), '98111111-1111-1111-1111-111111111111', 'hoi', gen_random_uuid())$$, '42501', null, 'never straight into the table');
select throws_ok($$select * from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', 'hoi', gen_random_uuid())$$, '42501', null, 'nor through the family''s door');
set local request.jwt.claims = '{"sub": "98222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*) from public.comments where moment_id = 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee'), 0::bigint, 'another parent reads nothing');
select throws_ok($$select * from public.moment_comments('e8111111-eeee-eeee-eeee-eeeeeeeeeeee')$$, '42501', null, 'not through the function either');
select throws_ok($$select public.delete_comment((select id from public.comments limit 1))$$, '42501', null, 'and deletes nothing');
reset role;

-- Limits: 20 per person per moment, 100 a day.
set local role service_role;
select public.family_comment((select member_id from sanne), 'e8333333-eeee-eeee-eeee-eeeeeeeeeeee', 'Hoera ' || i, gen_random_uuid()) from generate_series(1, 20) i;
select throws_ok($$select * from public.family_comment((select member_id from sanne), 'e8333333-eeee-eeee-eeee-eeeeeeeeeeee', 'nog een', gen_random_uuid())$$, '54000', null, 'at most 20 per moment');
reset role;
insert into public.comments (moment_id, trail_id, circle_member_id, body, client_id)
select 'e8333333-eeee-eeee-eeee-eeeeeeeeeeee', (select trail_id from lotte), (select member_id from henk), 'x', gen_random_uuid() from generate_series(1, 100);
set local role service_role;
select throws_ok($$select * from public.family_comment((select member_id from henk), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', 'nog een', gen_random_uuid())$$, '54000', null, 'and 100 a day');
reset role;

-- The 19:00 push: a reactie is "iets liefs", its text never goes along.
delete from public.comments where circle_member_id <> (select member_id from ria) or circle_member_id is null;
update public.comments set created_at = '2026-11-02 17:00:00+00';
set local role service_role;
select is((select body from public.push_digest('2026-11-02 18:00:00+00') where kind = 'daily'), 'Oma Ria stuurde Lotte iets liefs', 'a reactie counts as something lovely');
reset role;

-- Taken off the circle: the reacties go at once, and nothing more can be written.
set local role authenticated;
set local request.jwt.claims = '{"sub": "98111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.revoke_family((select member_id from ria));
reset role;
select is((select count(*) from public.comments where circle_member_id = (select member_id from ria)), 0::bigint, 'leaving takes your reacties along');
set local role service_role;
select throws_ok($$select * from public.family_comment((select member_id from ria), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', 'hoi', gen_random_uuid())$$, '42501', null, 'and no more writing');
reset role;

-- A deleted moment, or a trail being deleted: closed.
set local role authenticated;
set local request.jwt.claims = '{"sub": "98111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.delete_moment('e8333333-eeee-eeee-eeee-eeeeeeeeeeee');
reset role;
set local role service_role;
select throws_ok($$select * from public.family_comments((select member_id from sanne), 'e8333333-eeee-eeee-eeee-eeeeeeeeeeee', null, null, 10)$$, '42501', null, 'no reacties on a deleted moment');
select public.request_deletion('98111111-1111-1111-1111-111111111111', 'trail', false);
select throws_ok($$select * from public.family_comment((select member_id from sanne), 'e8111111-eeee-eeee-eeee-eeeeeeeeeeee', 'hoi', gen_random_uuid())$$, '42501', null, 'nor on a trail being deleted');
reset role;

select * from finish();
rollback;
