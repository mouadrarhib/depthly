-- ============================================================================
-- FOCUS APP — COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Target:   PostgreSQL 15+ (Supabase)
-- Run in:   Supabase Dashboard → SQL Editor → New Query → Run
-- Order:    Top to bottom. This file is idempotent-safe on a fresh project.
--
-- Structure of this file:
--   1.  Extensions
--   2.  Enum types
--   3.  Tables (in dependency order)
--   4.  Indexes
--   5.  updated_at trigger function + triggers
--   6.  New-user bootstrap trigger (auto-create profile/preferences/goals)
--   7.  Row Level Security (enable + policies per table)
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
-- pgcrypto gives us gen_random_uuid() for primary keys.
-- (On Supabase this is usually enabled already, but we ensure it.)

create extension if not exists pgcrypto;


-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================
-- We use Postgres enums instead of free-text columns for fields with a fixed,
-- known set of values. Benefits: the database rejects invalid values, the set
-- is self-documenting, and queries are slightly faster. To add a value later:
--   ALTER TYPE plan_type ADD VALUE 'team';

create type plan_type            as enum ('free', 'pro', 'founding');
create type plan_interval_type   as enum ('monthly', 'annual', 'lifetime');
create type subscription_status_type as enum
  ('active', 'trialing', 'past_due', 'canceled', 'unpaid');
create type timer_mode_type      as enum ('pomodoro', 'free');
create type theme_type           as enum ('dark', 'light');
create type task_status_type     as enum ('todo', 'in_progress', 'done');
create type task_priority_type   as enum ('low', 'medium', 'high', 'urgent');
create type session_type         as enum ('focus', 'break');
create type period_type          as enum ('daily', 'weekly', 'monthly', 'yearly');


-- ============================================================================
-- 3. TABLES
-- ============================================================================
-- Created in dependency order: profiles first (everything references it),
-- then the tables that reference profiles, then tables that reference those.


-- ----------------------------------------------------------------------------
-- 3.1  profiles
-- ----------------------------------------------------------------------------
-- The central user record. One row per user. Its primary key IS the Supabase
-- auth user id (from auth.users), so we never need a join to connect an
-- authenticated session to app data. Holds identity, plan/billing state, and
-- the running streak + all-time counters that are read on almost every request.

create table public.profiles (
  id                               uuid primary key
                                     references auth.users (id) on delete cascade,

  -- identity
  display_name                     text        not null,
  avatar_url                       text,
  profile_slug                     text        not null unique,
  is_public                        boolean     not null default false,
  show_heatmap_on_profile          boolean     not null default false,
  member_since                     timestamptz not null default now(),

  -- plan & billing (mirror of Stripe, updated by webhooks)
  plan                             plan_type            not null default 'free',
  plan_interval                    plan_interval_type,
  stripe_customer_id               text        unique,
  stripe_subscription_id           text        unique,
  subscription_status              subscription_status_type,
  subscription_current_period_end  timestamptz,
  is_founding_member               boolean     not null default false,

  -- streak & all-time stats (updated on every focus session save)
  current_streak                   integer     not null default 0,
  longest_streak                   integer     not null default 0,
  last_focus_date                  date,
  total_focus_minutes              integer     not null default 0,
  total_sessions                   integer     not null default 0,

  -- timestamps
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);

comment on table public.profiles is
  'Extends auth.users with app-facing identity, plan state, and running stats.';


-- ----------------------------------------------------------------------------
-- 3.2  user_preferences
-- ----------------------------------------------------------------------------
-- All configurable settings. Kept separate from profiles so the heavily-read
-- profile row stays lean. One row per user (enforced by the unique constraint).

create table public.user_preferences (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique
                             references public.profiles (id) on delete cascade,

  -- timer
  timer_default_mode       timer_mode_type not null default 'pomodoro',
  pomodoro_focus_mins      integer         not null default 25,
  pomodoro_break_mins      integer         not null default 5,
  auto_start_break         boolean         not null default false,
  auto_start_focus         boolean         not null default false,

  -- notifications & sound
  sound_enabled            boolean         not null default true,
  sound_option             text            not null default 'bell',
  daily_reminder_enabled   boolean         not null default false,
  daily_reminder_time      time,
  streak_reminder_enabled  boolean         not null default false,

  -- display
  theme                    theme_type      not null default 'dark',

  created_at               timestamptz     not null default now(),
  updated_at               timestamptz     not null default now()
);

comment on table public.user_preferences is
  'Per-user timer, notification, and display settings. One row per user.';


