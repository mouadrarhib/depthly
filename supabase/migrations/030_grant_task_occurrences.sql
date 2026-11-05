-- Migration 024 revoked default client table privileges. RLS policies alone
-- do not grant table access, so the signed-in Planner needs these grants.
grant select, insert, update, delete on table public.task_occurrences to authenticated;
