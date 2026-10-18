-- Privacy tests for step 3: moments, photos and storage. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'sam@voorbeeld.nl'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'kim@voorbeeld.nl');

-- Kim has her own trail.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.create_trail('Noa', '2026-05-01', '2026-05-01');

-- Sam pins a moment with two photos.
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.create_trail('Lotte', '2026-03-12', '2026-03-19');

create temp table pinned on commit drop as
select * from public.create_moment(
  (select id from public.trails), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 31::smallint, '2026-10-14', 'Geklapt. Nergens om.', true, 'Klappen',
  '[{"taken_at": "2026-10-14", "width": 1280, "height": 960, "print_long_edge": 3600},
    {"taken_at": null, "width": 960, "height": 1280, "print_long_edge": 6000}]'::jsonb
);
-- The test reads it again as service_role, which stands in for the edge function.
grant select on pinned to service_role;

select is((select count(*) from pinned), 2::bigint, 'a moment with two photos gets two sets of paths');
select ok(
  (select bool_and(view_path like (select id::text from public.trails) || '/%') from pinned),
  'every path starts in the own trail folder'
);
select is((select status from public.moments), 'uploading', 'a new moment waits for its uploads');

select is(
  (select count(*) from public.create_moment(
    (select id from public.trails), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 31::smallint, null, 'nog een keer', false, null,
    '[{"width": 10, "height": 10, "print_long_edge": 10}]'::jsonb)),
  2::bigint,
  'the same client_id again returns the first moment, not a new one'
);
select is((select count(*) from public.moments), 1::bigint, 'still one moment');
select throws_ok(
  $$select public.create_moment('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 1::smallint, null, null, false, null,
    '[{"width": 10, "height": 10, "print_long_edge": 10}]'::jsonb)$$,
  '42501', null,
  'a moment for a trail that is not yours (someone else signed in on the phone) is refused'
);
select throws_ok(
  $$select public.finish_upload('11111111-1111-1111-1111-111111111111', (select moment_id from pinned limit 1), 'view')$$,
  '42501', null,
  'the phone cannot mark its own upload as checked; only the edge function can'
);

set local role service_role;
select is(public.finish_upload('11111111-1111-1111-1111-111111111111', (select moment_id from pinned limit 1), 'view'), 'missing', 'not ready while files are missing');
set local role authenticated;

-- Uploads: only at the handed-out paths.
select lives_ok(
  $$insert into storage.objects (bucket_id, name) select 'view', view_path from pinned
    union all select 'view', small_path from pinned$$,
  'a parent uploads the view and small versions to their paths'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('view', (select id::text from public.trails) || '/elders/0-view.webp')$$,
  '42501', null,
  'a parent cannot upload to a path the server did not hand out'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('print', (select view_path from pinned limit 1))$$,
  '42501', null,
  'a view path does not work in the print bucket'
);

set local role service_role;
select is(public.finish_upload('11111111-1111-1111-1111-111111111111', (select moment_id from pinned limit 1), 'view'), 'done', 'ready once every view and small version is there');
select throws_ok(
  $$select public.finish_upload('22222222-2222-2222-2222-222222222222', (select moment_id from pinned limit 1), 'view')$$,
  '42501', null,
  'the check is done for the right parent only'
);
set local role authenticated;
select is((select status from public.moments), 'ready', 'the moment is now visible');
select throws_ok(
  $$update public.moments set status = 'uploading'$$, '42501', null,
  'status only changes through functions'
);

-- Kim sees nothing of Lotte's moments or photos.
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*) from public.moments), 0::bigint, 'another parent cannot see the moment');
select is((select count(*) from storage.objects where bucket_id in ('view', 'print')), 0::bigint, 'another parent cannot see the files');
reset role;

set local role anon;
select is((select count(*) from storage.objects where bucket_id in ('view', 'print')), 0::bigint, 'nobody signed in can see any photo file');
reset role;

select * from finish();
rollback;
