-- Give every weekly private leaderboard a full seven-day round from the
-- moment it was created. Daily and monthly groups keep their calendar-based
-- boundaries. Calculating in the creator's local timezone preserves the same
-- local reset time when a timezone enters or leaves daylight saving time.

create or replace function public.group_period_bounds(
  p_period public.period_type,
  p_timezone text,
  p_anchor timestamptz,
  p_at timestamptz default now()
) returns table(period_key text, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_local timestamp;
  v_anchor_local timestamp;
  v_start timestamp;
  v_week_index integer;
begin
  if not exists(select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid timezone';
  end if;

  v_local := p_at at time zone p_timezone;
  if p_period = 'daily' then
    v_start := date_trunc('day', v_local);
    period_key := to_char(v_start, 'YYYY-MM-DD');
    ends_at := (v_start + interval '1 day') at time zone p_timezone;
  elsif p_period = 'weekly' then
    if p_anchor is null then raise exception 'Weekly groups require a creation anchor'; end if;
    v_anchor_local := p_anchor at time zone p_timezone;
    v_week_index := floor(extract(epoch from (v_local - v_anchor_local)) / 604800)::integer;
    v_start := v_anchor_local + make_interval(days => v_week_index * 7);
    period_key := to_char(v_start, 'IYYY') || '-W' || to_char(v_start, 'IW');
    ends_at := (v_start + interval '1 week') at time zone p_timezone;
  elsif p_period = 'monthly' then
    v_start := date_trunc('month', v_local);
    period_key := to_char(v_start, 'YYYY-MM');
    ends_at := (v_start + interval '1 month') at time zone p_timezone;
  else
    raise exception 'Group leaderboards support daily, weekly, or monthly periods';
  end if;

  starts_at := v_start at time zone p_timezone;
  return next;
end;
$$;

revoke execute on function public.group_period_bounds(
  public.period_type, text, timestamptz, timestamptz
) from public, anon, authenticated;

create or replace function public.list_my_group_leaderboards()
returns table(
  id uuid, name text, period_type public.period_type, goal_minutes integer, timezone text,
  invite_code text, status text, owner_id uuid, role text, member_count integer,
  closed_period_key text, closed_at timestamptz, created_at timestamptz,
  current_period_key text, period_ends_at timestamptz
) language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.period_type, g.goal_minutes, g.timezone, g.invite_code, g.status,
    g.owner_id, mine.role,
    (select count(*)::integer from public.group_leaderboard_members m where m.leaderboard_id = g.id and m.status = 'active'),
    g.closed_period_key, g.closed_at, g.created_at,
    case when g.status = 'active' then bounds.period_key else g.closed_period_key end,
    case when g.status = 'active' then bounds.ends_at else null end
  from public.group_leaderboards g
  join public.group_leaderboard_members mine on mine.leaderboard_id = g.id
  left join lateral public.group_period_bounds(g.period_type, g.timezone, g.created_at, now()) bounds
    on g.status = 'active'
  where mine.user_id = auth.uid() and mine.status = 'active'
  order by (g.status = 'active') desc, g.created_at desc;
$$;

create or replace function public.get_group_leaderboard_ranking(p_leaderboard_id uuid)
returns table(
  rank bigint, user_id uuid, display_name text, avatar_url text, role text,
  focus_minutes integer, session_count integer, joined_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare
  v_group public.group_leaderboards;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not exists(select 1 from public.group_leaderboard_members membership where membership.leaderboard_id = p_leaderboard_id and membership.user_id = auth.uid() and membership.status = 'active') then
    raise exception 'Leaderboard not found';
  end if;
  select * into v_group from public.group_leaderboards where id = p_leaderboard_id;

  if v_group.status = 'active' then
    select starts_at, ends_at into v_start, v_end
      from public.group_period_bounds(v_group.period_type, v_group.timezone, v_group.created_at, now());
    return query
      with scores as (
        select m.user_id, p.display_name, p.avatar_url, m.role, m.joined_at,
          coalesce(sum(s.duration_mins), 0)::integer as mins,
          count(s.id)::integer as sessions
        from public.group_leaderboard_members m
        join public.profiles p on p.id = m.user_id
        left join public.sessions s on s.user_id = m.user_id and s.type = 'focus'
          and s.is_trusted = true and s.excluded_at is null
          and s.ended_at >= greatest(v_start, m.joined_at) and s.ended_at < v_end
        where m.leaderboard_id = p_leaderboard_id and m.status = 'active'
        group by m.user_id, p.display_name, p.avatar_url, m.role, m.joined_at
      )
      select rank() over(order by scores.mins desc), scores.user_id, scores.display_name,
        scores.avatar_url, scores.role, scores.mins, scores.sessions, scores.joined_at
      from scores order by scores.mins desc, scores.joined_at, scores.user_id;
  else
    return query
      with scores as (
        select m.user_id, p.display_name, p.avatar_url, m.role, m.joined_at,
          coalesce(m.frozen_focus_minutes, 0) as mins,
          coalesce(m.frozen_session_count, 0) as sessions
        from public.group_leaderboard_members m
        join public.profiles p on p.id = m.user_id
        where m.leaderboard_id = p_leaderboard_id and m.status = 'active'
      )
      select rank() over(order by scores.mins desc), scores.user_id, scores.display_name,
        scores.avatar_url, scores.role, scores.mins, scores.sessions, scores.joined_at
      from scores order by scores.mins desc, scores.joined_at, scores.user_id;
  end if;
end;
$$;

create or replace function public.close_group_leaderboard(p_leaderboard_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_group public.group_leaderboards;
  v_key text;
  v_start timestamptz;
  v_end timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('group-capacity:' || p_leaderboard_id::text, 0));
  select * into v_group from public.group_leaderboards
    where id = p_leaderboard_id and owner_id = auth.uid() and status = 'active' for update;
  if v_group.id is null then raise exception 'Active leaderboard not found'; end if;
  select period_key, starts_at, ends_at into v_key, v_start, v_end
    from public.group_period_bounds(v_group.period_type, v_group.timezone, v_group.created_at, now());

  update public.group_leaderboard_members m set
    frozen_focus_minutes = coalesce((
      select sum(s.duration_mins)::integer from public.sessions s
      where s.user_id = m.user_id and s.type = 'focus' and s.is_trusted = true
        and s.excluded_at is null and s.ended_at >= greatest(v_start, m.joined_at) and s.ended_at < v_end
    ), 0),
    frozen_session_count = (
      select count(s.id)::integer from public.sessions s
      where s.user_id = m.user_id and s.type = 'focus' and s.is_trusted = true
        and s.excluded_at is null and s.ended_at >= greatest(v_start, m.joined_at) and s.ended_at < v_end
    ),
    updated_at = now()
  where m.leaderboard_id = v_group.id and m.status = 'active';

  update public.group_leaderboards set status = 'closed', closed_period_key = v_key,
    closed_at = now(), updated_at = now() where id = v_group.id;
end;
$$;

-- All callers now use the creation-aware overload.
drop function public.group_period_bounds(public.period_type, text, timestamptz);
