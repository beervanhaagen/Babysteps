-- Tests for M7 "Pad en account verwijderen": 30 days to undo, read-only while pending, the purge.
-- Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at)
values
  ('00000000-0000-0000-0000-000000000000', 'd1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'weg-sam@voorbeeld.nl', now()),
  ('00000000-0000-0000-0000-000000000000', 'd2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'weg-alex@voorbeeld.nl', now());
update public.profiles set first_name = 'Sam' where id = 'd1111111-1111-1111-1111-111111111111';
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
select public.register_push_token('ios', 'weg-sam-telefoon-0000000001', false);
reset role;
create temp table lotte on commit drop as select trail_id from public.trail_parents where user_id = 'd1111111-1111-1111-1111-111111111111';
grant select on lotte, ria to authenticated, service_role;
insert into public.moments (trail_id, created_by, client_id, trail_week, photo_count, status, ready_at)
values ((select trail_id from lotte), 'd1111111-1111-1111-1111-111111111111', gen_random_uuid(), 3, 1, 'ready', now());

-- Sam alone: "Alleen mijn account" still takes the trail along. Only the function `leave` asks.
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select * from public.request_deletion('d1111111-1111-1111-1111-111111111111', 'account')$$, '42501', null, 'the app cannot skip the mails');
reset role;
set local role service_role;
select ok((select account_until > now() + interval '29 days' from public.request_deletion('d1111111-1111-1111-1111-111111111111', 'account')), 'thirty days to change your mind');
reset role;
select ok((select delete_requested_at is not null from public.trails where id = (select trail_id from lotte)), 'a parent on their own deletes the trail too');
select is((select count(*) from private.push_tokens where user_id = 'd1111111-1111-1111-1111-111111111111'), 0::bigint, 'and this phone gets no more pushes');
set local role service_role;
select is((select count(*) from public.family_page((select member_id from ria), 0, 25)), 0::bigint, 'family sees nothing at once');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select from public.create_moment((select trail_id from lotte), gen_random_uuid(), 3::smallint, null, '', false, '', '[{"taken_at": null, "width": 10, "height": 10, "print_long_edge": 3600}]'::jsonb)$$, '42501', null, 'nothing new while pending');
select throws_ok($$update public.children set first_name = 'Lot' where trail_id = (select trail_id from lotte)$$, '42501', null, 'nothing changes either');
select is((select child || ' ' || by_me from public.my_deletion()), 'Lotte true', 'the app knows what is pending');
select lives_ok($$select public.restore_deletion()$$, '"Toch bewaren"');
reset role;
select ok((select delete_requested_at is null from public.trails where id = (select trail_id from lotte)), 'and the trail is back');
set local role service_role;
select is((select count(*) from public.family_page((select member_id from ria), 0, 25)), 1::bigint, 'with the family links working again');
reset role;

-- Two parents: "alleen mijn account" leaves the trail with the other; "pad en account" doesn't.
insert into public.trail_parents (trail_id, user_id) values ((select trail_id from lotte), 'd2222222-2222-2222-2222-222222222222');
set local role service_role;
select from public.request_deletion('d2222222-2222-2222-2222-222222222222', 'account');
reset role;
select ok((select delete_requested_at is null from public.trails where id = (select trail_id from lotte)), 'one parent leaving keeps the trail');
update public.profiles set delete_requested_at = null, purge_after = null where id = 'd2222222-2222-2222-2222-222222222222';
-- And "nu meteen" on a shared trail: the account goes at once, the trail keeps its 30 days.
set local role service_role;
select ok((select trail_until > now() + interval '29 days' from public.request_deletion('d2222222-2222-2222-2222-222222222222', 'trail', true)), 'a shared trail keeps its 30 days, also with nu meteen');
reset role;
-- Deleting Alex's account (set null on a pending trail) is not blocked by the read-only rule.
update public.moments set created_by = 'd2222222-2222-2222-2222-222222222222' where trail_id = (select trail_id from lotte);
select lives_ok($$update public.moments set created_by = null where trail_id = (select trail_id from lotte)$$, 'an account going does not trip the read-only rule');
-- Unsubscribing still works on a pending trail.
select lives_ok($$update public.circle_members set email = null, email_frequency = 'never' where id = (select member_id from ria)$$, 'family can still unsubscribe');
update public.profiles set purge_after = now() + interval '30 days' where id = 'd2222222-2222-2222-2222-222222222222';
set local role service_role;
select is((select email from public.deletion_other_parent('d2222222-2222-2222-2222-222222222222')), 'weg-sam@voorbeeld.nl', 'the other parent gets a mail');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is((select by_me from public.my_deletion()), false, 'the other parent sees who asked');
select public.restore_deletion();
reset role;
select ok((select delete_requested_at is null from public.trails where id = (select trail_id from lotte)), 'and may bring it back');

-- Both parents "alleen mijn account": the last one takes the trail along (never orphaned).
update public.profiles set delete_requested_at = null, purge_after = null where id in ('d1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222');
set local role service_role;
select is((select trail_until from public.request_deletion('d1111111-1111-1111-1111-111111111111', 'account')), null, 'the first one leaving keeps the trail');
select ok((select trail_until is not null from public.request_deletion('d2222222-2222-2222-2222-222222222222', 'account')), 'the last one leaving takes it along');
reset role;

-- The purge: past the date, no way back; files first, then the rows, then the accounts.
update public.trails set purge_after = now() - interval '1 minute' where id = (select trail_id from lotte);
update public.profiles set purge_after = now() - interval '1 minute' where id in ('d1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222');
set local role service_role;
select is((select count(*) from public.trails_to_purge() t where t = (select trail_id from lotte)), 1::bigint, 'the purge picks the trail');
select is((select count(*) from public.accounts_to_purge()), 2::bigint, 'two leaving parents don''t hold each other up (the trail is already being purged)');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select public.restore_deletion()$$, 'P0002', null, 'past the date "Toch bewaren" says so');
reset role;
select ok((select deleted_at is not null from public.trails where id = (select trail_id from lotte)), 'once the purge started, there is no way back');
set local role service_role;
select ok(public.purge_trail((select trail_id from lotte)), 'the rows go once no file is left');
reset role;
select is((select count(*) from public.circle_members where trail_id = (select trail_id from lotte)), 0::bigint, 'with the circle and its links');
set local role authenticated;
select throws_ok($$select * from public.accounts_to_purge()$$, '42501', null, 'parents cannot run the purge');
reset role;

select * from finish();
rollback;
