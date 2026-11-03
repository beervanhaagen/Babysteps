-- Tests for the child's own animal and colour (M1). Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '93111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'dier-sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '93222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'dier-kim@voorbeeld.nl');
set local role authenticated;
set local request.jwt.claims = '{"sub": "93111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-02', '2026-03-02');
reset role;
create temp table lotte on commit drop as select trail_id from public.trail_parents where user_id = '93111111-1111-1111-1111-111111111111';
grant select on lotte to authenticated;

select is((select avatar_animal || '/' || avatar_tone from public.children where trail_id = (select trail_id from lotte)), 'bo/lilac', 'every child starts as Bo on lilac');

set local role authenticated;
set local request.jwt.claims = '{"sub": "93111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$update public.children set avatar_animal = 'puddle', avatar_tone = 'sunshine' where trail_id = (select trail_id from lotte)$$, 'the parent picks an animal and a colour');
select throws_ok($$update public.children set avatar_animal = 'unicorn' where trail_id = (select trail_id from lotte)$$, '23514', null, 'only the gang');
select throws_ok($$update public.children set avatar_tone = '#ff0000' where trail_id = (select trail_id from lotte)$$, '23514', null, 'only the soft blocks');
-- Another parent changes nothing.
set local request.jwt.claims = '{"sub": "93222222-2222-2222-2222-222222222222", "role": "authenticated"}';
update public.children set avatar_animal = 'tiggy' where trail_id = (select trail_id from lotte);
reset role;
select is((select avatar_animal from public.children where trail_id = (select trail_id from lotte)), 'puddle', 'another parent cannot change it');

select * from finish();
rollback;
