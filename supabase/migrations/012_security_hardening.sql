-- ============================================================================
-- MIGRATION 012 — security hardening
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Fixes found in a full RLS/RPC/Edge Function security audit (2026-08-09):
--
--   1. CRITICAL — save_session() never checked p_user_id = auth.uid(), and
--      (since function creation grants EXECUTE to PUBLIC by default, and no
--      migration ever revoked it) was callable by anon, fully unauthenticated.
--      A caller could pass an arbitrary p_user_id and write sessions / mutate
--      daily_summaries, user_stats, profiles (streak, totals), and
--      tasks.actual_pomodoros for any real user. Confirmed live via an
--      unauthenticated curl against the anon key (the call executed and only
--      failed on the sessions_user_id_fkey check).
--
--   2. CRITICAL — "profiles: read own or public" (001) exposed EVERY column
--      on any is_public=true row to anonymous requests, since RLS is
--      row-level not column-level — including stripe_customer_id,
--      stripe_subscription_id, subscription_status, and
--      subscription_current_period_end. Confirmed live via anon curl.
--
--   3. MODERATE — "profiles: read if connected via follows" (008) had the
--      same column-exposure problem, scoped to any accepted/pending follow
--      connection: a connected user could read a friend's full profiles row
--      (billing columns included) by querying the REST API directly.
--
--   4. MODERATE — "follows: read own or public-target" (001) let anonymous
--      requests enumerate every follows row targeting a public profile,
--      including the follower_id of private accounts. No feature in the app
--      actually reads this branch (friendship checks are always scoped to
--      auth.uid()), so it's dead, unnecessary exposure.
--
-- Fix pattern: least-privilege. save_session() gets an ownership check plus
-- an explicit REVOKE FROM PUBLIC (belt-and-suspenders alongside the check).
-- profiles' "or is_public" / "connected via follows" policies — which leak
-- full rows — are replaced by a single public_profiles VIEW exposing only
-- non-sensitive columns, covering the public/own/friend-connected cases that
-- used to go through the base table. follows' public-target branch is
-- dropped since nothing reads it.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. save_session(): enforce ownership, lock down EXECUTE
-- ----------------------------------------------------------------------------

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
  -- Ownership check: a SECURITY DEFINER function runs with the owner's
  -- privileges, so without this, any caller could pass any p_user_id and
  -- write to another user's data. This was previously missing entirely.
  if p_user_id is distinct from auth.uid() then
    raise exception 'save_session: p_user_id must match the authenticated user';
  end if;

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
        when last_focus_date = v_today                     then current_streak
        when last_focus_date = v_today - interval '1 day'  then current_streak + 1
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

-- Belt-and-suspenders alongside the auth.uid() check above: function creation
-- grants EXECUTE to PUBLIC by default, and no prior migration revoked it, so
-- save_session was callable by the anon role (fully unauthenticated) the
-- whole time. Revoke first, then grant only to authenticated.
revoke execute on function public.save_session(
  uuid, uuid, uuid, session_type, integer, timestamptz, timestamptz, text, text, date
) from public;

grant execute on function public.save_session(
  uuid, uuid, uuid, session_type, integer, timestamptz, timestamptz, text, text, date
) to authenticated;

-- Same "PUBLIC gets EXECUTE by default" issue applies to the SECURITY
-- DEFINER helper functions added in 008/009 — neither is sensitive on its
-- own (both just return a boolean), but locking them to authenticated only
-- matches the intent of their original `grant ... to authenticated` and
-- removes anon's ability to probe the follow graph one pair at a time.
revoke execute on function public.is_connected_via_follows(uuid, uuid) from public;
grant  execute on function public.is_connected_via_follows(uuid, uuid) to authenticated;

revoke execute on function public.are_friends_via_follows(uuid, uuid) from public;
grant  execute on function public.are_friends_via_follows(uuid, uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 2 & 3. profiles: drop the row-exposing policies, add a safe-columns view
-- ----------------------------------------------------------------------------

drop policy if exists "profiles: read own or public"          on public.profiles;
drop policy if exists "profiles: read if connected via follows" on public.profiles;

-- Owner-only now — no more "or is_public = true" / "or connected via follows"
-- branch exposing full rows (billing columns included) to anyone else.
create policy "profiles: read own"
  on public.profiles for select
  using ( id = auth.uid() );

-- public_profiles: the ONE place anything reads another user's profile data
-- from now on (leaderboard, public profile pages, friend cards, search).
-- Owned by the migration role, which (like table owners generally) bypasses
-- RLS on the underlying `profiles` table, so this view's own WHERE clause is
-- the sole gate — it exposes only the columns listed below, never billing
-- fields, and only for rows that are public, the caller's own, or a follows
-- connection (any status — covers a pending request's requester, matching
-- the visibility 008 originally granted for that case).
--
-- last_focus_date and show_heatmap_on_profile are included beyond the
-- originally-scoped column list because existing features need them
-- (getEffectiveStreak's staleness check, and the "should this profile show
-- its heatmap" gate on PublicProfilePage) — both are non-sensitive.
create or replace view public.public_profiles as
select
  id,
  display_name,
  avatar_url,
  profile_slug,
  is_public,
  current_streak,
  longest_streak,
  total_focus_minutes,
  total_sessions,
  member_since,
  last_focus_date,
  show_heatmap_on_profile
from public.profiles
where
  is_public = true
  or id = auth.uid()
  or public.is_connected_via_follows(auth.uid(), id);

grant select on public.public_profiles to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. follows: drop the anonymous public-target read branch
-- ----------------------------------------------------------------------------

drop policy if exists "follows: read own or public-target" on public.follows;

-- Own relationships only, either direction. No feature reads the dropped
-- "or target is public" branch (friendship checks are always scoped to
-- auth.uid()), and it let anonymous requests enumerate every follows row
-- pointed at a public profile, including private accounts' follower_id.
create policy "follows: read own connections"
  on public.follows for select
  using ( follower_id = auth.uid() or following_id = auth.uid() );


-- ============================================================================
-- END OF MIGRATION 012
-- ============================================================================
