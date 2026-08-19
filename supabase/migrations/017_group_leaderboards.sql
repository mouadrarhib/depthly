-- Private group leaderboards backed exclusively by trusted timer sessions.
-- Apply after 016_active_timer_realtime.sql.

create table public.group_leaderboards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 3 and 60),
  period_type public.period_type not null check (period_type in ('daily', 'weekly', 'monthly')),
  goal_minutes integer check (goal_minutes is null or goal_minutes > 0),
  timezone text not null,
  invite_code text not null unique,
  status text not null default 'active' check (status in ('active', 'closed')),
  closed_period_key text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_leaderboard_members (
  id uuid primary key default gen_random_uuid(),
  leaderboard_id uuid not null references public.group_leaderboards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('creator', 'member')),
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  frozen_focus_minutes integer,
  frozen_session_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (leaderboard_id, user_id)
);

create index group_leaderboards_owner_status_idx
  on public.group_leaderboards(owner_id, status);
create index group_leaderboard_members_user_status_idx
  on public.group_leaderboard_members(user_id, status);
create index group_leaderboard_members_board_status_idx
  on public.group_leaderboard_members(leaderboard_id, status);
create index sessions_group_ranking_idx
  on public.sessions(user_id, ended_at)
  where type = 'focus' and is_trusted = true and excluded_at is null;

alter table public.group_leaderboards enable row level security;
alter table public.group_leaderboard_members enable row level security;
revoke all on public.group_leaderboards from anon, authenticated;
revoke all on public.group_leaderboard_members from anon, authenticated;

create or replace function public.group_period_bounds(
  p_period public.period_type,
  p_timezone text,
  p_at timestamptz default now()
) returns table(period_key text, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_local timestamp;
  v_start timestamp;
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
    v_start := date_trunc('week', v_local);
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

create or replace function public.create_group_leaderboard(
  p_name text,
  p_period_type public.period_type,
  p_goal_minutes integer,
  p_timezone text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_code text;
  v_plan public.plan_type;
  v_limit integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) not between 3 and 60 then raise exception 'Name must be 3 to 60 characters'; end if;
  if p_period_type not in ('daily', 'weekly', 'monthly') then raise exception 'Invalid leaderboard period'; end if;
  if p_goal_minutes is not null and p_goal_minutes <= 0 then raise exception 'Goal must be greater than zero'; end if;
  if not exists(select 1 from pg_timezone_names where name = p_timezone) then raise exception 'Invalid timezone'; end if;

  perform pg_advisory_xact_lock(hashtextextended('group-owner:' || auth.uid()::text, 0));
  select plan into v_plan from public.profiles where id = auth.uid();
  v_limit := case when v_plan in ('pro', 'founding') then 10 else 1 end;
  if (select count(*) from public.group_leaderboards where owner_id = auth.uid() and status = 'active') >= v_limit then
    raise exception 'Active group leaderboard limit reached';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));
    exit when not exists(select 1 from public.group_leaderboards where invite_code = v_code);
  end loop;

  insert into public.group_leaderboards(owner_id, name, period_type, goal_minutes, timezone, invite_code)
  values(auth.uid(), trim(p_name), p_period_type, p_goal_minutes, p_timezone, v_code)
  returning id into v_id;

  insert into public.group_leaderboard_members(leaderboard_id, user_id, role)
  values(v_id, auth.uid(), 'creator');
  return v_id;
end;
$$;

create or replace function public.preview_group_leaderboard_invite(p_invite_code text)
returns table(
  leaderboard_id uuid, name text, creator_name text, period_type public.period_type,
  goal_minutes integer, status text, member_count integer, member_limit integer
) language sql stable security definer set search_path = public as $$
  select g.id, g.name, p.display_name, g.period_type, g.goal_minutes, g.status,
    (select count(*)::integer from public.group_leaderboard_members m where m.leaderboard_id = g.id and m.status = 'active'),
    case when p.plan in ('pro', 'founding') then 100 else 15 end
  from public.group_leaderboards g
  join public.profiles p on p.id = g.owner_id
  where g.invite_code = upper(trim(p_invite_code));
$$;

