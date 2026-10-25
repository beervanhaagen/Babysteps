-- Tests for M3: inviting the other parent. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at)
values
  ('00000000-0000-0000-0000-000000000000', '96666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'sam@voorbeeld.nl', now()),
  ('00000000-0000-0000-0000-000000000000', '97777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated', 'alex@voorbeeld.nl', now()),
  ('00000000-0000-0000-0000-000000000000', '98888888-8888-8888-8888-888888888888', 'authenticated', 'authenticated', 'vreemde@voorbeeld.nl', now()),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated', 'kim@voorbeeld.nl', null);
update public.profiles set first_name = 'Sam' where id = '96666666-6666-6666-6666-666666666666';
update public.profiles set first_name = 'Alex' where id = '97777777-7777-7777-7777-777777777777';

set local role authenticated;
set local request.jwt.claims = '{"sub": "96666666-6666-6666-6666-666666666666", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
select throws_ok($$select public.invite_parent('sam@voorbeeld.nl')$$, '22023', null, 'not yourself');
select throws_ok($$select public.invite_parent('geen-adres')$$, '22023', null, 'not a broken address');
create temp table first_invite on commit drop as select id, sent_to, mail from public.invite_parent('  Alex@Voorbeeld.nl ');
select is((select sent_to || ' ' || mail from first_invite), 'alex@voorbeeld.nl true', 'the mail goes to the stored address');
select is((select email from public.parent_invites where id = (select id from first_invite)), 'alex@voorbeeld.nl', 'the address is kept clean');

-- Someone else sees nothing; the invited address does, once signed in.
set local request.jwt.claims = '{"sub": "98888888-8888-8888-8888-888888888888", "role": "authenticated"}';
select is((select count(*) from public.my_parent_invite()), 0::bigint, 'another address sees no invite');
select is((select count(*) from public.parent_invites), 0::bigint, 'nor the invites of another trail');
select throws_ok(format('select public.accept_parent_invite(%L)', (select id from first_invite)), 'P0002', null, 'and cannot accept it');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select is((select count(*) from public.my_parent_invite()), 0::bigint, 'an unconfirmed address sees nothing either');
set local request.jwt.claims = '{"sub": "97777777-7777-7777-7777-777777777777", "role": "authenticated"}';
select is((select child || ' ' || inviter from public.my_parent_invite()), 'Lotte Sam', 'Alex sees the invite after signing in');
select lives_ok(format('select public.accept_parent_invite(%L)', (select id from first_invite)), 'and joins');
select is(public.accept_parent_invite((select id from first_invite)), (select trail_id from public.trail_parents where user_id = '96666666-6666-6666-6666-666666666666'), 'tapping again just gives the trail');
select is((select count(*) from public.parent_invites), 1::bigint, 'the new parent can read the invites of the trail');
select is((select count(*) from public.trail_parents_list()), 2::bigint, 'two parents on the trail');
select is((select first_name from public.trail_parents_list() where is_me), 'Alex', 'Alex sees who is who');

-- Two parents: no third.
set local request.jwt.claims = '{"sub": "96666666-6666-6666-6666-666666666666", "role": "authenticated"}';
select throws_ok($$select public.invite_parent('derde@voorbeeld.nl')$$, '23514', null, 'never a third parent');
reset role;
grant select on first_invite to service_role;
set local role service_role;
select is((select joiner_email || ' ' || inviter_email from public.parent_invite_joined((select id from first_invite))), 'alex@voorbeeld.nl sam@voorbeeld.nl', 'the inviter gets told who joined');
reset role;
set local role authenticated;
select throws_ok(format('select * from public.parent_invite_joined(%L)', (select id from first_invite)), '42501', null, 'only the mail function asks that');
reset role;

-- Passwords never stick (sign-in is by code, Apple or Google).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password)
values ('00000000-0000-0000-0000-000000000000', '9aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'wachtwoord@voorbeeld.nl', 'een-hash');
select is((select encrypted_password from auth.users where id = '9aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), '', 'no password is ever stored');

-- A second trail (Noor, Kim's) for the refusals.
update auth.users set email_confirmed_at = now() where id = '99999999-9999-9999-9999-999999999999';
set local role authenticated;
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select public.create_trail('Noor', '2026-04-02', '2026-04-02');
create temp table to_cancel on commit drop as select id from public.invite_parent('vreemde@voorbeeld.nl');
select public.cancel_parent_invite((select id from to_cancel));
set local request.jwt.claims = '{"sub": "98888888-8888-8888-8888-888888888888", "role": "authenticated"}';
select throws_ok(format('select public.accept_parent_invite(%L)', (select id from to_cancel)), 'P0002', null, 'a withdrawn invite cannot be accepted');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
create temp table to_expire on commit drop as select id, mail from public.invite_parent('vreemde@voorbeeld.nl');
select is((select mail from to_expire), false, 'the same address gets no second mail within 7 days');
reset role;
grant select on to_cancel, to_expire to authenticated;
update public.parent_invites set expires_at = now() - interval '1 minute' where id = (select id from to_expire);
set local role authenticated;
set local request.jwt.claims = '{"sub": "98888888-8888-8888-8888-888888888888", "role": "authenticated"}';
select throws_ok(format('select public.accept_parent_invite(%L)', (select id from to_expire)), 'P0002', null, 'nor an expired one');
select is((select count(*) from public.parent_invites), 0::bigint, 'someone outside the trail reads no invites');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select from public.invite_parent('derde@voorbeeld.nl');
select throws_ok($$select public.invite_parent('vierde@voorbeeld.nl')$$, '54000', null, 'the fourth invite in a day is refused');
reset role;
update public.parent_invites set sent_at = now() - interval '2 days' where trail_id = (select trail_id from public.trail_parents where user_id = '99999999-9999-9999-9999-999999999999');
set local role authenticated;
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
create temp table to_parent on commit drop as select id from public.invite_parent('sam@voorbeeld.nl');
-- Sam already has a trail: the invite isn't shown and can't be accepted (siblings come later).
set local request.jwt.claims = '{"sub": "96666666-6666-6666-6666-666666666666", "role": "authenticated"}';
select is((select count(*) from public.my_parent_invite()), 0::bigint, 'someone with a trail sees no invite');
select throws_ok(format('select public.accept_parent_invite(%L)', (select id from to_parent)), '23514', null, 'and cannot join a second trail');

-- Lars made an own, still empty trail before the invite came: he may swap it.
reset role;
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at)
values ('00000000-0000-0000-0000-000000000000', '9bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'lars@voorbeeld.nl', now());
set local role authenticated;
set local request.jwt.claims = '{"sub": "9bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select public.create_trail('Leeg', '2026-04-02', '2026-04-02');
reset role;
update public.parent_invites set sent_at = now() - interval '2 days' where trail_id = (select trail_id from public.trail_parents where user_id = '99999999-9999-9999-9999-999999999999');
set local role authenticated;
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
create temp table to_lars on commit drop as select id from public.invite_parent('lars@voorbeeld.nl');
set local request.jwt.claims = '{"sub": "9bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select child from public.my_parent_invite()), 'Noor', 'an empty own trail doesn''t hide the invite');
select lives_ok(format('select public.accept_parent_invite(%L)', (select id from to_lars)), 'he joins');
select is((select count(*) from public.children where first_name = 'Leeg'), 0::bigint, 'and the empty trail is gone');
-- Kim can take Lars off again (a typo), within 7 days; Lars can't do that to Kim.
select throws_ok(format('select public.remove_joined_parent(%L)', (select id from to_lars)), '42501', null, 'only the inviter can undo it');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select public.remove_joined_parent((select id from to_lars));
reset role;
select is((select count(*) from public.trail_parents where user_id = '9bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'the inviter took the wrong parent off');
set local role authenticated;
-- A trail being deleted invites nobody.
reset role;
update public.trails set delete_requested_at = now() where id = (select trail_id from public.trail_parents where user_id = '99999999-9999-9999-9999-999999999999');
set local role authenticated;
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select throws_ok($$select public.invite_parent('later@voorbeeld.nl')$$, '42501', null, 'not while the trail is being deleted');
reset role;

select * from finish();
rollback;
