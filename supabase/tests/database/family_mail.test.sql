-- Tests for step 7 at launch: confirming the family address, the Sunday mail, unsubscribing.
-- Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

create function pg_temp.h(text) returns text language sql as $$ select encode(extensions.digest($1, 'sha256'), 'hex') $$;
grant execute on function pg_temp.h(text) to service_role;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '41111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'mail-sam@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "41111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Noor', '2026-04-02', '2026-04-10');
create temp table ria on commit drop as select * from public.invite_family('Oma Ria', 'oma');
create temp table henk on commit drop as select * from public.invite_family('Opa Henk', 'opa');
reset role;
grant select on ria, henk to service_role;
create temp table noor on commit drop as select trail_id from public.trail_parents where user_id = '41111111-1111-1111-1111-111111111111';
grant select on noor to service_role;

set local role service_role;
select is(public.family_join((select member_id from ria), 'Oma Ria', 'Ria@Voorbeeld.nl', 'weekly'), 'confirm', 'a new address needs confirming');
select is(public.family_email_key((select member_id from ria), pg_temp.h('confirm-1')), 'ok', 'a confirmation code is made');
select is(public.family_confirm_email(pg_temp.h('wrong')), 'invalid', 'a wrong code confirms nothing');
select is(public.family_confirm_email(pg_temp.h('confirm-1')), 'ok', 'the right code confirms');
select is(public.family_confirm_email(pg_temp.h('confirm-1')), 'invalid', 'once');
reset role;
select ok((select email_confirmed_at is not null from public.circle_members where id = (select member_id from ria)), 'the address is confirmed');

-- A code for an old address doesn't confirm a new one.
set local role service_role;
select from public.family_join((select member_id from henk), 'Opa Henk', 'henk@voorbeeld.nl', 'weekly');
select from public.family_email_key((select member_id from henk), pg_temp.h('henk-old'));
select is(public.family_join((select member_id from henk), 'Opa Henk', 'h.nieuw@voorbeeld.nl', 'weekly'), 'confirm', 'changing the address asks again');
select is(public.family_confirm_email(pg_temp.h('henk-old')), 'invalid', 'and the old link no longer confirms');
select from public.family_email_key((select member_id from henk), pg_temp.h('henk-2'));
select from public.family_email_key((select member_id from henk), pg_temp.h('henk-3'));
select is(public.family_email_key((select member_id from henk), pg_temp.h('henk-4')), 'limited', 'at most three confirmation mails a day per person');
select is(public.family_join((select member_id from henk), 'Opa Henk', 'x@voorbeeld.nl', 'each'), 'confirm', '"Bij elk moment"');
reset role;
select is((select email_frequency from public.circle_members where id = (select member_id from henk)), 'weekly', 'becomes the weekly mail at launch');

-- Moments of the week: one ready since last Sunday 20:00, one older, one not ready.
-- Sunday 2026-11-08 20:30 Amsterdam is 19:30 UTC.
create temp table t on commit drop as select '2026-11-08 19:30:00+00'::timestamptz as sunday;
grant select on t to service_role;
insert into public.moments (trail_id, created_by, client_id, trail_week, caption, photo_count, status, ready_at)
values ((select trail_id from noor), '41111111-1111-1111-1111-111111111111', gen_random_uuid(), 31, '<b>Geklapt</b>', 1, 'ready', (select sunday from t) - interval '2 days'),
       ((select trail_id from noor), '41111111-1111-1111-1111-111111111111', gen_random_uuid(), 30, 'Vorige week', 1, 'ready', (select sunday from t) - interval '9 days'),
       ((select trail_id from noor), '41111111-1111-1111-1111-111111111111', gen_random_uuid(), 31, 'Nog bezig', 1, 'uploading', null);

set local role service_role;
select is((select count(*) from public.family_sunday_mail((select sunday from t) - interval '1 day')), 0::bigint, 'no Sunday mail on Saturday');
select is((select count(*) from public.family_sunday_mail((select sunday from t) - interval '1 hour')), 0::bigint, 'or before 20:00');
create temp table run on commit drop as select * from public.family_sunday_mail((select sunday from t));
reset role;
select is((select count(*) from run), 1::bigint, 'one mail: only the confirmed address');
select is((select moment_count from run), 1, 'with only this week''s ready moment');
select is((select moments->0->>'caption' from run), '<b>Geklapt</b>', 'the caption as given (the mail escapes it)');
select is((select child || ' ' || label from run), 'Noor Oma Ria', 'with the child''s and the person''s first names');

set local role service_role;
select is((select count(*) from public.family_sunday_mail((select sunday from t) + interval '1 hour')), 1::bigint, 'an unsent mail comes back in the next run');
select from public.family_mail_sent((select send_id from run));
select is((select count(*) from public.family_sunday_mail((select sunday from t) + interval '2 hours')), 0::bigint, 'once sent, never twice');
reset role;

-- The link in the mail opens the page for 7 days, and a new family link stops it.
set local role service_role;
select from public.family_mail_key((select member_id from ria), pg_temp.h('mail-link'));
select is((select status from public.family_claim(pg_temp.h('mail-link'), pg_temp.h('s-mail'), null, '1.2.3.4', null)), 'ok', 'the link in the mail opens the page');
reset role;
update private.access_keys set expires_at = now() - interval '1 minute' where token_hash = pg_temp.h('mail-link');
set local role service_role;
select is((select status from public.family_claim(pg_temp.h('mail-link'), pg_temp.h('s-mail-2'), null, '1.2.3.4', null)), 'unknown', 'but not after 7 days');
reset role;

-- Unsubscribing wipes the address and stops the mail; the page stays open.
set local role service_role;
select from public.family_unsubscribe((select member_id from ria));
reset role;
select is((select coalesce(email, 'weg') || ' ' || email_frequency from public.circle_members where id = (select member_id from ria)), 'weg never', 'unsubscribing wipes the address');
select is((select count(*) from public.family_member(pg_temp.h('s-mail'))), 1::bigint, 'and the family page stays open');

-- Unconfirmed addresses go after 7 days.
update public.circle_members set email_requested_at = now() - interval '8 days' where id = (select member_id from henk);
select from private.family_mail_cleanup();
select is((select email from public.circle_members where id = (select member_id from henk)), null, 'an address not confirmed in 7 days is wiped');

set local role authenticated;
select throws_ok($$select * from public.family_sunday_mail()$$, '42501', null, 'parents cannot call the mail functions');
reset role;

select * from finish();
rollback;
