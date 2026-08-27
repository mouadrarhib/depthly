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

`GoalSettings` is mounted in the Goals section of `/settings`, so users can update these targets from the normal app navigation.

---

## Sessions Log

Route: `/sessions`. Sessions are immutable records produced by the trusted timer lifecycle described
in `docs/TRUSTED_SESSIONS.md`. The page does not provide manual creation, hard deletion, timing edits,
or analytics exclusion. Every saved focus session contributes to analytics; saved breaks remain visible
in the log but do not add focus time.

### Pagination approach

`fetchSessionsPaginated` calls the authenticated-only `get_sessions_page(...)` RPC. The function
owner-scopes every read with `auth.uid()`, applies all filters to the complete dataset, and only then
returns 20 rows plus an exact filtered count. Related project/task display fields are returned with each
row. Paging is stable because rows are ordered by `started_at DESC, id DESC`.

```
from = page * pageSize        // inclusive, 0-indexed
to   = from + pageSize - 1    // inclusive
```

The query key includes the user, page, and normalized filter object so each result is cached independently.
Filters cover session type, literal text in notes or project names, local date range, project, and duration
bounds. Date comparisons use the browser's IANA timezone. Search is debounced for 300 ms; changing any
filter resets pagination to the first page, and the previous page stays visible while the next query loads.
The UI clamps an out-of-range page after a deletion or count change.

`fetchSessionCount()` is a separate unfiltered count. It lets the page distinguish a genuinely new account
from a filtered result with no matches, so the empty-state guidance stays accurate.

### Editing metadata

`SessionModal` is edit-only. It can change:

- project
- task
- session title
- notes

The mutation calls `update_session_metadata()`. Duration, start time, end time, timer mode, trust state,
and session type cannot be edited. This keeps the server-calculated record and all aggregates consistent.
Changing the project clears an incompatible task selection. On success, session and analytics queries are
invalidated so project breakdowns and lists refresh.

### Filters and day navigation

The filter toolbar supports:

- text search
- session type (`All`, `Focus`, `Break`)
- start and end dates through native date inputs
- project
- duration

Sessions are grouped beneath local-calendar date headings. A range can be entered directly, avoiding repeated
previous-day navigation when the user needs to inspect an older period.

### Session details and rows

`SessionRow` is clickable and opens `SessionDetailModal`, which shows the saved timing, duration, type,
trust indicator, project, task, title, and notes. Its Edit action opens the metadata modal. The row also has
an accessible three-dot Edit action for direct access.

The same detail and edit dialogs are reused for sessions shown inside a project. This keeps session behavior
consistent between `/sessions` and the project detail page.

Rows display a `Legacy` badge when `is_trusted` is false and a type badge for break records. Durations and
counts use the data font.

### Page states

- Initial loading uses session-row skeletons.
- A genuinely empty account explains that completed timers appear here and links to the Timer.
- A filtered-empty state explains that no sessions match and offers to clear the filters.
- The pagination footer shows the visible row range and disables Previous/Next at the boundaries.
- Only one document scrollbar is used; the filter controls and rows remain responsive on mobile.

There is intentionally no manual-session creation, hard-delete action, or status/exclusion selector. All saved
focus sessions count in analytics, and corrections are limited to descriptive metadata.
