begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select is(
  (select starts_at from public.group_period_bounds(
    'weekly', 'UTC', '2026-08-27 15:30:00+00', '2026-08-28 10:00:00+00'
  )),
  '2026-08-27 15:30:00+00'::timestamptz,
  'the first weekly round starts at group creation'
);

select is(
  (select ends_at from public.group_period_bounds(
    'weekly', 'UTC', '2026-08-27 15:30:00+00', '2026-08-28 10:00:00+00'
  )),
  '2026-09-03 15:30:00+00'::timestamptz,
  'the first weekly round lasts a full seven days'
);

select is(
  (select starts_at from public.group_period_bounds(
    'weekly', 'UTC', '2026-08-27 15:30:00+00', '2026-09-04 10:00:00+00'
  )),
  '2026-09-03 15:30:00+00'::timestamptz,
  'later weekly rounds stay anchored to creation'
);

select is(
  (select ends_at from public.group_period_bounds(
    'weekly', 'America/New_York', '2026-10-31 13:00:00+00', '2026-11-02 14:00:00+00'
  )),
  '2026-11-07 14:00:00+00'::timestamptz,
  'weekly reset keeps its local time across daylight saving changes'
);

select is(
  (select starts_at from public.group_period_bounds(
    'daily', 'UTC', '2026-08-27 15:30:00+00', '2026-08-28 10:00:00+00'
  )),
  '2026-08-28 00:00:00+00'::timestamptz,
  'daily groups remain calendar-based'
);

select is(
  (select ends_at from public.group_period_bounds(
    'monthly', 'UTC', '2026-08-27 15:30:00+00', '2026-08-28 10:00:00+00'
  )),
  '2026-09-01 00:00:00+00'::timestamptz,
  'monthly groups remain calendar-based'
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '30000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'group-period-test@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{"display_name":"Period Test"}', now(), now()
);

insert into public.group_leaderboards(
  id, owner_id, name, period_type, timezone, invite_code, created_at
) values (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Anchored Week', 'weekly', 'UTC', 'ANCHORPERIODTEST00001',
  date_trunc('second', now() - interval '1 day')
);

insert into public.group_leaderboard_members(
  leaderboard_id, user_id, role, joined_at
) select
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'creator', created_at
from public.group_leaderboards
where id = '40000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select period_ends_at from public.list_my_group_leaderboards()
    where id = '40000000-0000-0000-0000-000000000001'),
  (select created_at + interval '7 days' from public.list_my_group_leaderboards()
    where id = '40000000-0000-0000-0000-000000000001'),
  'authenticated group details expose the creation-anchored reset time'
);

reset role;

select * from finish();
rollback;
