-- Broadcast active timer lifecycle changes to the user's other tabs/devices.
-- RLS on active_timer_runs limits delivered rows to auth.uid().
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'active_timer_runs'
  ) then
    alter publication supabase_realtime add table public.active_timer_runs;
  end if;
end $$;

alter table public.active_timer_runs replica identity full;
