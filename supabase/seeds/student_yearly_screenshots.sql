-- Emma's illustrative 2026 study history, January–October only.
-- Run in Supabase SQL Editor. No schema or security-policy changes.
-- Existing sessions, including November, are preserved. Safe to rerun.
begin;
select set_config('request.jwt.claim.sub', '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83', true);
select set_config('request.jwt.claims', '{"sub":"0f98c11b-d2bb-4b72-87f6-7ddac1d11e83","role":"authenticated"}', true);

do $$
declare
  demo_user constant uuid := '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83';
  study_day date;
  study_task record;
  saved public.sessions;
  month_number integer;
  day_number integer;
  weekday integer;
  block integer;
  block_count integer;
  minutes integer;
  started timestamptz;
  note text;
begin
  if not exists (select 1 from public.profiles where id = demo_user and is_seed_account and not is_public) then
    raise exception 'Expected private student demo account was not found';
  end if;
  if (select count(*) from public.tasks where user_id = demo_user and title in
    ('Review cell division', 'Balance equations', 'Practice derivatives', 'Outline essay')) <> 4 then
    raise exception 'Expected four core study tasks; refusing ambiguous fixture';
  end if;

  for study_day in select generate_series(date '2026-01-01', date '2026-10-31', interval '1 day')::date loop
    month_number := extract(month from study_day)::integer;
    day_number := extract(day from study_day)::integer;
    weekday := extract(isodow from study_day)::integer;
    -- Preserve rest days and lighter summer weeks instead of a solid heatmap.
    if weekday = 7 then continue; end if;
    if month_number in (7, 8) and weekday not in (2, 4) then continue; end if;
    if month_number not in (7, 8) and (day_number + month_number) % 5 = 0 then continue; end if;
    block_count := case
      when month_number in (5, 6, 10) and weekday <> 6 then 3
      when month_number in (7, 8) or weekday = 6 then 1
      else 2 end;
    for block in 0..(block_count - 1) loop
      select t.id, t.project_id, t.title into study_task
      from public.tasks t join public.projects p on p.id = t.project_id
      where t.user_id = demo_user and p.user_id = demo_user
        and t.title in ('Review cell division', 'Balance equations', 'Practice derivatives', 'Outline essay')
      order by p.name, t.id
      offset ((day_number + month_number + block) % 4) limit 1;
      minutes := (array[25,30,45,50])[(day_number + month_number + block) % 4 + 1];
      started := (study_day + make_time(9 + block, 0, 0)) at time zone 'Africa/Casablanca';
      if started + make_interval(mins => minutes) > current_timestamp then continue; end if;
      note := 'Student yearly screenshot fixture · ' || study_day::text || ' · ' || block::text;
      if exists (select 1 from public.sessions where user_id = demo_user and notes = note) then continue; end if;
      saved := public.save_session(demo_user, study_task.project_id, study_task.id,
        'focus'::public.session_type, minutes, started,
        started + make_interval(mins => minutes), 'pomodoro'::text, note, study_day);
      update public.sessions set local_date = study_day, is_manual = true,
        is_trusted = false, title = study_task.title
      where id = saved.id and user_id = demo_user;
    end loop;
  end loop;
  -- Fixtures predate signup solely for screenshots. Keep the demo's displayed
  -- membership date coherent without changing authentication or real accounts.
  update public.profiles set member_since = least(member_since, '2026-01-01T00:00:00Z'::timestamptz)
  where id = demo_user;
end $$;
commit;

select to_char(date, 'YYYY-MM') as month,
  sum(focus_minutes) as focus_minutes, sum(session_count) as sessions,
  count(*) filter (where focus_minutes > 0) as study_days
from public.daily_summaries
where user_id = '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83'
  and date between '2026-01-01' and '2026-11-30'
group by 1 order by 1;
