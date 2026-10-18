-- Privacy tests for the pre-registration on teddysteps.nl. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Nobody but the edge function (service role) gets in.
set local role anon;
select throws_ok($$select public.waitlist_signup('a@voorbeeld.nl', false, null, 'x', 'h')$$, '42501', null, 'visitors cannot call the sign-up directly');
select throws_ok($$select * from private.waitlist$$, '42501', null, 'or read the list');
reset role;
set local role authenticated;
select throws_ok($$select public.waitlist_confirm('h')$$, '42501', null, 'parents in the app cannot confirm for someone');
reset role;

set local role service_role;
select is(public.waitlist_signup('  Ria@Voorbeeld.nl ', false, '2026-05-01', 'ip-1', 'code-1'), 'mail', 'a new address gets a confirmation mail');
reset role;
select is((select email from private.waitlist where confirm_hash = 'code-1'), 'ria@voorbeeld.nl', 'stored lower-cased and trimmed');
select is((select baby_month from private.waitlist where confirm_hash = 'code-1'), null, 'no baby month for someone who only wants news');
select is((select count(*) from private.signup_attempts where ip_hash = 'ip-1'), 1::bigint, 'the attempt is counted by IP hash');

set local role service_role;
select is(public.waitlist_signup('ria@voorbeeld.nl', true, '2026-05-17', 'ip-2', 'code-2'), 'quiet', 'signing up again within a day sends no second mail');
reset role;
select ok((select wants_test from private.waitlist where email = 'ria@voorbeeld.nl'), 'but wanting to test is remembered');
select is((select baby_month from private.waitlist where email = 'ria@voorbeeld.nl'), '2026-05-01'::date, 'with the month only');
select is((select confirm_hash from private.waitlist where email = 'ria@voorbeeld.nl'), 'code-1', 'and the first link keeps working');

set local role service_role;
select is(public.waitlist_signup('ria@voorbeeld.nl', false, null, 'ip-3', 'code-3'), 'quiet', 'news-only later');
reset role;
select ok((select wants_test from private.waitlist where email = 'ria@voorbeeld.nl'), 'does not undo wanting to test');

set local role service_role;
select is(public.waitlist_signup('kim@voorbeeld.nl', true, '2020-01-01', 'ip-4', 'code-4'), 'mail', 'a month far in the past');
reset role;
select is((select baby_month from private.waitlist where email = 'kim@voorbeeld.nl'), null, 'is dropped, not stored');

set local role service_role;
select is(public.waitlist_signup('geen-adres', false, null, 'ip-5', 'code-5'), 'invalid', 'a broken address is refused');
select is(public.waitlist_confirm('wrong'), 'invalid', 'a wrong code confirms nothing');
select is(public.waitlist_confirm('code-1'), 'ok', 'the right code confirms');
select is(public.waitlist_confirm('code-1'), 'invalid', 'and works only once');
select is(public.waitlist_signup('ria@voorbeeld.nl', false, '2025-01-01', 'ip-6', 'code-6'), 'quiet', 'signing up a confirmed address again sends nothing');
reset role;
select is((select baby_month from private.waitlist where email = 'ria@voorbeeld.nl'), '2026-05-01'::date, 'and changes nothing someone else confirmed');
set local role service_role;
select is(public.waitlist_forget('code-1'), 'ok', 'the link from the mail still wipes the address after confirming');
reset role;
update private.waitlist set confirm_expires_at = now() - interval '1 minute' where confirm_hash = 'code-4';
set local role service_role;
select is(public.waitlist_confirm('code-4'), 'invalid', 'an expired link confirms nothing');
select is(public.waitlist_forget('code-4'), 'ok', 'but can still wipe the address');
reset role;

-- A day later the confirmation mail may go again, with a new link; at most three in all.
set local role service_role;
select is(public.waitlist_signup('noa@voorbeeld.nl', false, null, 'ip-7', 'noa-1'), 'mail', 'a new sign-up');
reset role;
update private.waitlist set last_mail_at = now() - interval '25 hours' where email = 'noa@voorbeeld.nl';
set local role service_role;
select is(public.waitlist_signup('noa@voorbeeld.nl', false, null, 'ip-7', 'noa-2'), 'mail', 'a day later the mail goes again');
reset role;
select is((select confirm_hash || ' ' || mails_sent from private.waitlist where email = 'noa@voorbeeld.nl'), 'noa-2 2', 'with a new link');

-- The mail could not be sent: trying again works at once, and a first sign-up is not kept.
set local role service_role;
select public.waitlist_mail_failed('noa-2');
select is(public.waitlist_signup('noa@voorbeeld.nl', false, null, 'ip-7', 'noa-3'), 'mail', 'after a failed mail, trying again sends one');
select is(public.waitlist_signup('max@voorbeeld.nl', false, null, 'ip-8', 'max-1'), 'mail', 'another first sign-up');
select public.waitlist_mail_failed('max-1');
reset role;
select is((select count(*) from private.waitlist where email = 'max@voorbeeld.nl'), 0::bigint, 'whose mail failed is not kept');

-- At most 150 confirmation mails a day, to protect post.teddysteps.nl.
insert into private.waitlist (email, last_mail_at, mails_sent) select 'bulk' || n || '@voorbeeld.nl', now(), 1 from generate_series(1, 150) n;
set local role service_role;
select is(public.waitlist_signup('lisa@voorbeeld.nl', false, null, 'ip-10', 'lisa-1'), 'limited', 'the 151st mail of the day is not sent');
reset role;
delete from private.waitlist where email like 'bulk%';

-- Five tries per IP per 10 minutes.
insert into private.signup_attempts (ip_hash) select 'ip-9' from generate_series(1, 5);
set local role service_role;
select is(public.waitlist_signup('sam@voorbeeld.nl', false, null, 'ip-9', 'code-9'), 'limited', 'the sixth try from one IP is stopped');
reset role;

select * from finish();
rollback;
