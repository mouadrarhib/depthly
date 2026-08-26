# Current database schema

This document describes the schema produced by applying every SQL file in
`supabase/migrations/`, from `001_initial_schema.sql` through
`020_count_all_sessions.sql`, in filename order. The numbered migrations are
the executable source of truth; this is a reviewable current-state inventory.

## Types

- `plan_type`: `free`, `pro`, `founding`
- `plan_interval_type`: `monthly`, `annual`, `lifetime`
- `subscription_status_type`: `active`, `trialing`, `past_due`, `canceled`,
  `unpaid`, `expired`, `refunded`
- `timer_mode_type`: `pomodoro`, `free`
- `theme_type`: `dark`, `light`
- `task_status_type`: `todo`, `in_progress`, `done`
- `task_priority_type`: `low`, `medium`, `high`, `urgent`
- `session_type`: `focus`, `break`
- `period_type`: `daily`, `weekly`, `monthly`, `yearly`

## Tables

The original tables remain:

- `profiles`
- `user_preferences`
- `goals`
- `projects`
- `tasks`
- `sessions`
- `daily_summaries`
- `user_stats`
- `follows`
- `subscriptions`

Later migrations add:

- `active_timer_runs`
- `group_leaderboards`
- `group_leaderboard_members`

Important additions to original tables:

- `profiles`: `is_seed_account`, `trusted_focus_minutes`, `trusted_sessions`,
  `trusted_current_streak`, `trusted_longest_streak`,
  `trusted_last_focus_date`
- `sessions`: `title`, `local_date`, `is_trusted`, `excluded_at`,
  `excluded_reason`
- `daily_summaries`: `trusted_focus_minutes`, `trusted_session_count`
- `user_stats`: `trusted_focus_minutes`, `trusted_session_count`
- `follows`: `status`, constrained to `pending`, `accepted`, or `declined`

`active_timer_runs` is included in the `supabase_realtime` publication and uses
`REPLICA IDENTITY FULL`.

## Views and access model

- `public_profiles` is the only public/friend-facing projection of profile
  data. It excludes billing identifiers and other private profile columns.
- The `profiles` base table is readable only by its owner.
- Direct client inserts, updates, and deletes on `sessions` are disabled.
- Timer lifecycle changes and session creation go through the trusted timer
  RPCs introduced by migration 015.
- Group leaderboard tables are private and accessed through their RPCs.
- Avatar object policies restrict writes to the authenticated user's folder;
  reads are public. The `avatars` bucket itself remains a documented manual
  Supabase Storage setup step.

## Session behavior

- `start_timer_run`, `pause_timer_run`, `resume_timer_run`,
  `cancel_timer_run`, and `finish_timer_run` own the timer lifecycle.
- `update_session_metadata` is the allowed post-save metadata update path.
- The legacy `save_session` function remains in migration history but is not
  executable by authenticated clients after migration 015.
- Migration 020 makes every saved focus session count toward personal and
  trusted statistics. `set_session_excluded` remains only for schema
  compatibility and is no longer executable by authenticated clients.
- `sessions_sync_project_last_used` keeps `projects.last_used_at` synchronized
  with non-excluded focus sessions.

## Provisioning

For a new Supabase project, run `supabase db push`. If applying migrations in
the Supabase SQL editor, execute each numbered file separately and in filename
order. Do not run `001_initial_schema.sql` by itself.
