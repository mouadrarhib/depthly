# Trusted Sessions and Share Progress

## Trust model

Migration `015_trusted_sessions.sql` makes focus timing server-authoritative. The client starts,
pauses, resumes, finishes, or cancels an `active_timer_runs` row through authenticated RPCs.
Postgres timestamps each running segment and calculates the final duration; clients cannot insert,
delete, or change timing fields on `sessions` directly.

Only one active run is allowed per user. The client restores it after reload. Countdown runs are
clamped to their configured target (1–240 minutes); free runs are capped at 12 hours. Runs under
one minute are cancelled rather than saved.

Migration `016_active_timer_realtime.sql` adds `active_timer_runs` to Supabase Realtime. Every
authenticated tab/device subscribes to its own run, so start, pause, resume, finish, and cancellation
are reflected without refreshing. A remote deletion stops and clears the local counter.

## Legacy and trusted statistics

Rows created before migration 015 remain `is_trusted = false`. They continue to power personal
Analytics but do not increment `trusted_*` profile/user-stat fields used by leaderboards and future
Challenges. New timer sessions increment personal and trusted aggregates atomically.

## Session changes

Saved timing is immutable. `update_session_metadata()` may change only title, notes, project, and
task. Every saved focus session counts toward analytics, goals, streaks, project/task totals, and
leaderboards. Migration `020_count_all_sessions.sql` restores any previously excluded sessions,
clears their exclusion metadata, and revokes authenticated access to the legacy
`set_session_excluded()` RPC. The exclusion columns and RPC remain temporarily for schema
compatibility but are no longer used by the application.

The main Sessions page and each project's Sessions tab share `SessionDetailModal` and
`SessionModal`. Project rows fetch project/task relations, are keyboard accessible, and open the
shared details dialog when selected. Sessions can be edited but not excluded or deleted. The page
keeps only the session-type filter; a separate unfiltered session-count query distinguishes a
genuinely empty account from a type/filter combination with zero results.

## Share Progress

Daily, weekly, monthly, and yearly Analytics expose Share Progress. The current rendered analytics
surface is captured directly, including its graphs, heatmaps, goals, and project breakdowns, then
scaled into a branded 1080×1350 PNG. Native file sharing is used when available, with copy and
download fallbacks. Free accounts can share only periods inside their analytics window.

## Deployment

Apply migrations through `020_count_all_sessions.sql`, deploy the matching client, then verify direct
session writes and the legacy `save_session()` RPC are rejected for authenticated users. Deploying
the client before migration 015 will make timer actions fail because the lifecycle RPCs do not exist.
