-- ============================================================================
-- MIGRATION 006 — save_session() uses client-local date, not UTC
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Bug: save_session() derived the session's date via
--   (p_started_at at time zone 'UTC')::date
-- while every client-side "today" query (Topbar stats, Dashboard's Today's
-- stats row, streak) uses the browser's LOCAL date. For any user off UTC,
-- these disagree for part of the day — most commonly, users west of UTC
-- (the Americas) get evening focus sessions filed under tomorrow's UTC
-- date, so they save successfully but never show up under "today" in the
-- navbar or dashboard.
--
-- Fix: accept the client's local date as an explicit parameter and use it
-- instead of re-deriving it from UTC server-side.
-- ============================================================================

create or replace function public.save_session(
  p_user_id       uuid,
  p_project_id    uuid,
  p_task_id       uuid,
  p_type          session_type,
  p_duration_mins integer,
  p_started_at    timestamptz,
  p_ended_at      timestamptz,
  p_timer_mode    text,
  p_notes         text,
  p_local_date    date
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session        public.sessions;
  v_today          date := p_local_date;
  v_daily_goal     integer;
  v_daily_minutes  integer;
  v_period_daily   text := to_char(v_today, 'YYYY-MM-DD');
  v_period_weekly  text := to_char(v_today, 'IYYY') || '-W' || to_char(v_today, 'IW');
  v_period_monthly text := to_char(v_today, 'YYYY-MM');
  v_period_yearly  text := to_char(v_today, 'YYYY');
  v_timer_mode     timer_mode_type;
  v_new_streak     integer;
begin
  -- Coerce timer_mode text → enum ('custom' maps to 'pomodoro' for storage)
  v_timer_mode := case
    when p_timer_mode = 'free' then 'free'::timer_mode_type
    else 'pomodoro'::timer_mode_type
  end;

  -- 1. Insert the session row
  insert into public.sessions (
    user_id, project_id, task_id, type,
    duration_mins, started_at, ended_at, notes, timer_mode
  )
  values (
    p_user_id, p_project_id, p_task_id, p_type,
    p_duration_mins, p_started_at, p_ended_at, p_notes, v_timer_mode
  )
  returning * into v_session;

  -- Aggregates only apply to focus sessions
  if p_type = 'focus' then

    -- 2. Upsert daily_summaries
    insert into public.daily_summaries (user_id, date, focus_minutes, session_count)
    values (p_user_id, v_today, p_duration_mins, 1)
    on conflict (user_id, date) do update
      set focus_minutes = daily_summaries.focus_minutes + excluded.focus_minutes,
          session_count = daily_summaries.session_count + 1,
          updated_at    = now();

    -- 3. Mark daily_goal_met if applicable
    select daily_goal_minutes into v_daily_goal
    from public.goals
    where user_id = p_user_id;

    if v_daily_goal is not null then
      select focus_minutes into v_daily_minutes
      from public.daily_summaries
      where user_id = p_user_id and date = v_today;

      if v_daily_minutes >= v_daily_goal then
        update public.daily_summaries
        set daily_goal_met = true
        where user_id = p_user_id and date = v_today;
      end if;
    end if;

    -- 4. Upsert user_stats — all four periods
    insert into public.user_stats (user_id, period_type, period_key, focus_minutes, session_count)
    values
      (p_user_id, 'daily',   v_period_daily,   p_duration_mins, 1),
      (p_user_id, 'weekly',  v_period_weekly,  p_duration_mins, 1),
      (p_user_id, 'monthly', v_period_monthly, p_duration_mins, 1),
      (p_user_id, 'yearly',  v_period_yearly,  p_duration_mins, 1)
    on conflict (user_id, period_type, period_key) do update
      set focus_minutes = user_stats.focus_minutes + excluded.focus_minutes,
          session_count = user_stats.session_count + 1,
          updated_at    = now();

    -- 5. Update profiles: totals + streak
    select
      case
        when last_focus_date = v_today                         then current_streak
        when last_focus_date = v_today - interval '1 day'     then current_streak + 1
        else 1
      end
    into v_new_streak
    from public.profiles
    where id = p_user_id;

    update public.profiles
    set
      total_focus_minutes = total_focus_minutes + p_duration_mins,
      total_sessions      = total_sessions + 1,
      current_streak      = v_new_streak,
      longest_streak      = greatest(longest_streak, v_new_streak),
      last_focus_date     = v_today,
      updated_at          = now()
    where id = p_user_id;

    -- 6. Increment task pomodoro counter (only for focus + linked task)
    if p_task_id is not null then
      update public.tasks
      set actual_pomodoros = actual_pomodoros + 1,
          updated_at       = now()
      where id = p_task_id and user_id = p_user_id;
    end if;

  end if;

  return v_session;
end;
$$;

-- Drop the old 9-arg signature — PostgreSQL treats a changed argument list as
-- an overload, not a replacement, and the client always calls with the new
-- 10-arg shape, so the stale version would just sit there unused.
drop function if exists public.save_session(
  uuid, uuid, uuid, session_type, integer, timestamptz, timestamptz, text, text
);

-- Grant execute to authenticated users (the function checks ownership internally)
grant execute on function public.save_session(
  uuid, uuid, uuid, session_type, integer, timestamptz, timestamptz, text, text, date
) to authenticated;
