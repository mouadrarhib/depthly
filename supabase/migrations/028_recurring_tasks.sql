-- One task owns the repeat rule; only completed or skipped dates need rows.
alter table public.tasks
  add column repeat_days integer[],
  add column repeat_start_date date,
  add column repeat_end_date date;

alter table public.tasks
  add constraint tasks_repeat_rule_valid check (
    (repeat_days is null and repeat_start_date is null and repeat_end_date is null)
    or (
      repeat_days is not null and repeat_start_date is not null
      and cardinality(repeat_days) between 1 and 7
      and repeat_days <@ array[1,2,3,4,5,6,7]
      and (repeat_end_date is null or repeat_end_date >= repeat_start_date)
    )
  );

alter table public.tasks add constraint tasks_id_user_unique unique (id, user_id);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  user_id uuid not null,
  occurrence_date date not null,
  state text not null check (state in ('done', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, occurrence_date),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  check ((state = 'done' and completed_at is not null) or (state = 'skipped' and completed_at is null))
);

create index task_occurrences_user_date on public.task_occurrences (user_id, occurrence_date);
alter table public.task_occurrences enable row level security;
grant select, insert, update, delete on table public.task_occurrences to authenticated;
create policy "Users read own task occurrences" on public.task_occurrences
  for select to authenticated using (user_id = auth.uid());
create policy "Users add own task occurrences" on public.task_occurrences
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own task occurrences" on public.task_occurrences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users remove own task occurrences" on public.task_occurrences
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.validate_task_occurrence()
returns trigger language plpgsql set search_path = public as $$
declare
  v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = new.task_id and user_id = new.user_id;
  if not found or v_task.repeat_days is null
    or new.occurrence_date < v_task.repeat_start_date
    or (v_task.repeat_end_date is not null and new.occurrence_date > v_task.repeat_end_date)
    or not (extract(isodow from new.occurrence_date)::integer = any(v_task.repeat_days)) then
    raise exception 'Date does not match this task repeat rule';
  end if;
  return new;
end;
$$;
create trigger validate_task_occurrence before insert or update on public.task_occurrences
  for each row execute function public.validate_task_occurrence();
