-- Tests for T8: editing, moving, deleting, restoring and purging a moment. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '51111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'opt-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '52222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'opt-kim@voorbeeld.nl');

-- Sam's trail: born ten weeks ago, so this is trail week 11.
set local role authenticated;
set local request.jwt.claims = '{"sub": "51111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', ((now() at time zone 'Europe/Amsterdam')::date - 70)::date, ((now() at time zone 'Europe/Amsterdam')::date - 70)::date);
create temp table invite on commit drop as select * from public.invite_family('Oma Ria', 'oma');
reset role;
grant select on invite to service_role;
create temp table lotte on commit drop as select trail_id from public.trail_parents where user_id = '51111111-1111-1111-1111-111111111111';
grant select on lotte to authenticated, service_role;
insert into public.moments (id, trail_id, created_by, client_id, trail_week, caption, photo_count, status, ready_at)
values ('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), '51111111-1111-1111-1111-111111111111', gen_random_uuid(), 9, 'Geklapt', 1, 'ready', now());
insert into public.moment_photos (moment_id, trail_id, position, width, height, print_long_edge, print_path, view_path, small_path)
values ('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select trail_id from lotte), 0, 1200, 900, 3600,
  (select trail_id from lotte) || '/61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa/0-print.jpg',
  (select trail_id from lotte) || '/61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa/0-view.webp',
  (select trail_id from lotte) || '/61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa/0-small.jpg');

set local role authenticated;
set local request.jwt.claims = '{"sub": "51111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$update public.moments set caption = 'stiekem' where id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '42501', null, 'no direct updates any more');
select lives_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '  Zelf rechtop gezeten  ', 10, true, 'Zelf zitten', false)$$, 'the parent edits caption, week, first and the book');
select is((select caption || ' / ' || trail_week || ' / ' || first_label || ' / ' || in_book from public.moments where id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Zelf rechtop gezeten / 10 / Zelf zitten / false', 'trimmed and saved');
select lives_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '', 11, false, 'blijft niet', true)$$, 'this week is allowed, an empty caption too');
select is((select coalesce(caption, 'leeg') || ' / ' || coalesce(first_label, 'geen') from public.moments where id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'leeg / geen', 'no caption, and not a first means no label');
select throws_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 12, false, null, true)$$, '22023', null, 'never a week in the future');
select throws_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 0, false, null, true)$$, '22023', null, 'or week 0');
select throws_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 5, true, '  ', true)$$, '22023', null, 'a first needs a label');
select throws_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('x', 501), 5, false, null, true)$$, '22023', null, 'a caption has at most 500 characters');
-- After the birth date moved, a moment can sit in a week that's now ahead; it stays editable.
reset role;
update public.moments set trail_week = 20 where id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
set local request.jwt.claims = '{"sub": "51111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nieuwe tekst', 20, false, null, true)$$, 'an unchanged week is never checked');

set local request.jwt.claims = '{"sub": "52222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select throws_ok($$select public.update_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 5, false, null, true)$$, '42501', null, 'another parent cannot edit');
select throws_ok($$select public.delete_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'or delete');

-- Deleting: gone for the parent and for family at once.
set local request.jwt.claims = '{"sub": "51111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.delete_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, 'the parent deletes');
select is((select count(*) from public.moments where id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'and it is gone from the trail');
select is((select count(*) from public.deleted_moments()), 1::bigint, 'but listed under "Onlangs verwijderd"');
reset role;
set local role service_role;
select is((select count(*) from public.family_page((select member_id from invite), 0, 25)), 0::bigint, 'family no longer sees it');
reset role;
select ok(not private.may_upload('view', (select trail_id from lotte) || '/61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa/0-view.webp'), 'and nothing can be uploaded to it');

-- Restoring within 30 days.
set local role authenticated;
set local request.jwt.claims = '{"sub": "51111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.restore_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '"Terugzetten" brings it back');
select is((select count(*) from public.moments where id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'on the trail again');
select public.delete_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
reset role;
update public.moments set deleted_at = now() - interval '31 days' where id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
set local request.jwt.claims = '{"sub": "51111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select public.restore_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, 'P0002', null, 'after 30 days it cannot come back');
select throws_ok($$select * from public.purge_candidates()$$, '42501', null, 'parents cannot run the purge');
reset role;

-- The purge: files first (the function), then the row.
set local role service_role;
select is((select cardinality(view_paths) || ' ' || cardinality(print_paths) from public.purge_candidates() where moment = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), '2 1', 'the purge finds the view, small and print files');
select lives_ok($$select public.purge_moment('61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, 'and removes the moment');
reset role;
select is((select count(*) from public.moment_photos where moment_id = '61111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'with its photo rows');
select is((select count(*) from cron.job where jobname = 'purge'), 1::bigint, 'the nightly purge is scheduled');

select * from finish();
rollback;
