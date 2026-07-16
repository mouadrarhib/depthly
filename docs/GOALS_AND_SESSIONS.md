# Goals & Sessions Log

## Goals

### Data model

One row per user in the `goals` table:

| Column               | Type           | Notes                              |
|----------------------|----------------|------------------------------------|
| `id`                 | uuid           | PK                                 |
| `user_id`            | uuid           | FK → profiles                      |
| `daily_goal_minutes` | integer \| null | null = no goal set                |
| `weekly_goal_minutes`| integer \| null | null = no goal set                |
| `created_at`         | timestamptz    |                                    |
| `updated_at`         | timestamptz    |                                    |

Goals store minutes as integers (not hours). The UI converts for display.
A user may have a daily goal, a weekly goal, both, or neither.

### Query layer — `src/lib/supabase/queries/goals.ts`

| Export              | Description                                    |
|---------------------|------------------------------------------------|
| `Goal`              | `Tables<'goals'>` alias                        |
| `UpdateGoalsInput`  | `{ daily_goal_minutes?, weekly_goal_minutes? }` |
| `fetchGoals(userId)`| `.single()` — throws if row missing            |
| `updateGoals(userId, data)` | Direct client update, returns row     |

### Hooks — `src/hooks/useGoals.ts`

| Hook             | Description                                                    |
|------------------|----------------------------------------------------------------|
| `useGoals()`     | `useQuery` keyed on `goalKeys.detail(userId)`, reads from auth store |
| `useUpdateGoals()` | `useMutation`, invalidates `goalKeys.detail(userId)` on success |

Both hooks read `userId` from `useAuthStore` — no prop drilling.

### Progress calculation — `src/lib/utils/analytics.ts`

```typescript
getGoalProgress(focusMinutes: number, goalMinutes: number | null)
  → { percentage: number; isComplete: boolean; remaining: number }
```

- Returns `{ percentage: 0, isComplete: false, remaining: 0 }` when `goalMinutes` is null (no goal set).
- `percentage` is clamped to 100 by callers (the function itself can exceed 100).
- `isComplete` is true when `focusMinutes >= goalMinutes`.
- `remaining` is `max(0, goalMinutes - focusMinutes)`.

### Weekly goal history — `src/lib/utils/analytics.ts`

```typescript
getWeekGoalHistory(summaries, weekDays)
  → Array<{ date: Date; dayLabel: string; met: boolean | null }>
```

- `met: true` = `daily_summaries.daily_goal_met` was true for that date.
- `met: false` = there is a summary row but the goal was not met.
- `met: null` = no summary row for that date (future day or no activity).

Rendered by `GoalHistoryRow` as a row of 7 coloured dots (green = met, dark = missed, dashed = no data). Today's dot gets a blue glow ring.

### Celebration trigger — `src/hooks/useGoalCelebration.ts`

```typescript
useGoalCelebration(focusMinutes: number, goalMinutes: number | null)
  → { shouldCelebrate: boolean }
```

Detects the `false → true` transition on `isComplete`:
1. `prevRef` tracks the previous `isComplete` value across renders.
2. When `prevRef.current === false` and `isComplete` flips to `true`, `shouldCelebrate` is set to `true`.
3. A `setTimeout(0)` immediately resets it back to `false`, giving consumers a single-tick pulse.

This pulse is consumed by `ConfettiBurst` (`src/components/ui/ConfettiBurst.tsx`), which spawns 14 animated particles on each `trigger: true` pulse and clears them after 1 000 ms.

### GoalSettings component — `src/components/goals/GoalSettings.tsx`

Renders two `GoalRow` sub-components — one for daily, one for weekly — each with:
- A free-form number input (minutes)
- Preset chips (e.g. 1h / 2h / 4h / 6h for daily)
- A shared Save button that calls `useUpdateGoals()`
- A "Saved" confirmation that auto-clears after 2 s

**Known gap — no UI entry point yet.** `GoalSettings` is built and works in isolation but is not mounted anywhere in the current navigation. It will be embedded in the Settings page (Phase 8). Until then it can only be tested by importing it directly.

---

## Sessions Log

### Pagination approach

`fetchSessionsPaginated` in `src/lib/supabase/queries/sessions.ts` uses Supabase's `.range(from, to)` with `{ count: 'exact' }` to retrieve a page of sessions and the total row count in a single request.

```
from = page * pageSize        // inclusive, 0-indexed
to   = from + pageSize - 1    // inclusive
```

The companion hook `useSessionsPaginated(page)` sets `keepPreviousData: true` so the previous page stays visible while the next page loads — no loading flash between pages.

Query key: `['sessions', 'paginated', userId, page]` — page changes create new cache entries, so forward/back navigation is instant after the first visit.

### Edit sessions — `updateSession`

```typescript
updateSession(id: string, data: UpdateSessionInput): Promise<Session>
```

Accepted fields: `project_id`, `task_id`, `duration_mins`, `started_at`, `ended_at`, `notes`.

