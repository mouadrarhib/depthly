-- Trusted timer lifecycle, immutable session timing, reversible exclusion.
-- Apply after 014_restore_anon_execute_for_views.sql.

alter table public.sessions
  add column if not exists title text,
  add column if not exists local_date date,
  add column if not exists is_trusted boolean not null default false,
  add column if not exists excluded_at timestamptz,
  add column if not exists excluded_reason text;

alter table public.profiles
  add column if not exists trusted_focus_minutes integer not null default 0,
  add column if not exists trusted_sessions integer not null default 0,
  add column if not exists trusted_current_streak integer not null default 0,
  add column if not exists trusted_longest_streak integer not null default 0,
  add column if not exists trusted_last_focus_date date;

alter table public.daily_summaries
  add column if not exists trusted_focus_minutes integer not null default 0,
  add column if not exists trusted_session_count integer not null default 0;

alter table public.user_stats
  add column if not exists trusted_focus_minutes integer not null default 0,
  add column if not exists trusted_session_count integer not null default 0;

create or replace view public.public_profiles as
select id, display_name, avatar_url, profile_slug, is_public, current_streak, longest_streak,
  total_focus_minutes, total_sessions, member_since, last_focus_date, show_heatmap_on_profile,
  trusted_focus_minutes, trusted_sessions, trusted_current_streak, trusted_longest_streak,
  trusted_last_focus_date
from public.profiles
where is_public = true or id = auth.uid() or public.is_connected_via_follows(auth.uid(), id);
grant select on public.public_profiles to anon, authenticated;

create table if not exists public.active_timer_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type session_type not null,
  timer_mode timer_mode_type not null,
  target_seconds integer,
  status text not null default 'running' check (status in ('running', 'paused')),
  accumulated_seconds integer not null default 0 check (accumulated_seconds >= 0),
  segment_started_at timestamptz,
  timezone text not null,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id),
  check ((status = 'running' and segment_started_at is not null) or
         (status = 'paused' and segment_started_at is null)),
  check (target_seconds is null or target_seconds between 60 and 14400)
);

alter table public.active_timer_runs enable row level security;
create policy "active timer runs: read own"
  on public.active_timer_runs for select using (user_id = auth.uid());

create index if not exists idx_sessions_user_excluded_started
  on public.sessions(user_id, excluded_at, started_at desc);

drop policy if exists "sessions: insert own" on public.sessions;
drop policy if exists "sessions: update own" on public.sessions;
drop policy if exists "sessions: delete own" on public.sessions;
revoke insert, update, delete on public.sessions from anon, authenticated;
revoke insert, update, delete on public.active_timer_runs from anon, authenticated;

create or replace function public.recompute_current_streak(p_user_id uuid)
returns integer language sql security definer set search_path = public stable as $$
  with active_days as (
    select date
    from public.daily_summaries
    where user_id = p_user_id and focus_minutes > 0 and date <= current_date
  ), numbered as (
    select date, date - (row_number() over (order by date))::integer as grp
    from active_days
  ), latest as (
    select count(*)::integer as streak, max(date) as last_date
    from numbered
    where grp = (select grp from numbered order by date desc limit 1)
  )
  select case when last_date >= current_date - 1 then streak else 0 end from latest;
$$;

create or replace function public.recompute_longest_streak(p_user_id uuid, p_trusted boolean)
returns integer language sql security definer set search_path = public stable as $$
  with active_days as (
    select date from public.daily_summaries where user_id=p_user_id
      and (case when p_trusted then trusted_focus_minutes else focus_minutes end) > 0
  ), groups as (
    select date, date - (row_number() over(order by date))::integer as grp from active_days
  ) select coalesce(max(days),0)::integer from (select count(*) as days from groups group by grp) streaks;
$$;

