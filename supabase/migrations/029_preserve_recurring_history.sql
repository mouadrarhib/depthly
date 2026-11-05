-- Editing a repeat rule should not erase completed or skipped dates.
-- Dates outside the current rule are simply not rendered by the Planner.
drop trigger if exists clear_occurrences_on_repeat_change on public.tasks;
drop function if exists public.clear_occurrences_on_repeat_change();