-- ----------------------------------------------------------------------------
-- 3.3  goals
-- ----------------------------------------------------------------------------
-- Daily and weekly focus targets, stored in MINUTES (integer) to stay
-- consistent with sessions.duration_mins and avoid float comparisons.
-- One row per user; targets are NULL until the user sets a goal.

create table public.goals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique
                        references public.profiles (id) on delete cascade,
  daily_goal_minutes  integer,
  weekly_goal_minutes integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.goals is
  'Per-user daily/weekly focus targets in minutes. NULL means no goal set.';


-- ----------------------------------------------------------------------------
-- 3.4  projects
-- ----------------------------------------------------------------------------
-- Top-level containers. Tasks and sessions belong to projects. Supports soft
-- archiving (is_archived) so history is preserved, plus manual sort ordering
-- and last_used_at for the three sort modes.

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null
                  references public.profiles (id) on delete cascade,
  name          text        not null,
  color         text        not null default '#6366f1',
  icon          text,
  is_archived   boolean     not null default false,
  sort_order    integer     not null default 0,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.projects is
  'Top-level containers for tasks and sessions. Soft-archivable.';


-- ----------------------------------------------------------------------------
-- 3.5  tasks
-- ----------------------------------------------------------------------------
-- First-class tasks inside projects. The two float ordering columns are the
-- key design point: list_order and kanban_order are independent, so reordering
-- in one view never disturbs the other. user_id is denormalized from the
-- parent project to keep RLS checks and per-user queries join-free.

create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null
                         references public.projects (id) on delete cascade,
  user_id              uuid not null
                         references public.profiles (id) on delete cascade,

  -- content
  title                text               not null,
  description          text,
  status               task_status_type   not null default 'todo',
  priority             task_priority_type not null default 'medium',
  due_date             date,
  completed_at         timestamptz,

  -- pomodoro tracking
  estimated_pomodoros  integer,
  actual_pomodoros     integer            not null default 0,

  -- independent ordering for the two views (float = insert without renumber)
  list_order           double precision   not null default 0,
  kanban_order         double precision   not null default 0,

  created_at           timestamptz        not null default now(),
  updated_at           timestamptz        not null default now()
);

comment on table public.tasks is
  'Tasks within projects. list_order and kanban_order order the two views independently.';
comment on column public.tasks.list_order is
  'Position in List View. Float allows inserting between rows without renumbering.';
comment on column public.tasks.kanban_order is
  'Position within the Kanban column. Independent of list_order.';


-- ----------------------------------------------------------------------------
-- 3.6  sessions
-- ----------------------------------------------------------------------------
-- The raw event log: every focus/break block is one row. Source of truth for
-- all analytics, streaks, goals, leaderboard, and export. project_id and
-- task_id are nullable and use ON DELETE SET NULL so time is never lost when a
-- project or task is deleted.

create table public.sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null
                   references public.profiles (id) on delete cascade,
  project_id     uuid
                   references public.projects (id) on delete set null,
  task_id        uuid
                   references public.tasks (id)    on delete set null,

  type           session_type   not null,
  duration_mins  integer        not null,
  started_at     timestamptz    not null,
  ended_at       timestamptz    not null,
  notes          text,
  is_manual      boolean        not null default false,
  timer_mode     timer_mode_type,

  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now()
);

comment on table public.sessions is
  'Raw focus/break event log. Powers all analytics. Sessions outlive their project/task.';


-- ----------------------------------------------------------------------------
-- 3.7  daily_summaries
-- ----------------------------------------------------------------------------
-- One pre-aggregated row per user per day. Updated on every focus session save.
-- Powers heatmaps, goal-met indicators, and streak math without grouping raw
-- sessions at read time. UNIQUE (user_id, date) makes the per-day upsert clean.

create table public.daily_summaries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null
                    references public.profiles (id) on delete cascade,
  date            date        not null,
  focus_minutes   integer     not null default 0,
  session_count   integer     not null default 0,
  daily_goal_met  boolean     not null default false,
  updated_at      timestamptz not null default now(),

  unique (user_id, date)
);

comment on table public.daily_summaries is
  'Per-user-per-day rollup. Powers heatmaps, goal history, and streak checks.';


-- ----------------------------------------------------------------------------
-- 3.8  user_stats
-- ----------------------------------------------------------------------------
-- Pre-aggregated period totals for leaderboard ranking. One row per user per
-- (period_type, period_key). The only table queried across all users at once,
-- so the period rollup keeps that ranking query to a single index scan.
-- period_key format: daily '2025-01-15', weekly '2025-W03',
--                    monthly '2025-01', yearly '2025'.