create or replace function public.apply_focus_aggregate_delta(
  p_user_id uuid, p_task_id uuid, p_local_date date, p_minutes integer,
  p_session_delta integer, p_trusted boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_daily text := to_char(p_local_date, 'YYYY-MM-DD');
  v_weekly text := to_char(p_local_date, 'IYYY') || '-W' || to_char(p_local_date, 'IW');
  v_monthly text := to_char(p_local_date, 'YYYY-MM');
  v_yearly text := to_char(p_local_date, 'YYYY');
  v_goal integer;
  v_streak integer;
begin
  insert into public.daily_summaries(user_id, date, focus_minutes, session_count, trusted_focus_minutes, trusted_session_count)
  values (p_user_id, p_local_date, greatest(0, p_minutes), greatest(0, p_session_delta),
    case when p_trusted then greatest(0,p_minutes) else 0 end,
    case when p_trusted then greatest(0,p_session_delta) else 0 end)
  on conflict(user_id, date) do update set
    focus_minutes = greatest(0, daily_summaries.focus_minutes + p_minutes),
    session_count = greatest(0, daily_summaries.session_count + p_session_delta),
    trusted_focus_minutes = greatest(0, daily_summaries.trusted_focus_minutes + case when p_trusted then p_minutes else 0 end),
    trusted_session_count = greatest(0, daily_summaries.trusted_session_count + case when p_trusted then p_session_delta else 0 end),
    updated_at = now();

  insert into public.user_stats(user_id, period_type, period_key, focus_minutes, session_count,
                                trusted_focus_minutes, trusted_session_count)
  values
    (p_user_id, 'daily', v_daily, greatest(0,p_minutes), greatest(0,p_session_delta),
      case when p_trusted then greatest(0,p_minutes) else 0 end,
      case when p_trusted then greatest(0,p_session_delta) else 0 end),
    (p_user_id, 'weekly', v_weekly, greatest(0,p_minutes), greatest(0,p_session_delta),
      case when p_trusted then greatest(0,p_minutes) else 0 end,
      case when p_trusted then greatest(0,p_session_delta) else 0 end),
    (p_user_id, 'monthly', v_monthly, greatest(0,p_minutes), greatest(0,p_session_delta),
      case when p_trusted then greatest(0,p_minutes) else 0 end,
      case when p_trusted then greatest(0,p_session_delta) else 0 end),
    (p_user_id, 'yearly', v_yearly, greatest(0,p_minutes), greatest(0,p_session_delta),
      case when p_trusted then greatest(0,p_minutes) else 0 end,
      case when p_trusted then greatest(0,p_session_delta) else 0 end)
  on conflict(user_id, period_type, period_key) do update set
    focus_minutes = greatest(0, user_stats.focus_minutes + p_minutes),
    session_count = greatest(0, user_stats.session_count + p_session_delta),
    trusted_focus_minutes = greatest(0, user_stats.trusted_focus_minutes +
      case when p_trusted then p_minutes else 0 end),
    trusted_session_count = greatest(0, user_stats.trusted_session_count +
      case when p_trusted then p_session_delta else 0 end),
    updated_at = now();

  update public.profiles set
    total_focus_minutes = greatest(0, total_focus_minutes + p_minutes),
    total_sessions = greatest(0, total_sessions + p_session_delta),
    trusted_focus_minutes = greatest(0, trusted_focus_minutes + case when p_trusted then p_minutes else 0 end),
    trusted_sessions = greatest(0, trusted_sessions + case when p_trusted then p_session_delta else 0 end)
  where id = p_user_id;

  if p_task_id is not null then
    update public.tasks set actual_pomodoros = greatest(0, actual_pomodoros + p_session_delta)
    where id = p_task_id and user_id = p_user_id;
  end if;

  select daily_goal_minutes into v_goal from public.goals where user_id = p_user_id;
  update public.daily_summaries set daily_goal_met = v_goal is not null and focus_minutes >= v_goal
  where user_id = p_user_id and date = p_local_date;

  v_streak := coalesce(public.recompute_current_streak(p_user_id), 0);
  update public.profiles set current_streak = v_streak,
    longest_streak = public.recompute_longest_streak(p_user_id,false),
    trusted_current_streak = (select case when max(date) >= current_date - 1 then count(*)::integer else 0 end
      from (select date, date-(row_number() over(order by date))::integer grp from daily_summaries where user_id=p_user_id and trusted_focus_minutes>0) d
      where grp=(select date-(row_number() over(order by date))::integer from daily_summaries where user_id=p_user_id and trusted_focus_minutes>0 order by date desc limit 1)),
    trusted_longest_streak = public.recompute_longest_streak(p_user_id,true),
    trusted_last_focus_date = (select max(date) from public.daily_summaries where user_id=p_user_id and trusted_focus_minutes>0),
    last_focus_date = (select max(date) from public.daily_summaries where user_id=p_user_id and focus_minutes>0)
  where id = p_user_id;
end;
$$;

create or replace function public.start_timer_run(
  p_type session_type, p_timer_mode timer_mode_type, p_target_seconds integer,
  p_timezone text, p_project_id uuid default null, p_task_id uuid default null,
  p_title text default null, p_notes text default null
) returns public.active_timer_runs language plpgsql security definer set search_path = public as $$
declare v_run public.active_timer_runs;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Invalid timezone'; end if;
  if p_timer_mode = 'pomodoro' and (p_target_seconds is null or p_target_seconds not between 60 and 14400) then
    raise exception 'Countdown target must be between 1 and 240 minutes';
  end if;
  if p_timer_mode = 'free' then p_target_seconds := null; end if;
  if p_project_id is not null and not exists(select 1 from projects where id=p_project_id and user_id=auth.uid()) then
    raise exception 'Invalid project';
  end if;
  if p_task_id is not null and not exists(select 1 from tasks where id=p_task_id and user_id=auth.uid() and (p_project_id is null or project_id=p_project_id)) then
    raise exception 'Invalid task';
  end if;
  insert into active_timer_runs(user_id,type,timer_mode,target_seconds,status,segment_started_at,timezone,
    project_id,task_id,title,notes)
  values(auth.uid(),p_type,p_timer_mode,p_target_seconds,'running',now(),p_timezone,p_project_id,p_task_id,
    nullif(trim(p_title),''),nullif(trim(p_notes),'')) returning * into v_run;
  return v_run;
exception when unique_violation then raise exception 'An active timer already exists';
end;
$$;

create or replace function public.pause_timer_run(p_run_id uuid)
returns public.active_timer_runs language plpgsql security definer set search_path=public as $$
declare v_run public.active_timer_runs;
begin
  update active_timer_runs set
    accumulated_seconds = least(43200, accumulated_seconds + greatest(0, extract(epoch from now()-segment_started_at)::integer)),
    status='paused', segment_started_at=null, updated_at=now()
  where id=p_run_id and user_id=auth.uid() and status='running' returning * into v_run;
  if v_run.id is null then raise exception 'Running timer not found'; end if;
  return v_run;
end;
$$;

create or replace function public.resume_timer_run(p_run_id uuid)
returns public.active_timer_runs language plpgsql security definer set search_path=public as $$
declare v_run public.active_timer_runs;
begin
  update active_timer_runs set status='running',segment_started_at=now(),updated_at=now()
  where id=p_run_id and user_id=auth.uid() and status='paused' and accumulated_seconds<43200 returning * into v_run;
  if v_run.id is null then raise exception 'Paused timer not found'; end if;
  return v_run;
end;
$$;

create or replace function public.cancel_timer_run(p_run_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from active_timer_runs where id=p_run_id and user_id=auth.uid();
  if not found then raise exception 'Timer not found'; end if;
end;
$$;

create or replace function public.finish_timer_run(p_run_id uuid, p_project_id uuid, p_task_id uuid, p_title text, p_notes text)
returns public.sessions language plpgsql security definer set search_path=public as $$
declare
  v_run public.active_timer_runs; v_session public.sessions; v_seconds integer; v_minutes integer;
  v_started timestamptz; v_date date;
begin
  select * into v_run from active_timer_runs where id=p_run_id and user_id=auth.uid() for update;
  if v_run.id is null then raise exception 'Timer not found'; end if;
  if p_project_id is not null and not exists(select 1 from projects where id=p_project_id and user_id=auth.uid()) then raise exception 'Invalid project'; end if;
  if p_task_id is not null and not exists(select 1 from tasks where id=p_task_id and user_id=auth.uid() and project_id=p_project_id) then raise exception 'Invalid task'; end if;
  v_seconds := least(43200, v_run.accumulated_seconds + case when v_run.status='running'
    then greatest(0,extract(epoch from now()-v_run.segment_started_at)::integer) else 0 end);
  if v_run.target_seconds is not null then v_seconds := least(v_seconds,v_run.target_seconds); end if;
  if v_seconds < 60 then raise exception 'Session too short to save'; end if;
  v_minutes := greatest(1,round(v_seconds/60.0)::integer);
  v_started := now() - make_interval(secs=>v_seconds);
  v_date := (now() at time zone v_run.timezone)::date;
  insert into sessions(user_id,project_id,task_id,type,duration_mins,started_at,ended_at,notes,timer_mode,
    title,local_date,is_trusted)
  values(v_run.user_id,p_project_id,p_task_id,v_run.type,v_minutes,v_started,now(),nullif(trim(p_notes),''),v_run.timer_mode,
    nullif(trim(p_title),''),v_date,true) returning * into v_session;
  if v_run.type='focus' then
    perform apply_focus_aggregate_delta(v_run.user_id,p_task_id,v_date,v_minutes,1,true);
  end if;
  delete from active_timer_runs where id=v_run.id;
  return v_session;
end;
$$;

create or replace function public.update_session_metadata(
  p_session_id uuid, p_project_id uuid, p_task_id uuid, p_title text, p_notes text
) returns public.sessions language plpgsql security definer set search_path=public as $$
declare v_session public.sessions;
begin
  if p_project_id is not null and not exists(select 1 from projects where id=p_project_id and user_id=auth.uid()) then raise exception 'Invalid project'; end if;
  if p_task_id is not null and not exists(select 1 from tasks where id=p_task_id and user_id=auth.uid() and project_id=p_project_id) then raise exception 'Invalid task'; end if;
  update sessions set project_id=p_project_id,task_id=p_task_id,title=nullif(trim(p_title),''),notes=nullif(trim(p_notes),'')
  where id=p_session_id and user_id=auth.uid() returning * into v_session;
  if v_session.id is null then raise exception 'Session not found'; end if;
  return v_session;
end;
$$;

create or replace function public.set_session_excluded(p_session_id uuid, p_excluded boolean)
returns public.sessions language plpgsql security definer set search_path=public as $$
declare v_session public.sessions; v_delta integer;
begin
  select * into v_session from sessions where id=p_session_id and user_id=auth.uid() for update;
  if v_session.id is null or not v_session.is_trusted or v_session.type<>'focus' then raise exception 'Only trusted focus sessions can be changed'; end if;
  if p_excluded = (v_session.excluded_at is not null) then return v_session; end if;
  v_delta := case when p_excluded then -1 else 1 end;
  perform apply_focus_aggregate_delta(v_session.user_id,v_session.task_id,v_session.local_date,
    v_delta*v_session.duration_mins,v_delta,true);
  update sessions set excluded_at=case when p_excluded then now() else null end,
    excluded_reason=case when p_excluded then 'user_excluded' else null end
  where id=p_session_id returning * into v_session;
  return v_session;
end;
$$;

revoke execute on function public.save_session(uuid,uuid,uuid,session_type,integer,timestamptz,timestamptz,text,text,date) from authenticated;
grant execute on function public.start_timer_run(session_type,timer_mode_type,integer,text,uuid,uuid,text,text) to authenticated;
grant execute on function public.pause_timer_run(uuid) to authenticated;
grant execute on function public.resume_timer_run(uuid) to authenticated;
grant execute on function public.cancel_timer_run(uuid) to authenticated;
grant execute on function public.finish_timer_run(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.update_session_metadata(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.set_session_excluded(uuid,boolean) to authenticated;

-- Supabase grants functions broadly by default; helpers must never be directly callable.
revoke execute on function public.apply_focus_aggregate_delta(uuid,uuid,date,integer,integer,boolean) from public, anon, authenticated;
revoke execute on function public.recompute_current_streak(uuid) from public, anon, authenticated;
revoke execute on function public.recompute_longest_streak(uuid,boolean) from public, anon, authenticated;
revoke execute on function public.start_timer_run(session_type,timer_mode_type,integer,text,uuid,uuid,text,text) from public, anon;
revoke execute on function public.pause_timer_run(uuid) from public, anon;
revoke execute on function public.resume_timer_run(uuid) from public, anon;
revoke execute on function public.cancel_timer_run(uuid) from public, anon;
revoke execute on function public.finish_timer_run(uuid,uuid,uuid,text,text) from public, anon;
revoke execute on function public.update_session_metadata(uuid,uuid,uuid,text,text) from public, anon;
revoke execute on function public.set_session_excluded(uuid,boolean) from public, anon;
