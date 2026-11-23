-- Screenshot fixture for Emma Wilson only. Run in Supabase SQL Editor.
-- No schema/RLS changes. Safe to rerun: existing fixture sessions are skipped.
begin;
select set_config('request.jwt.claim.sub', '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83', true);
select set_config('request.jwt.claims', '{"sub":"0f98c11b-d2bb-4b72-87f6-7ddac1d11e83","role":"authenticated"}', true);

do $$
declare
  demo_user constant uuid := '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83';
  study_day date;
  study_task record;
  saved public.sessions;
  block integer;
  minutes integer;
  started timestamptz;
  note text;
  task_index integer := 0;
begin
  if not exists (select 1 from public.profiles where id = demo_user and is_seed_account and not is_public) then
    raise exception 'Expected private student demo account was not found';
  end if;
  update public.goals set daily_goal_minutes = 120, weekly_goal_minutes = 600 where user_id = demo_user;

  -- November 1–23: varied study days, with daily activity in the final week.
  for study_day in select generate_series(date '2026-11-01', date '2026-11-23', interval '1 day')::date loop
    if study_day > (current_timestamp at time zone 'Africa/Casablanca')::date then continue; end if;
    if extract(day from study_day)::integer % 6 = 0 and study_day < date '2026-11-17' then continue; end if;
    for block in 0..1 loop
      select t.id, t.project_id, t.title into study_task
      from public.tasks t join public.projects p on p.id = t.project_id
      where t.user_id = demo_user and t.title in ('Review cell division', 'Balance equations', 'Practice derivatives', 'Outline essay')
      order by p.name
      offset ((extract(day from study_day)::integer + block) % 4) limit 1;
      if study_task.id is null then raise exception 'Required demo study task missing'; end if;
      minutes := case when study_day = date '2026-11-23' then 45 else (array[25,30,45,50])[(extract(day from study_day)::integer + block) % 4 + 1] end;
      started := (study_day + make_time(8 + block, 0, 0)) at time zone 'Africa/Casablanca';
      if started + make_interval(mins => minutes) > current_timestamp then continue; end if;
      note := 'Student screenshot fixture · ' || study_day::text || ' · ' || block::text;
      if exists (select 1 from public.sessions where user_id = demo_user and notes = note) then continue; end if;
      saved := public.save_session(demo_user, study_task.project_id, study_task.id, 'focus'::public.session_type,
        minutes, started, started + make_interval(mins => minutes), 'pomodoro'::text, note, study_day);
      -- These are illustrative historical entries, never trusted live activity.
      update public.sessions set local_date = study_day, is_manual = true, is_trusted = false,
        title = study_task.title where id = saved.id and user_id = demo_user;
    end loop;
  end loop;

  -- Cover every module task, not only the four tasks used by the daily
  -- overview. This also fills gaps when the earlier version was already run.
  -- Leave November 23 unchanged so today's screenshot remains 90/120 minutes.
  for study_task in
    select t.id, t.project_id, t.title from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.user_id = demo_user and p.user_id = demo_user
    order by p.name, t.list_order, t.id
  loop
    task_index := task_index + 1;
    if exists (select 1 from public.sessions where user_id = demo_user
      and task_id = study_task.id and type = 'focus'
      and coalesce(local_date, (started_at at time zone 'Africa/Casablanca')::date)
        between date '2026-11-01' and date '2026-11-22') then
      continue;
    end if;
    study_day := date '2026-11-01' + ((task_index - 1) % 20);
    started := (study_day + time '14:00') at time zone 'Africa/Casablanca';
    minutes := (array[25,30,45])[(task_index - 1) % 3 + 1];
    if started + make_interval(mins => minutes) > current_timestamp then continue; end if;
    note := 'Student task coverage fixture · ' || study_task.id::text;
    saved := public.save_session(demo_user, study_task.project_id, study_task.id,
      'focus'::public.session_type, minutes, started,
      started + make_interval(mins => minutes), 'pomodoro'::text, note, study_day);
    update public.sessions set local_date = study_day, is_manual = true,
      is_trusted = false, title = study_task.title
      where id = saved.id and user_id = demo_user;
  end loop;
end $$;
commit;

select date, focus_minutes, session_count from public.daily_summaries
where user_id = '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83' and date between '2026-11-01' and '2026-11-30'
order by date;

-- Confirm every task has recorded focus time in November.
select p.name as module, t.title as task, count(s.id) as sessions,
  coalesce(sum(s.duration_mins), 0) as focus_minutes
from public.tasks t join public.projects p on p.id = t.project_id
left join public.sessions s on s.task_id = t.id and s.user_id = t.user_id
  and s.type = 'focus'
  and coalesce(s.local_date, (s.started_at at time zone 'Africa/Casablanca')::date)
    between date '2026-11-01' and date '2026-11-30'
where t.user_id = '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83'
group by p.name, t.id, t.title order by p.name, t.title;
