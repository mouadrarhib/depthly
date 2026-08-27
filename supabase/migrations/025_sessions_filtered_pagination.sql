-- Apply server-side filters before paginating the Sessions log.
--
-- The old client fetched 20 rows and then applied search/date/project/duration
-- filters in React. Matches on later pages were therefore invisible and the
-- displayed count described a different dataset from the rendered rows.

create or replace function public.get_sessions_page(
  p_page integer,
  p_page_size integer,
  p_type public.session_type,
  p_search text,
  p_timezone text,
  p_from_date date,
  p_to_date date,
  p_project_id uuid,
  p_min_duration integer,
  p_max_duration integer
)
returns table (
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
  task_title text,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_search text := nullif(lower(trim(p_search)), '');
begin
  if auth.uid() is null then
    raise exception using message = 'AUTH_REQUIRED', errcode = 'P0001';
  end if;
  if p_page < 0 or p_page_size not between 1 and 100 then
    raise exception using message = 'PAGINATION_INVALID', errcode = 'P0001';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using message = 'TIMEZONE_INVALID', errcode = 'P0001';
  end if;
  if p_from_date is not null and p_to_date is not null and p_from_date > p_to_date then
    raise exception using message = 'DATE_RANGE_INVALID', errcode = 'P0001';
  end if;
  if p_min_duration is not null and p_min_duration < 0 then
    raise exception using message = 'DURATION_INVALID', errcode = 'P0001';
  end if;
  if p_max_duration is not null and p_max_duration < 0 then
    raise exception using message = 'DURATION_INVALID', errcode = 'P0001';
  end if;
  if p_min_duration is not null and p_max_duration is not null
     and p_min_duration > p_max_duration then
    raise exception using message = 'DURATION_INVALID', errcode = 'P0001';
  end if;

  return query
  with filtered as (
    select
      s.*,
      pr.name as project_name,
      pr.color as project_color,
      t.title as task_title
    from public.sessions as s
    left join public.projects as pr on pr.id = s.project_id
    left join public.tasks as t on t.id = s.task_id
    where s.user_id = auth.uid()
      and (p_type is null or s.type = p_type)
      and (p_project_id is null or s.project_id = p_project_id)
      and (p_min_duration is null or s.duration_mins >= p_min_duration)
      and (p_max_duration is null or s.duration_mins <= p_max_duration)
      and (
        p_from_date is null
        or coalesce(s.local_date, (s.started_at at time zone p_timezone)::date) >= p_from_date
      )
      and (
        p_to_date is null
        or coalesce(s.local_date, (s.started_at at time zone p_timezone)::date) <= p_to_date
      )
      and (
        v_search is null
        or position(v_search in lower(coalesce(s.notes, ''))) > 0
        or position(v_search in lower(coalesce(pr.name, ''))) > 0
      )
  )
  select
    f.id,
    f.user_id,
    f.project_id,
    f.task_id,
    f.type,
    f.duration_mins,
    f.started_at,
    f.ended_at,
    f.notes,
    f.is_manual,
    f.timer_mode,
    f.created_at,
    f.updated_at,
    f.title,
    f.local_date,
    f.is_trusted,
    f.excluded_at,
    f.excluded_reason,
    f.project_name,
    f.project_color,
    f.task_title,
    count(*) over() as total_count
  from filtered as f
  order by f.started_at desc, f.id desc
  offset p_page * p_page_size
  limit p_page_size;
end;
$$;

revoke execute on function public.get_sessions_page(
  integer, integer, public.session_type, text, text, date, date, uuid, integer, integer
) from public, anon;
grant execute on function public.get_sessions_page(
  integer, integer, public.session_type, text, text, date, date, uuid, integer, integer
) to authenticated;

comment on function public.get_sessions_page(
  integer, integer, public.session_type, text, text, date, date, uuid, integer, integer
) is 'Returns one stable, owner-scoped page after applying all Sessions log filters.';
