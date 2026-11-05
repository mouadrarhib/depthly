# Planner

The authenticated Planner lives at `/planner`. It adds a work plan to existing
project tasks. A task still belongs to exactly one project, and a focus session
can still refer to that task. Planning does not change the meaning of a due date
or complete a task when a session finishes.

## Task dates

- `due_date`: the user's deadline; already existed.
- `planned_start_date` and `planned_end_date`: an optional inclusive week or
  month window. They must either both be set or both be empty.
- `scheduled_date`: the optional local calendar day the user intends to work
  on the task. It is independent of the deadline and planning window.

Migration `027_task_planning_dates.sql` adds the fields, checks, and owner/date
indexes. Existing task RLS still limits rows to `user_id = auth.uid()`; no new
table or public read policy is introduced. The typed `tasks` row and task query
inputs mirror the migration.

## Views and decisions

- **Month:** a Monday-first calendar shows tasks on their scheduled days. A
  selected day opens its task list, unfinished work, and suggestions.
- **Week:** the same scheduled tasks shown in seven larger day columns.
- **Today:** a focused list of tasks for the current day. The other views do
  not alter the Home dashboard.
- **Still to do:** an unfinished task with a scheduled date before the selected
  day remains visible. Nothing silently moves its scheduled date. The user can
  move it explicitly.
- **Suggested:** up to three unscheduled tasks whose planned window includes
  the selected day. Earlier due dates rank first, then priority, then title.
  The user chooses whether to add one to the day.
- **Unplanned:** existing open tasks without a work day or planning window can
  be assigned to the selected week or month.

The Planner quick-add action requires a project and a task title, then lets the
user pick a week or month window and optionally schedule the selected day. The
project task editor also exposes the planning window and work day. Starting
focus selects the project and task in the existing timer store and navigates
to `/timer`; it does not start a timer automatically.

## Limits

The Planner currently uses the app's existing date inputs. The full month task
grid is custom because day cells need task labels and selection behavior.
Timed browser or push reminders are not implemented; the Planner's visible
"Still to do" list is the reminder in this phase. Daily dashboard changes are
separate follow-up work.

## Repeating tasks

Migration `028_recurring_tasks.sql` adds `repeat_days` (ISO weekday numbers 1–7),
`repeat_start_date`, and optional `repeat_end_date` to a task. A repeated task
is still one project task and all focus sessions keep the same `task_id`.
The Planner derives matching dates only for the visible calendar window; it
never inserts daily copies into `tasks`.

`task_occurrences` stores only exceptions to an open day: `done` with its
completion timestamp, or `skipped`. Rows are unique by task and date. The
client renders an absent row as open. Changing a task's repeat rule preserves dated states that still match the
rule; dates outside the rule are hidden. Prior focus sessions are unaffected. Completing the
project task as a whole stops future occurrences while it is done. Reopening
it resumes the rule.

Occurrence rows are owner-scoped by RLS. A composite foreign key ensures their
`user_id` matches the task owner. A trigger rejects dates outside the rule or
on unselected weekdays. The client can read and write only its own rows.
Migration `030_grant_task_occurrences.sql` grants the authenticated role table
access explicitly; migration 024 removed automatic grants for new tables.

The Planner offers every day, weekdays, or custom weekdays from both its quick
add dialog and the project task editor. It shows a repeat marker in Today,
Week, and Month. A daily checkbox affects that date only; Skip affects that
date only. The "Still to do" panel shows the latest missed repeat day from the
previous seven days per task and lets the user mark it done or skip it. One-off
tasks continue to use their existing scheduled date and completion status.
