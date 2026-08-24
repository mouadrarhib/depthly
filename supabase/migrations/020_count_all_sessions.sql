-- Every saved focus session counts toward personal and trusted statistics.
-- Restore sessions that users excluded before this product rule changed, then
-- disable the exclusion RPC while retaining the columns for compatibility.

do $$
declare
  v_session public.sessions;
begin
  for v_session in
    select *
    from public.sessions
    where excluded_at is not null
      and type = 'focus'
      and is_trusted = true
    order by started_at, id
    for update
  loop
    perform public.apply_focus_aggregate_delta(
      v_session.user_id,
      v_session.task_id,
      v_session.local_date,
      v_session.duration_mins,
      1,
      true
    );
  end loop;

  update public.sessions
  set excluded_at = null,
      excluded_reason = null
  where excluded_at is not null;
end;
$$;

revoke execute on function public.set_session_excluded(uuid, boolean) from authenticated;

comment on function public.set_session_excluded(uuid, boolean) is
  'Deprecated: all saved sessions count toward statistics. Retained temporarily for schema compatibility.';
