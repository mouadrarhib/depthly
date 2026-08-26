-- Server-authoritative profile updates, plan limits, analytics access, CSV
-- export, and global leaderboard eligibility. This migration is deliberately
-- backwards-compatible with the current client; direct grants are removed in
-- 022 after the client has moved to these RPCs.

-- --------------------------------------------------------------------------
-- Profile updates: only explicitly-listed user-facing fields are writable.
-- --------------------------------------------------------------------------

create or replace function public.update_my_profile(p_patch jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_unknown_key text;
  v_display_name text;
  v_slug text;
  v_avatar_url text;
  v_is_public boolean;
  v_show_heatmap boolean;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception using message = 'PROFILE_PATCH_INVALID', errcode = 'P0001';
  end if;

  select key into v_unknown_key
  from jsonb_object_keys(p_patch) as keys(key)
  where key <> all(array[
    'display_name', 'avatar_url', 'profile_slug', 'is_public',
    'show_heatmap_on_profile'
  ])
  limit 1;

  if v_unknown_key is not null then
    raise exception using
      message = 'PROFILE_FIELD_NOT_ALLOWED',
      detail = v_unknown_key,
      errcode = 'P0001';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.id is null then
    raise exception using message = 'PROFILE_NOT_FOUND', errcode = 'P0001';
  end if;

  if p_patch ? 'display_name' then
    if jsonb_typeof(p_patch -> 'display_name') <> 'string' then
      raise exception using message = 'DISPLAY_NAME_INVALID', errcode = 'P0001';
    end if;
    v_display_name := trim(p_patch ->> 'display_name');
    if char_length(v_display_name) not between 1 and 80 then
      raise exception using message = 'DISPLAY_NAME_INVALID', errcode = 'P0001';
    end if;
  else
    v_display_name := v_profile.display_name;
  end if;

  if p_patch ? 'profile_slug' then
    if jsonb_typeof(p_patch -> 'profile_slug') <> 'string' then
      raise exception using message = 'PROFILE_SLUG_INVALID', errcode = 'P0001';
    end if;
    v_slug := lower(trim(p_patch ->> 'profile_slug'));
    if char_length(v_slug) not between 3 and 50
      or v_slug !~ '^[a-z0-9-]+$'
    then
      raise exception using message = 'PROFILE_SLUG_INVALID', errcode = 'P0001';
    end if;
  else
    v_slug := v_profile.profile_slug;
  end if;

  if p_patch ? 'avatar_url' then
    if jsonb_typeof(p_patch -> 'avatar_url') = 'null' then
      v_avatar_url := null;
    elsif jsonb_typeof(p_patch -> 'avatar_url') = 'string' then
      v_avatar_url := nullif(trim(p_patch ->> 'avatar_url'), '');
      if v_avatar_url is not null and char_length(v_avatar_url) > 2048 then
        raise exception using message = 'AVATAR_URL_INVALID', errcode = 'P0001';
      end if;
    else
      raise exception using message = 'AVATAR_URL_INVALID', errcode = 'P0001';
    end if;
  else
    v_avatar_url := v_profile.avatar_url;
  end if;

  if p_patch ? 'is_public' then
    if jsonb_typeof(p_patch -> 'is_public') <> 'boolean' then
      raise exception using message = 'PUBLIC_PROFILE_VALUE_INVALID', errcode = 'P0001';
    end if;
    v_is_public := (p_patch ->> 'is_public')::boolean;
    if v_is_public
      and v_profile.plan not in ('pro', 'founding')
      and not v_profile.is_seed_account
    then
      raise exception using message = 'PLAN_REQUIRED', detail = 'public_profile', errcode = 'P0001';
    end if;
  else
    v_is_public := v_profile.is_public;
  end if;

  if p_patch ? 'show_heatmap_on_profile' then
    if jsonb_typeof(p_patch -> 'show_heatmap_on_profile') <> 'boolean' then
      raise exception using message = 'HEATMAP_VALUE_INVALID', errcode = 'P0001';
    end if;
    v_show_heatmap := (p_patch ->> 'show_heatmap_on_profile')::boolean;
  else
    v_show_heatmap := v_profile.show_heatmap_on_profile;
  end if;

  if not v_is_public then
    if p_patch ? 'show_heatmap_on_profile' and v_show_heatmap then
      raise exception using message = 'PUBLIC_PROFILE_REQUIRED', errcode = 'P0001';
    end if;
    v_show_heatmap := false;
  end if;

  update public.profiles
  set display_name = v_display_name,
      avatar_url = v_avatar_url,
      profile_slug = v_slug,
      is_public = v_is_public,
      show_heatmap_on_profile = case when v_is_public then v_show_heatmap else false end
  where id = auth.uid()
  returning * into v_profile;

  return v_profile;
exception
  when unique_violation then
    raise exception using message = 'PROFILE_SLUG_TAKEN', errcode = 'P0001';
end;
$$;

create or replace function public.is_profile_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and not exists(
      select 1 from public.profiles
      where profile_slug = lower(trim(p_slug))
        and id <> auth.uid()
    );
$$;

-- --------------------------------------------------------------------------
-- Projects: serialize active-project creation and unarchiving per user.
-- --------------------------------------------------------------------------

create or replace function public.create_project(
  p_name text,
  p_color text,
  p_icon text default null
)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plan_type;
  v_project public.projects;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;
  if char_length(trim(p_name)) not between 1 and 50 then
    raise exception using message = 'PROJECT_NAME_INVALID', errcode = 'P0001';
  end if;
  if p_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception using message = 'PROJECT_COLOR_INVALID', errcode = 'P0001';
  end if;
  if p_icon is not null and char_length(p_icon) > 16 then
    raise exception using message = 'PROJECT_ICON_INVALID', errcode = 'P0001';
  end if;

  select plan into v_plan
  from public.profiles
  where id = auth.uid()
  for update;

  if v_plan is null then
    raise exception using message = 'PROFILE_NOT_FOUND', errcode = 'P0001';
  end if;
  if v_plan = 'free' and (
    select count(*) from public.projects
    where user_id = auth.uid() and is_archived = false
  ) >= 3 then
    raise exception using message = 'PROJECT_LIMIT_REACHED', detail = '3', errcode = 'P0001';
  end if;

  insert into public.projects(user_id, name, color, icon)
  values(auth.uid(), trim(p_name), p_color, p_icon)
  returning * into v_project;
  return v_project;
end;
$$;

create or replace function public.set_project_archived(
  p_project_id uuid,
  p_archived boolean
)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plan_type;
  v_project public.projects;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;

  select plan into v_plan
  from public.profiles
  where id = auth.uid()
  for update;

  select * into v_project
  from public.projects
  where id = p_project_id and user_id = auth.uid()
  for update;

  if v_project.id is null then
    raise exception using message = 'PROJECT_NOT_FOUND', errcode = 'P0001';
  end if;
  if v_project.is_archived = p_archived then
    return v_project;
  end if;

  if not p_archived and v_plan = 'free' and (
    select count(*) from public.projects
    where user_id = auth.uid() and is_archived = false
  ) >= 3 then
    raise exception using message = 'PROJECT_LIMIT_REACHED', detail = '3', errcode = 'P0001';
  end if;

  update public.projects
  set is_archived = p_archived
  where id = p_project_id
  returning * into v_project;
  return v_project;
end;
$$;

-- --------------------------------------------------------------------------
-- Focus-session limit: checked at start. An accepted run is grandfathered
-- through finish, so a downgrade or month-boundary race cannot lose work.
-- --------------------------------------------------------------------------

create or replace function public.start_timer_run(
  p_type public.session_type,
  p_timer_mode public.timer_mode_type,
  p_target_seconds integer,
  p_timezone text,
  p_project_id uuid default null,
  p_task_id uuid default null,
  p_title text default null,
  p_notes text default null
)
returns public.active_timer_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.active_timer_runs;
  v_plan public.plan_type;
  v_local_today date;
  v_month_start date;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using message = 'TIMEZONE_INVALID', errcode = 'P0001';
  end if;
  if p_timer_mode = 'pomodoro'
    and (p_target_seconds is null or p_target_seconds not between 60 and 14400)
  then
    raise exception using message = 'TIMER_TARGET_INVALID', errcode = 'P0001';
  end if;
  if p_timer_mode = 'free' then p_target_seconds := null; end if;
  if p_project_id is not null and not exists(
    select 1 from public.projects where id = p_project_id and user_id = auth.uid()
  ) then
    raise exception using message = 'PROJECT_INVALID', errcode = 'P0001';
  end if;
  if p_task_id is not null and not exists(
    select 1 from public.tasks
    where id = p_task_id and user_id = auth.uid()
      and (p_project_id is null or project_id = p_project_id)
  ) then
    raise exception using message = 'TASK_INVALID', errcode = 'P0001';
  end if;

  select plan into v_plan
  from public.profiles
  where id = auth.uid()
  for update;

  if v_plan is null then
    raise exception using message = 'PROFILE_NOT_FOUND', errcode = 'P0001';
  end if;

  if p_type = 'focus' and v_plan = 'free' then
    v_local_today := (now() at time zone p_timezone)::date;
    v_month_start := date_trunc('month', v_local_today)::date;
    if (
      select count(*)
      from public.sessions
      where user_id = auth.uid()
        and type = 'focus'
        and coalesce(local_date, (started_at at time zone p_timezone)::date)
          between v_month_start and (v_month_start + interval '1 month - 1 day')::date
    ) >= 50 then
      raise exception using message = 'SESSION_LIMIT_REACHED', detail = '50', errcode = 'P0001';
    end if;
  end if;

  insert into public.active_timer_runs(
    user_id, type, timer_mode, target_seconds, status, segment_started_at,
    timezone, project_id, task_id, title, notes
  ) values (
    auth.uid(), p_type, p_timer_mode, p_target_seconds, 'running', now(),
    p_timezone, p_project_id, p_task_id, nullif(trim(p_title), ''),
    nullif(trim(p_notes), '')
  ) returning * into v_run;
  return v_run;
exception
  when unique_violation then
    raise exception using message = 'ACTIVE_TIMER_EXISTS', errcode = 'P0001';
end;
$$;

create or replace function public.get_monthly_focus_session_count(p_timezone text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month_start date;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using message = 'TIMEZONE_INVALID', errcode = 'P0001';
  end if;
  v_month_start := date_trunc('month', (now() at time zone p_timezone)::date)::date;
  return (
    select count(*)::integer
    from public.sessions
    where user_id = auth.uid()
      and type = 'focus'
      and coalesce(local_date, (started_at at time zone p_timezone)::date)
        between v_month_start and (v_month_start + interval '1 month - 1 day')::date
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Analytics: Free accounts receive at most the current local day plus the
-- preceding six days. Raw session history remains available in Sessions.
-- --------------------------------------------------------------------------

create or replace function public.get_analytics_daily_summaries(
  p_start_date date,
  p_end_date date,
  p_timezone text
)
returns setof public.daily_summaries
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.plan_type;
  v_effective_start date;
  v_cutoff date;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;
  if p_start_date > p_end_date then
    raise exception using message = 'DATE_RANGE_INVALID', errcode = 'P0001';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using message = 'TIMEZONE_INVALID', errcode = 'P0001';
  end if;
  select plan into v_plan from public.profiles where id = auth.uid();
  v_cutoff := ((now() at time zone p_timezone)::date - 6);
  v_effective_start := case when v_plan = 'free' then greatest(p_start_date, v_cutoff) else p_start_date end;

  return query
  select summaries.*
  from public.daily_summaries as summaries
  where summaries.user_id = auth.uid()
    and summaries.date between v_effective_start and p_end_date
  order by summaries.date;
end;
$$;

create or replace function public.get_analytics_sessions(
  p_start_date date default null,
  p_end_date date default null,
  p_project_id uuid default null,
  p_project_filter_mode text default 'all',
  p_timezone text default 'UTC'
)
returns table(
  id uuid,
  user_id uuid,
  project_id uuid,
  task_id uuid,
  type public.session_type,
  duration_mins integer,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  is_manual boolean,
  timer_mode public.timer_mode_type,
  created_at timestamptz,
  updated_at timestamptz,
  title text,
  local_date date,
  is_trusted boolean,
  excluded_at timestamptz,
  excluded_reason text,
  project_name text,
  project_color text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.plan_type;
  v_cutoff date;
  v_effective_start date;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;
  if p_start_date is not null and p_end_date is not null and p_start_date > p_end_date then
    raise exception using message = 'DATE_RANGE_INVALID', errcode = 'P0001';
  end if;
  if p_project_filter_mode not in ('all', 'assigned', 'unassigned') then
    raise exception using message = 'PROJECT_FILTER_INVALID', errcode = 'P0001';
  end if;
  if p_project_filter_mode = 'assigned' and (
    p_project_id is null or not exists(
      select 1 from public.projects where public.projects.id = p_project_id and public.projects.user_id = auth.uid()
    )
  ) then
    raise exception using message = 'PROJECT_INVALID', errcode = 'P0001';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using message = 'TIMEZONE_INVALID', errcode = 'P0001';
  end if;

  select plan into v_plan from public.profiles where public.profiles.id = auth.uid();
  v_cutoff := ((now() at time zone p_timezone)::date - 6);
  v_effective_start := case
    when v_plan = 'free' then greatest(coalesce(p_start_date, v_cutoff), v_cutoff)
    else p_start_date
  end;

  return query
  select s.id, s.user_id, s.project_id, s.task_id, s.type, s.duration_mins,
    s.started_at, s.ended_at, s.notes, s.is_manual, s.timer_mode, s.created_at,
    s.updated_at, s.title, s.local_date, s.is_trusted, s.excluded_at,
    s.excluded_reason, p.name, p.color
  from public.sessions as s
  left join public.projects as p on p.id = s.project_id
  where s.user_id = auth.uid()
    and s.type = 'focus'
    and (v_effective_start is null or coalesce(s.local_date, (s.started_at at time zone p_timezone)::date) >= v_effective_start)
    and (p_end_date is null or coalesce(s.local_date, (s.started_at at time zone p_timezone)::date) <= p_end_date)
    and (
      p_project_filter_mode = 'all'
      or (p_project_filter_mode = 'unassigned' and s.project_id is null)
      or (p_project_filter_mode = 'assigned' and s.project_id = p_project_id)
    )
  order by s.started_at;
end;
$$;

-- --------------------------------------------------------------------------
-- CSV export: paid-only, stable and bounded pagination.
-- --------------------------------------------------------------------------

create or replace function public.export_my_sessions(
  p_start_date date default null,
  p_end_date date default null,
  p_project_id uuid default null,
  p_include_breaks boolean default false,
  p_offset integer default 0,
  p_limit integer default 500,
  p_timezone text default 'UTC'
)
returns table(
  id uuid,
  user_id uuid,
  project_id uuid,
  task_id uuid,
  type public.session_type,
  duration_mins integer,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  is_manual boolean,
  timer_mode public.timer_mode_type,
  created_at timestamptz,
  updated_at timestamptz,
  title text,
  local_date date,
  is_trusted boolean,
  excluded_at timestamptz,
  excluded_reason text,
  project_name text,
  project_color text,
  task_title text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.plan_type;
begin
  if auth.uid() is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED', errcode = 'P0001';
  end if;
  select plan into v_plan from public.profiles where public.profiles.id = auth.uid();
  if v_plan not in ('pro', 'founding') then
    raise exception using message = 'PLAN_REQUIRED', detail = 'csv_export', errcode = 'P0001';
  end if;
  if p_start_date is not null and p_end_date is not null and p_start_date > p_end_date then
    raise exception using message = 'DATE_RANGE_INVALID', errcode = 'P0001';
  end if;
  if p_offset < 0 or p_limit not between 1 and 500 then
    raise exception using message = 'PAGINATION_INVALID', errcode = 'P0001';
  end if;
  if p_project_id is not null and not exists(
    select 1 from public.projects where public.projects.id = p_project_id and public.projects.user_id = auth.uid()
  ) then
    raise exception using message = 'PROJECT_INVALID', errcode = 'P0001';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using message = 'TIMEZONE_INVALID', errcode = 'P0001';
  end if;

  return query
  select s.id, s.user_id, s.project_id, s.task_id, s.type, s.duration_mins,
    s.started_at, s.ended_at, s.notes, s.is_manual, s.timer_mode, s.created_at,
    s.updated_at, s.title, s.local_date, s.is_trusted, s.excluded_at,
    s.excluded_reason, p.name, p.color, t.title
  from public.sessions as s
  left join public.projects as p on p.id = s.project_id
  left join public.tasks as t on t.id = s.task_id
  where s.user_id = auth.uid()
    and (p_include_breaks or s.type = 'focus')
    and (p_start_date is null or coalesce(s.local_date, (s.started_at at time zone p_timezone)::date) >= p_start_date)
    and (p_end_date is null or coalesce(s.local_date, (s.started_at at time zone p_timezone)::date) <= p_end_date)
    and (p_project_id is null or s.project_id = p_project_id)
  order by s.started_at desc, s.id desc
  offset p_offset
  limit p_limit;
end;
$$;

-- --------------------------------------------------------------------------
-- Global discovery: Free users keep stored preferences and friend/group
-- access, but only paid/founding or seed profiles are globally discoverable.
-- --------------------------------------------------------------------------

create or replace view public.public_profiles as
select id, display_name, avatar_url, profile_slug, is_public, current_streak, longest_streak,
  total_focus_minutes, total_sessions, member_since, last_focus_date, show_heatmap_on_profile,
  trusted_focus_minutes, trusted_sessions, trusted_current_streak, trusted_longest_streak,
  trusted_last_focus_date
from public.profiles
where id = auth.uid()
  or public.is_connected_via_follows(auth.uid(), id)
  or (is_public = true and (plan in ('pro', 'founding') or is_seed_account = true));

grant select on public.public_profiles to anon, authenticated;

create or replace function public.get_global_leaderboard(
  p_period_type public.period_type default null,
  p_period_key text default null,
  p_limit integer default 50
)
returns table(
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  profile_slug text,
  focus_minutes integer,
  session_count integer,
  current_streak integer,
  last_focus_date date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 100 then
    raise exception using message = 'LEADERBOARD_LIMIT_INVALID', errcode = 'P0001';
  end if;
  if (p_period_type is null) <> (p_period_key is null) then
    raise exception using message = 'LEADERBOARD_PERIOD_INVALID', errcode = 'P0001';
  end if;

  if p_period_type is null then
    return query
    select row_number() over(order by p.trusted_focus_minutes desc, p.id),
      p.id, p.display_name, p.avatar_url, p.profile_slug,
      p.trusted_focus_minutes, p.trusted_sessions, p.current_streak,
      p.last_focus_date
    from public.profiles as p
    where p.is_public = true
      and (p.plan in ('pro', 'founding') or p.is_seed_account = true)
    order by p.trusted_focus_minutes desc, p.id
    limit p_limit;
  else
    return query
    select row_number() over(order by s.trusted_focus_minutes desc, s.user_id),
      p.id, p.display_name, p.avatar_url, p.profile_slug,
      s.trusted_focus_minutes, s.trusted_session_count, p.current_streak,
      p.last_focus_date
    from public.user_stats as s
    join public.profiles as p on p.id = s.user_id
    where s.period_type = p_period_type
      and s.period_key = p_period_key
      and p.is_public = true
      and (p.plan in ('pro', 'founding') or p.is_seed_account = true)
    order by s.trusted_focus_minutes desc, s.user_id
    limit p_limit;
  end if;
end;
$$;

create or replace function public.get_my_global_leaderboard_rank(
  p_period_type public.period_type,
  p_period_key text
)
returns table(rank bigint, focus_minutes integer)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select s.user_id, s.trusted_focus_minutes
    from public.user_stats s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
      and s.period_type = p_period_type
      and s.period_key = p_period_key
      and p.is_public = true
      and (p.plan in ('pro', 'founding') or p.is_seed_account = true)
  )
  select 1 + count(other.user_id)::bigint, me.trusted_focus_minutes
  from me
  left join public.user_stats other
    on other.period_type = p_period_type
   and other.period_key = p_period_key
   and other.trusted_focus_minutes > me.trusted_focus_minutes
   and exists(
     select 1 from public.profiles p
     where p.id = other.user_id
       and p.is_public = true
       and (p.plan in ('pro', 'founding') or p.is_seed_account = true)
   )
  group by me.trusted_focus_minutes;
$$;

create or replace function public.get_global_streak_leaderboard(
  p_mode text,
  p_limit integer default 50
)
returns table(
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  profile_slug text,
  current_streak integer,
  longest_streak integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_mode not in ('current_streak', 'best_streak') then
    raise exception using message = 'STREAK_MODE_INVALID', errcode = 'P0001';
  end if;
  if p_limit not between 1 and 100 then
    raise exception using message = 'LEADERBOARD_LIMIT_INVALID', errcode = 'P0001';
  end if;

  return query
  with eligible as (
    select p.id, p.display_name, p.avatar_url, p.profile_slug,
      case when p.trusted_last_focus_date >= current_date - 1
        then p.trusted_current_streak else 0 end as effective_current_streak,
      p.trusted_longest_streak
    from public.profiles p
    where p.is_public = true
      and (p.plan in ('pro', 'founding') or p.is_seed_account = true)
  ), ranked as (
    select e.*,
      case when p_mode = 'current_streak'
        then e.effective_current_streak else e.trusted_longest_streak end as score
    from eligible e
  )
  select row_number() over(order by r.score desc, r.id), r.id,
    r.display_name, r.avatar_url, r.profile_slug,
    r.effective_current_streak, r.trusted_longest_streak
  from ranked r
  where r.score > 0
  order by r.score desc, r.id
  limit p_limit;
end;
$$;

-- Explicit function grants. Supabase grants new functions to PUBLIC by
-- default, so every authenticated-only entry point is revoked first.
revoke execute on function public.update_my_profile(jsonb) from public, anon;
revoke execute on function public.is_profile_slug_available(text) from public, anon;
revoke execute on function public.create_project(text,text,text) from public, anon;
revoke execute on function public.set_project_archived(uuid,boolean) from public, anon;
revoke execute on function public.start_timer_run(public.session_type,public.timer_mode_type,integer,text,uuid,uuid,text,text) from public, anon;
revoke execute on function public.get_monthly_focus_session_count(text) from public, anon;
revoke execute on function public.get_analytics_daily_summaries(date,date,text) from public, anon;
revoke execute on function public.get_analytics_sessions(date,date,uuid,text,text) from public, anon;
revoke execute on function public.export_my_sessions(date,date,uuid,boolean,integer,integer,text) from public, anon;
revoke execute on function public.get_my_global_leaderboard_rank(public.period_type,text) from public, anon;
revoke execute on function public.get_global_leaderboard(public.period_type,text,integer) from public;
revoke execute on function public.get_global_streak_leaderboard(text,integer) from public;

grant execute on function public.update_my_profile(jsonb) to authenticated;
grant execute on function public.is_profile_slug_available(text) to authenticated;
grant execute on function public.create_project(text,text,text) to authenticated;
grant execute on function public.set_project_archived(uuid,boolean) to authenticated;
grant execute on function public.start_timer_run(public.session_type,public.timer_mode_type,integer,text,uuid,uuid,text,text) to authenticated;
grant execute on function public.get_monthly_focus_session_count(text) to authenticated;
grant execute on function public.get_analytics_daily_summaries(date,date,text) to authenticated;
grant execute on function public.get_analytics_sessions(date,date,uuid,text,text) to authenticated;
grant execute on function public.export_my_sessions(date,date,uuid,boolean,integer,integer,text) to authenticated;
grant execute on function public.get_my_global_leaderboard_rank(public.period_type,text) to authenticated;
grant execute on function public.get_global_leaderboard(public.period_type,text,integer) to anon, authenticated;
grant execute on function public.get_global_streak_leaderboard(text,integer) to anon, authenticated;

comment on function public.update_my_profile(jsonb) is
  'Authenticated profile patch API. Rejects every billing, statistic, trust, identity, and system field.';
comment on function public.get_analytics_sessions(date,date,uuid,text,text) is
  'Plan-aware analytics session source. Free results are clamped to the latest seven local calendar days.';
comment on function public.export_my_sessions(date,date,uuid,boolean,integer,integer,text) is
  'Paid-only, bounded session export source. Raw session history remains owner-readable separately.';
