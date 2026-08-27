-- Reconcile hosted-project default grants with Depthly's explicit access model.
--
-- The production project predates the local CLI migration workflow and still
-- carries Supabase dashboard defaults that grant broad access to anon and
-- authenticated. RLS blocks many of those operations today, but privileges
-- must also be least-privilege so a future policy cannot accidentally expose a
-- server-owned table. Start from no client privileges, then grant only the
-- operations used by the current frontend and public RPC/view surface.

revoke all privileges on all tables in schema public from public, anon, authenticated;
revoke all privileges on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Prevent future tables, sequences, and functions from silently inheriting
-- dashboard-era client privileges. Every new migration must grant deliberately.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Narrow public surface. Anonymous users never read a base table directly.
grant select on table public.public_profiles to anon, authenticated;

grant execute on function public.is_connected_via_follows(uuid, uuid)
  to anon, authenticated;
grant execute on function public.are_friends_via_follows(uuid, uuid)
  to anon, authenticated;
grant execute on function public.preview_group_leaderboard_invite(text)
  to anon, authenticated;
grant execute on function public.get_global_leaderboard(public.period_type, text, integer)
  to anon, authenticated;
grant execute on function public.get_global_streak_leaderboard(text, integer)
  to anon, authenticated;

-- Owner-scoped table operations used directly by the frontend. RLS remains
-- the row-level enforcement layer; billing, aggregates, timers, and protected
-- project/profile fields continue to have no direct client write path.
grant select on table public.profiles to authenticated;
grant select, update on table public.user_preferences to authenticated;
grant select, update on table public.goals to authenticated;
grant select, delete on table public.projects to authenticated;
grant update (name, color, icon, sort_order, last_used_at)
  on table public.projects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select on table public.sessions to authenticated;
grant select on table public.daily_summaries to authenticated;
grant select on table public.user_stats to authenticated;
grant select, insert, update, delete on table public.follows to authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.active_timer_runs to authenticated;

-- Authenticated RPC surface. Internal helpers, trigger functions, the legacy
-- save_session RPC, and set_session_excluded intentionally remain uncallable.
grant execute on function public.start_timer_run(
  public.session_type, public.timer_mode_type, integer, text, uuid, uuid, text, text
) to authenticated;
grant execute on function public.pause_timer_run(uuid) to authenticated;
grant execute on function public.resume_timer_run(uuid) to authenticated;
grant execute on function public.cancel_timer_run(uuid) to authenticated;
grant execute on function public.finish_timer_run(uuid, uuid, uuid, text, text)
  to authenticated;
grant execute on function public.update_session_metadata(uuid, uuid, uuid, text, text)
  to authenticated;

grant execute on function public.create_group_leaderboard(
  text, public.period_type, integer, text
) to authenticated;
grant execute on function public.join_group_leaderboard(text) to authenticated;
grant execute on function public.list_my_group_leaderboards() to authenticated;
grant execute on function public.get_group_leaderboard(uuid) to authenticated;
grant execute on function public.get_group_leaderboard_ranking(uuid) to authenticated;
grant execute on function public.leave_group_leaderboard(uuid) to authenticated;
grant execute on function public.remove_group_leaderboard_member(uuid, uuid)
  to authenticated;
grant execute on function public.close_group_leaderboard(uuid) to authenticated;

grant execute on function public.update_my_profile(jsonb) to authenticated;
grant execute on function public.is_profile_slug_available(text) to authenticated;
grant execute on function public.create_project(text, text, text) to authenticated;
grant execute on function public.set_project_archived(uuid, boolean) to authenticated;
grant execute on function public.get_monthly_focus_session_count(text) to authenticated;
grant execute on function public.get_analytics_daily_summaries(date, date, text)
  to authenticated;
grant execute on function public.get_analytics_sessions(date, date, uuid, text, text)
  to authenticated;
grant execute on function public.export_my_sessions(
  date, date, uuid, boolean, integer, integer, text
) to authenticated;
grant execute on function public.get_my_global_leaderboard_rank(
  public.period_type, text
) to authenticated;

-- Trusted Edge Functions and administrative tooling retain full access.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;
alter default privileges for role postgres in schema public
  grant all privileges on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

comment on table public.profiles is
  'Owner-readable identity, plan, billing, trust and aggregate state. Client writes are accepted only through whitelisted RPCs.';
comment on function public.set_session_excluded(uuid, boolean) is
  'Deprecated: all saved sessions count toward statistics. Retained temporarily for schema compatibility.';