create table public.user_stats (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null
                   references public.profiles (id) on delete cascade,
  period_type    period_type not null,
  period_key     text        not null,
  focus_minutes  integer     not null default 0,
  session_count  integer     not null default 0,
  updated_at     timestamptz not null default now(),

  unique (user_id, period_type, period_key)
);

comment on table public.user_stats is
  'Per-user-per-period totals. Powers leaderboard ranking with one index scan.';


-- ----------------------------------------------------------------------------
-- 3.9  follows
-- ----------------------------------------------------------------------------
-- Social graph for the friends leaderboard. Self-referential many-to-many on
-- profiles. UNIQUE prevents duplicate follows; CHECK prevents self-follows.

create table public.follows (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null
                  references public.profiles (id) on delete cascade,
  following_id  uuid not null
                  references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),

  unique (follower_id, following_id),
  check  (follower_id <> following_id)
);

comment on table public.follows is
  'Directional follow graph for the friends leaderboard.';


-- ----------------------------------------------------------------------------
-- 3.10  subscriptions
-- ----------------------------------------------------------------------------
-- Full Stripe subscription audit trail. profiles.plan holds the fast-read
-- current state; this table holds the complete lifecycle. current_period_end
-- is the column that governs access-after-cancellation. Money is stored as
-- integer cents to avoid float rounding.

create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null
                            references public.profiles (id) on delete cascade,

  stripe_subscription_id  text        not null unique,
  stripe_customer_id      text        not null,

  plan                    plan_type            not null,
  plan_interval           plan_interval_type   not null,
  status                  subscription_status_type not null,

  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean     not null default false,
  canceled_at             timestamptz,

  amount_cents            integer     not null,
  currency                text        not null default 'usd',

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.subscriptions is
  'Stripe subscription lifecycle. current_period_end governs post-cancel access.';


-- ============================================================================
-- 4. INDEXES
-- ============================================================================
-- Primary keys and UNIQUE constraints are indexed automatically. The indexes
-- below target the specific read patterns the app actually runs.

-- profiles: all-time leaderboard (public users, ranked by minutes)
create index idx_profiles_leaderboard
  on public.profiles (is_public, total_focus_minutes desc);

-- projects: list views by each sort mode
create index idx_projects_user_active_sort
  on public.projects (user_id, is_archived, sort_order);
create index idx_projects_user_active_lastused
  on public.projects (user_id, is_archived, last_used_at desc);

-- tasks: kanban column query and list query
create index idx_tasks_kanban
  on public.tasks (project_id, status, kanban_order);
create index idx_tasks_list
  on public.tasks (project_id, list_order);
create index idx_tasks_user_status
  on public.tasks (user_id, status);

-- sessions: analytics + log reads (most-read table)
create index idx_sessions_user_type_started
  on public.sessions (user_id, type, started_at desc);
create index idx_sessions_user_started
  on public.sessions (user_id, started_at desc);
create index idx_sessions_project
  on public.sessions (project_id, started_at desc);
create index idx_sessions_task
  on public.sessions (task_id);

-- daily_summaries: per-user date-range (heatmaps)
create index idx_daily_summaries_user_date
  on public.daily_summaries (user_id, date desc);

-- user_stats: leaderboard ranking for a given period
create index idx_user_stats_period_rank
  on public.user_stats (period_type, period_key, focus_minutes desc);

-- follows: "who do I follow" lookups
create index idx_follows_follower
  on public.follows (follower_id);
create index idx_follows_following
  on public.follows (following_id);

-- subscriptions: find a user's subscriptions
create index idx_subscriptions_user
  on public.subscriptions (user_id);


-- ============================================================================
-- 5. updated_at TRIGGER
-- ============================================================================
-- One reusable function bumps updated_at to now() on every UPDATE, attached to
-- each table that has the column. Keeps "last modified" accurate without app code.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated         before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_user_preferences_updated before update on public.user_preferences
  for each row execute function public.set_updated_at();
create trigger trg_goals_updated            before update on public.goals
  for each row execute function public.set_updated_at();
create trigger trg_projects_updated         before update on public.projects
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated            before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger trg_sessions_updated         before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger trg_daily_summaries_updated  before update on public.daily_summaries
  for each row execute function public.set_updated_at();
