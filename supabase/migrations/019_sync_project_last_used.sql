-- Keep project recency accurate for sorting and card metadata regardless of
-- which trusted session workflow creates or reassigns a focus session.

create or replace function public.sync_project_last_used()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'DELETE' and new.project_id is not null then
    update public.projects
    set
      last_used_at = (
        select max(started_at)
        from public.sessions
        where project_id = new.project_id
          and type = 'focus'
          and excluded_at is null
      ),
      updated_at = now()
    where id = new.project_id;
  end if;

  if tg_op <> 'INSERT'
    and old.project_id is not null
    and (
      tg_op = 'DELETE'
      or old.project_id is distinct from new.project_id
      or old.excluded_at is distinct from new.excluded_at
      or old.started_at is distinct from new.started_at
      or old.type is distinct from new.type
    )
  then
    update public.projects
    set
      last_used_at = (
        select max(started_at)
        from public.sessions
        where project_id = old.project_id
          and type = 'focus'
          and excluded_at is null
      ),
      updated_at = now()
    where id = old.project_id;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sessions_sync_project_last_used on public.sessions;
create trigger sessions_sync_project_last_used
after insert or delete or update of project_id, excluded_at, started_at, type
on public.sessions
for each row execute function public.sync_project_last_used();

revoke execute on function public.sync_project_last_used() from public, anon, authenticated;

update public.projects as project
set
  last_used_at = activity.last_used_at,
  updated_at = now()
from (
  select project_id, max(started_at) as last_used_at
  from public.sessions
  where project_id is not null
    and type = 'focus'
    and excluded_at is null
  group by project_id
) as activity
where project.id = activity.project_id
  and project.last_used_at is distinct from activity.last_used_at;