> **⚠ Known issue — aggregates not recalculated.**
> `updateSession` is a direct `UPDATE` on the `sessions` table. It does **not** touch `daily_summaries`, `user_stats`, or `profiles`. If a session's `duration_mins` or `started_at` is changed:
> - The session list will show the correct new value immediately.
> - The Analytics page will continue to show stale totals until the underlying aggregates are corrected.
> - `profiles.total_focus_minutes`, `user_stats`, and `daily_summaries` will be out of sync.
>
> This is acceptable for now (the edit flow is primarily for fixing project/task assignment or notes). A future `recalculate_stats()` RPC would be needed to fully fix this.

`useUpdateSession()` invalidates both `['sessions']` and `['analytics']` on success so that at minimum the session list is refreshed and the analytics queries re-fetch (they will show the same stale aggregate values from the DB, but any client-side cached data is cleared).

### Delete sessions — `deleteSession`

```typescript
deleteSession(id: string): Promise<void>
```

> **⚠ Known issue — aggregates not recalculated.**
> `deleteSession` is a direct `DELETE` on the `sessions` table. It does **not** decrement `daily_summaries.focus_minutes`, `daily_summaries.session_count`, `user_stats`, or `profiles.total_focus_minutes` / `total_sessions`. Those aggregates will remain inflated after deletion.
>
> The streak in `profiles.current_streak` is also unaffected.

`useDeleteSession()` invalidates `['sessions']` only (analytics queries are not invalidated since the underlying aggregates haven't actually changed — re-fetching them would show the same inflated numbers).

### Manual session creation — `createManualSession`

```typescript
createManualSession(data: CreateManualSessionInput): Promise<Session>
```

Input: `user_id`, `project_id`, `task_id`, `duration_mins`, `started_at`, `ended_at`, `notes`, `local_date`.

Unlike `updateSession` / `deleteSession`, manual creation **routes through the `save_session()` SECURITY DEFINER RPC** — the same function the timer uses. This means:

- `daily_summaries` is correctly upserted.
- `user_stats` (daily / weekly / monthly / yearly) is correctly upserted.
- `profiles.total_focus_minutes`, `total_sessions`, `current_streak`, and `last_focus_date` are all updated atomically.
- `tasks.actual_pomodoros` is incremented if a task is linked.

Two caveats from the RPC signature:
1. `is_manual` is not a parameter the RPC accepts — the DB column defaults to `false`, so manual sessions are not distinguishable from timer sessions in the database.
2. `p_timer_mode` is passed as `null`; the RPC coerces `null → 'pomodoro'` internally.

`local_date` (`YYYY-MM-DD`) is the date the user picked in the form — it's passed straight through as `p_local_date` and used verbatim for `daily_summaries.date` / streak bookkeeping. As of migration `006_save_session_local_date.sql`, the RPC no longer derives the session's date from `p_started_at` in UTC (that desynced from the client's "today" for any non-UTC timezone) — every caller (timer completion, manual stop, break auto-save, and this one) must supply the local date explicitly.

`useCreateManualSession()` invalidates both `['sessions']` and `['analytics']` on success, and in this case the analytics re-fetch will reflect the correctly updated aggregates.

### SessionModal — `src/components/sessions/SessionModal.tsx`

Used for both edit and create:
- **Edit mode**: `session` prop is a `SessionWithRelations`. Fields are pre-filled from the session. Submits via `useUpdateSession()`.
- **Create mode**: `session` prop is absent. Date/time default to `new Date()` in the user's local timezone. Submits via `useCreateManualSession()`.

Date + time are stored as separate inputs and combined into a UTC ISO string on submit:
```typescript
const startedAt = new Date(`${date}T${time}`).toISOString()
const endedAt   = new Date(startMs + durationMins * 60_000).toISOString()
```

The task selector is disabled until a project is selected, and changing the project clears the selected task.

### SessionRow — `src/components/sessions/SessionRow.tsx`

Renders a single row in the paginated list. Key behaviours:
- Date shows "Today" when `started_at` is the same local calendar date as `new Date()`.
- Duration formats as `"45m"` or `"1h 30m"` (no trailing `" 0m"` for whole hours).
- Notes indicator: a `FileText` icon that reveals the full note text in a tooltip on hover.
- The three-dot action menu is hidden at rest and fades in on row hover (`group-hover:opacity-100`).

### SessionsPage — `src/pages/SessionsPage.tsx`

Route: `/sessions` (registered in `src/routes/index.tsx`, linked from sidebar as "Sessions" with the `History` lucide icon).

Page-level state: `currentPage`, `isModalOpen`, `editingSession`, `deletingSession`.

- Loading state: 8 skeleton rows (shown only on initial load; `keepPreviousData` suppresses skeletons during pagination).
- Empty state: shown when `!isPending && totalCount === 0` — offers "Start Timer" and "Add Session" actions.
- Pagination footer: "Showing X–Y of Z sessions", Previous / Next buttons disabled at boundaries.
- Delete uses `ConfirmDialog` which notes that stats won't be recalculated.