create trigger trg_user_stats_updated       before update on public.user_stats
  for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated    before update on public.subscriptions
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 6. NEW-USER BOOTSTRAP
-- ============================================================================
-- When Supabase Auth inserts a new auth.users row, this trigger creates the
-- matching profiles row plus default user_preferences and goals — so a user is
-- never left without the supporting rows the app expects.
--
-- display_name / avatar are read from the OAuth/signup metadata when present,
-- with sensible fallbacks. profile_slug is seeded from the email local-part and
-- suffixed with a short random token to guarantee uniqueness; the user can edit
-- it later. SECURITY DEFINER lets the trigger write to public tables during the
-- auth insert.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_slug         text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  v_slug := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'gi'))
            || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.profiles (id, display_name, avatar_url, profile_slug)
  values (
    new.id,
    v_display_name,
    new.raw_user_meta_data ->> 'avatar_url',
    v_slug
  );

  insert into public.user_preferences (user_id) values (new.id);
  insert into public.goals (user_id)            values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
-- RLS is OFF by default in Postgres but Supabase exposes tables over the API,
-- so we MUST enable it and add policies or the tables are inaccessible (good)
-- — and without correct policies, either everything leaks or nothing works.
--
-- Model:
--   * Users read/write only their own rows (user_id = auth.uid()).
--   * profiles and user_stats additionally allow SELECT of PUBLIC users'
--     rows, which is what powers the leaderboard and public profile pages.
--   * subscriptions is writable only by the backend (service role bypasses RLS),
--     so we expose read-of-own only here.

-- enable RLS on every table
alter table public.profiles         enable row level security;
alter table public.user_preferences enable row level security;
alter table public.goals            enable row level security;
alter table public.projects         enable row level security;
alter table public.tasks            enable row level security;
alter table public.sessions         enable row level security;
alter table public.daily_summaries  enable row level security;
alter table public.user_stats       enable row level security;
alter table public.follows          enable row level security;
alter table public.subscriptions    enable row level security;


-- ---- profiles ----
-- Read your own row, or any row belonging to a public user.
create policy "profiles: read own or public"
  on public.profiles for select
  using ( id = auth.uid() or is_public = true );

create policy "profiles: update own"
  on public.profiles for update
  using ( id = auth.uid() )
  with check ( id = auth.uid() );
-- NOTE: INSERT is handled by the SECURITY DEFINER signup trigger, not clients.


-- ---- user_preferences ----
create policy "preferences: read own"
  on public.user_preferences for select
  using ( user_id = auth.uid() );
create policy "preferences: update own"
  on public.user_preferences for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );


-- ---- goals ----
create policy "goals: read own"
  on public.goals for select using ( user_id = auth.uid() );
create policy "goals: update own"
  on public.goals for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );


-- ---- projects ----
create policy "projects: read own"
  on public.projects for select using ( user_id = auth.uid() );
create policy "projects: insert own"
  on public.projects for insert with check ( user_id = auth.uid() );
create policy "projects: update own"
  on public.projects for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
create policy "projects: delete own"
  on public.projects for delete using ( user_id = auth.uid() );


-- ---- tasks ----
create policy "tasks: read own"
  on public.tasks for select using ( user_id = auth.uid() );
create policy "tasks: insert own"
  on public.tasks for insert with check ( user_id = auth.uid() );
create policy "tasks: update own"
  on public.tasks for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
create policy "tasks: delete own"
  on public.tasks for delete using ( user_id = auth.uid() );


-- ---- sessions ----
create policy "sessions: read own"
  on public.sessions for select using ( user_id = auth.uid() );
create policy "sessions: insert own"
  on public.sessions for insert with check ( user_id = auth.uid() );
create policy "sessions: update own"
  on public.sessions for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
create policy "sessions: delete own"
  on public.sessions for delete using ( user_id = auth.uid() );


-- ---- daily_summaries ----
-- Typically written by the backend (service role) on session save, but we allow
-- the owner to read their own rows. The free-plan 7-day window is applied in the
-- API query, not here.
create policy "daily_summaries: read own"
  on public.daily_summaries for select using ( user_id = auth.uid() );


-- ---- user_stats ----
-- Read your own rows, or any public user's rows (needed for the leaderboard).
create policy "user_stats: read own or public"
  on public.user_stats for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = user_stats.user_id and p.is_public = true
    )
  );


-- ---- follows ----
-- See follows you created, plus rows where the followed user is public.
create policy "follows: read own or public-target"
  on public.follows for select
  using (
    follower_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = follows.following_id and p.is_public = true
    )
  );
create policy "follows: insert own"
  on public.follows for insert with check ( follower_id = auth.uid() );
create policy "follows: delete own"
  on public.follows for delete using ( follower_id = auth.uid() );


-- ---- subscriptions ----
-- Read-of-own only. All writes come from the Stripe webhook handler running with
-- the service role key, which bypasses RLS entirely.
create policy "subscriptions: read own"
  on public.subscriptions for select using ( user_id = auth.uid() );


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
