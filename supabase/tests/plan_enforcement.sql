begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

-- Isolated Auth fixtures exercise the real handle_new_user() bootstrap and
-- keep profile foreign keys valid during RPC updates. The transaction rolls
-- everything back.
insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'plan-test-free@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Free User"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'plan-test-pro@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Pro User"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'plan-test-seed@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Seed User"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'plan-test-hidden@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Hidden Free"}', now(), now());

update public.profiles set
  profile_slug = case id
    when '10000000-0000-0000-0000-000000000001' then 'plan-test-free'
    when '10000000-0000-0000-0000-000000000002' then 'plan-test-pro'
    when '10000000-0000-0000-0000-000000000003' then 'plan-test-seed'
    else 'plan-test-hidden'
  end,
  plan = (case when id = '10000000-0000-0000-0000-000000000002' then 'pro' else 'free' end)::public.plan_type,
  is_public = id <> '10000000-0000-0000-0000-000000000001',
  is_seed_account = id = '10000000-0000-0000-0000-000000000003'
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004'
);

insert into public.projects(id, user_id, name, color)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'One', '#4B9EFF'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Two', '#4B9EFF'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Three', '#4B9EFF');

insert into public.sessions(user_id, project_id, type, duration_mins, started_at, ended_at, local_date, notes, is_trusted)
select '10000000-0000-0000-0000-000000000001',
  case when n = 45 then '20000000-0000-0000-0000-000000000002'::uuid else null end,
  'focus', case when n = 45 then 61 else 25 end,
  now() - make_interval(mins => n * 30), now() - make_interval(mins => n * 30 - 25),
  current_date, case when n = 45 then 'literal 100%_needle' else null end, true
from generate_series(1, 50) n;

insert into public.sessions(user_id, type, duration_mins, started_at, ended_at, local_date, notes, is_trusted)
values (
  '10000000-0000-0000-0000-000000000002', 'focus', 25,
  now(), now() + interval '25 minutes', current_date, 'literal 100%_needle', true
);

insert into public.daily_summaries(user_id, date, focus_minutes, session_count)
values
  ('10000000-0000-0000-0000-000000000001', current_date - 10, 25, 1),
  ('10000000-0000-0000-0000-000000000001', current_date, 25, 1);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select (public.update_my_profile('{"plan":"pro"}'::jsonb)).id$$,
  'P0001', 'PROFILE_FIELD_NOT_ALLOWED',
  'profile RPC rejects billing fields'
);
select lives_ok(
  $$select (public.update_my_profile('{"display_name":"Updated Name"}'::jsonb)).id$$,
  'profile RPC accepts display fields'
);
select is(
  (select plan::text from public.profiles where id = auth.uid()),
  'free',
  'profile plan remains unchanged'
);
select throws_ok(
  $$select (public.update_my_profile('{"is_public":true}'::jsonb)).id$$,
  'P0001', 'PLAN_REQUIRED',
  'Free user cannot enable a public profile'
);
select throws_ok(
  $$select (public.create_project('Four', '#4B9EFF', null)).id$$,
  'P0001', 'PROJECT_LIMIT_REACHED',
  'fourth active Free project is rejected'
);
select lives_ok(
  $$select (public.set_project_archived('20000000-0000-0000-0000-000000000001', true)).id$$,
  'archiving is always allowed'
);
select lives_ok(
  $$select (public.create_project('Replacement', '#4B9EFF', null)).id$$,
  'archive frees a project slot'
);
select throws_ok(
  $$select (public.set_project_archived('20000000-0000-0000-0000-000000000001', false)).id$$,
  'P0001', 'PROJECT_LIMIT_REACHED',
  'restore cannot exceed the project cap'
);
select throws_ok(
  $$select (public.start_timer_run('focus', 'pomodoro', 1500, 'UTC', null, null, null, null)).id$$,
  'P0001', 'SESSION_LIMIT_REACHED',
  '51st monthly Free focus session is rejected'
);
select lives_ok(
  $$select (public.start_timer_run('break', 'pomodoro', 300, 'UTC', null, null, null, null)).id$$,
  'break timer remains available at the focus cap'
);
select is(
  (select count(*)::integer from public.get_analytics_daily_summaries(current_date - 30, current_date, 'UTC')),
  1,
  'Free analytics excludes summaries older than seven days'
);
select throws_ok(
  $$select count(*) from public.export_my_sessions(null, null, null, false, 0, 500, 'UTC')$$,
  'P0001', 'PLAN_REQUIRED',
  'Free CSV export is rejected'
);
select is(
  (select count(*)::integer from public.get_sessions_page(
    0, 20, null, '100%_needle', 'UTC', null, null, null, null, null
  )),
  1,
  'literal search finds an owned match beyond the original first page'
);
select is(
  (select max(total_count) from public.get_sessions_page(
    0, 20, null, null, 'UTC', current_date, current_date, null, null, null
  )),
  50::bigint,
  'local-date filtering returns an exact filtered count'
);
select is(
  (select max(total_count) from public.get_sessions_page(
    0, 20, 'focus', null, 'UTC', null, null,
    '20000000-0000-0000-0000-000000000002', 61, null
  )),
  1::bigint,
  'project and duration filters combine before pagination'
);
select throws_ok(
  $$select count(*) from public.get_sessions_page(0, 20, null, null, 'UTC', current_date, current_date - 1, null, null, null)$$,
  'P0001', 'DATE_RANGE_INVALID',
  'invalid date ranges are rejected'
);

reset role;
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'authenticated has no table-level profile update privilege'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'name', 'UPDATE')
    and not has_column_privilege('authenticated', 'public.projects', 'is_archived', 'UPDATE'),
  'project metadata is writable but archive state is protected'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT')
    and not has_table_privilege('anon', 'public.tasks', 'SELECT'),
  'anonymous users cannot read base profile or task tables'
);
select ok(
  has_table_privilege('anon', 'public.public_profiles', 'SELECT'),
  'anonymous public profile reads remain available through the narrow view'
);
select ok(
  not has_table_privilege('authenticated', 'public.daily_summaries', 'INSERT')
    and not has_table_privilege('authenticated', 'public.daily_summaries', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.daily_summaries', 'DELETE'),
  'authenticated users cannot write server-owned daily aggregates'
);
select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE'),
  'trigger helpers are not directly executable by clients'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.save_session(uuid,uuid,uuid,public.session_type,integer,timestamp with time zone,timestamp with time zone,text,text,date)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'authenticated',
      'public.set_session_excluded(uuid,boolean)',
      'EXECUTE'
    ),
  'legacy session mutation RPCs remain unavailable'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_sessions_page(integer,integer,public.session_type,text,text,date,date,uuid,integer,integer)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      'public.get_sessions_page(integer,integer,public.session_type,text,text,date,date,uuid,integer,integer)',
      'EXECUTE'
    ),
  'filtered session pagination is authenticated-only'
);
select is(
  (select array_agg(profile_slug order by profile_slug)
   from public.get_global_leaderboard(null, null, 50)
   where profile_slug like 'plan-test-%'),
  array['plan-test-pro', 'plan-test-seed']::text[],
  'global leaderboard includes paid and seed profiles only'
);

select * from finish();
rollback;
