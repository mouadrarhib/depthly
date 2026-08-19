-- gen_random_bytes() is installed in Supabase's extensions schema and is not
-- visible to SECURITY DEFINER functions whose search_path is restricted to
-- public. Use PostgreSQL's gen_random_uuid() and retain 80 random bits.

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

revoke execute on function public.create_group_leaderboard(text,public.period_type,integer,text) from public, anon;
grant execute on function public.create_group_leaderboard(text,public.period_type,integer,text) to authenticated;
