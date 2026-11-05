-- Planning is independent of a task's due date. A task can belong to a
-- weekly/monthly window without committing to a particular work day.
alter table public.tasks
  add column if not exists planned_start_date date,
  add column if not exists planned_end_date date,
  add column if not exists scheduled_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.tasks'::regclass
      and conname = 'tasks_planned_range_complete'
  ) then
    alter table public.tasks add constraint tasks_planned_range_complete
      check ((planned_start_date is null) = (planned_end_date is null));
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.tasks'::regclass
      and conname = 'tasks_planned_range_ordered'
  ) then
    alter table public.tasks add constraint tasks_planned_range_ordered
      check (planned_start_date is null or planned_start_date <= planned_end_date);
  end if;
end $$;

create index if not exists idx_tasks_user_scheduled_date
  on public.tasks (user_id, scheduled_date)
  where scheduled_date is not null;

create index if not exists idx_tasks_user_planned_range
  on public.tasks (user_id, planned_start_date, planned_end_date)
  where planned_start_date is not null;

comment on column public.tasks.planned_start_date is
  'First date of an optional week/month planning window; not a deadline.';
comment on column public.tasks.planned_end_date is
  'Last date of an optional week/month planning window; not a deadline.';
comment on column public.tasks.scheduled_date is
  'Optional day the user intends to work on the task; not a deadline.';