create or replace function public.join_group_leaderboard(p_invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_group public.group_leaderboards;
  v_member public.group_leaderboard_members;
  v_limit integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_group from public.group_leaderboards
    where invite_code = upper(trim(p_invite_code));
  if v_group.id is null then raise exception 'Invite not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('group-capacity:' || v_group.id::text, 0));
  select g.* into v_group from public.group_leaderboards g where g.id = v_group.id for update;
  if v_group.status <> 'active' then raise exception 'This leaderboard is closed'; end if;

  select * into v_member from public.group_leaderboard_members
    where leaderboard_id = v_group.id and user_id = auth.uid() for update;
  if v_member.status = 'removed' then raise exception 'You were removed from this leaderboard'; end if;
  if v_member.status = 'active' then return v_group.id; end if;

  select case when p.plan in ('pro', 'founding') then 100 else 15 end into v_limit
    from public.profiles p where p.id = v_group.owner_id;
  if (select count(*) from public.group_leaderboard_members where leaderboard_id = v_group.id and status = 'active') >= v_limit then
    raise exception 'This leaderboard is full';
  end if;

  if v_member.id is null then
    insert into public.group_leaderboard_members(leaderboard_id, user_id)
    values(v_group.id, auth.uid());
  else
    update public.group_leaderboard_members set status = 'active', joined_at = now(), ended_at = null,
      frozen_focus_minutes = null, frozen_session_count = null, updated_at = now()
    where id = v_member.id;
  end if;
  return v_group.id;
end;
$$;

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
  left join lateral public.group_period_bounds(g.period_type, g.timezone, now()) bounds on g.status = 'active'
  where mine.user_id = auth.uid() and mine.status = 'active'
  order by (g.status = 'active') desc, g.created_at desc;
$$;

create or replace function public.get_group_leaderboard(p_leaderboard_id uuid)
returns table(
  id uuid, name text, period_type public.period_type, goal_minutes integer, timezone text,
  invite_code text, status text, owner_id uuid, role text, member_count integer,
  closed_period_key text, closed_at timestamptz, created_at timestamptz,
  current_period_key text, period_ends_at timestamptz
) language sql stable security definer set search_path = public as $$
  select mine.* from public.list_my_group_leaderboards() mine where mine.id = p_leaderboard_id;
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
      from public.group_period_bounds(v_group.period_type, v_group.timezone, now());
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

create or replace function public.leave_group_leaderboard(p_leaderboard_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists(select 1 from public.group_leaderboards where id = p_leaderboard_id and owner_id = auth.uid()) then
    raise exception 'Creators cannot leave their own leaderboard';
  end if;
  update public.group_leaderboard_members set status = 'left', ended_at = now(), updated_at = now()
  where leaderboard_id = p_leaderboard_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Active membership not found'; end if;
end;
$$;

create or replace function public.remove_group_leaderboard_member(p_leaderboard_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.group_leaderboards where id = p_leaderboard_id and owner_id = auth.uid() and status = 'active') then
    raise exception 'Active leaderboard not found';
  end if;
  if p_user_id = auth.uid() then raise exception 'Creators cannot remove themselves'; end if;
  update public.group_leaderboard_members set status = 'removed', ended_at = now(), updated_at = now()
  where leaderboard_id = p_leaderboard_id and user_id = p_user_id and status = 'active' and role = 'member';
  if not found then raise exception 'Active member not found'; end if;
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
    from public.group_period_bounds(v_group.period_type, v_group.timezone, now());

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

revoke execute on function public.group_period_bounds(public.period_type,text,timestamptz) from public, anon, authenticated;
revoke execute on function public.create_group_leaderboard(text,public.period_type,integer,text) from public, anon;
revoke execute on function public.preview_group_leaderboard_invite(text) from public;
revoke execute on function public.join_group_leaderboard(text) from public, anon;
revoke execute on function public.list_my_group_leaderboards() from public, anon;
revoke execute on function public.get_group_leaderboard(uuid) from public, anon;
revoke execute on function public.get_group_leaderboard_ranking(uuid) from public, anon;
revoke execute on function public.leave_group_leaderboard(uuid) from public, anon;
revoke execute on function public.remove_group_leaderboard_member(uuid,uuid) from public, anon;
revoke execute on function public.close_group_leaderboard(uuid) from public, anon;

grant execute on function public.create_group_leaderboard(text,public.period_type,integer,text) to authenticated;
grant execute on function public.preview_group_leaderboard_invite(text) to anon, authenticated;
grant execute on function public.join_group_leaderboard(text) to authenticated;
grant execute on function public.list_my_group_leaderboards() to authenticated;
grant execute on function public.get_group_leaderboard(uuid) to authenticated;
grant execute on function public.get_group_leaderboard_ranking(uuid) to authenticated;
grant execute on function public.leave_group_leaderboard(uuid) to authenticated;
grant execute on function public.remove_group_leaderboard_member(uuid,uuid) to authenticated;
grant execute on function public.close_group_leaderboard(uuid) to authenticated;
