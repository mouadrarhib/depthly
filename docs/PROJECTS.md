# Projects — Implementation Reference

## 1. Overview

Projects are the top-level organizational unit in Depthly. A project groups related focus sessions and tasks so a user can track time and completion progress for a body of work (e.g. "Client work", "Side project").

- Every **session** is optionally linked to a `project_id`.
- Every **task** belongs to exactly one project via `project_id`.
- Stats (total focus minutes, task completion) are computed on demand from the sessions and tasks tables — they are not stored in the projects table itself.
- Projects can be active or archived. The Projects page exposes both collections; archived projects retain their data and can be restored.

---

## 2. Data Model

Table: `projects`

| Column         | Type             | Default   | Purpose                                                                    |
| -------------- | ---------------- | --------- | -------------------------------------------------------------------------- |
| `id`           | `string` (UUID)  | generated | Primary key                                                                |
| `user_id`      | `string` (UUID)  | required  | Foreign key → `profiles.id`                                                |
| `name`         | `string`         | required  | Display name, max 50 chars                                                 |
| `color`        | `string`         | `#4B9EFF` | Hex color for visual identification                                        |
| `icon`         | `string \| null` | `null`    | Single emoji character                                                     |
| `is_archived`  | `boolean`        | `false`   | Soft-delete / archive state                                                |
| `last_used_at` | `string \| null` | `null`    | ISO timestamp; updated when a session is saved for this project            |
| `sort_order`   | `number`         | generated | Legacy column; not used in current sort logic (UI sorts by `last_used_at`) |
| `created_at`   | `string`         | generated | ISO timestamp                                                              |
| `updated_at`   | `string`         | generated | ISO timestamp                                                              |

**Relationships:**

- `projects.user_id` → `profiles.id`
- `sessions.project_id` → `projects.id` (nullable)
- `tasks.project_id` → `projects.id`

**Computed stats** (not columns — fetched separately via `getProjectStats`):

```ts
type ProjectStats = {
  total_focus_minutes: number // sum of focus session duration_mins
  total_tasks: number // count of all tasks in project
  completed_tasks: number // count of tasks where status = 'done'
  session_count: number // count of focus sessions
  last_focused_at: string | null // latest included focus-session timestamp
}
```

---

## 3. Pages & Routes

### `/projects` — ProjectsPage

Displays active and archived project grids for the current user. A segmented
`Active / Archived` control switches the visible collection without changing
routes; each segment shows its project count.

- **Grid layout**: 1 column (mobile) → 2 (sm) → 3 (lg), gap-5
- **Sort modes**: "Last used" (default) and "Alphabetical", presented as a labeled segmented control. Sorting is client-side on the selected collection. Last-used nulls sort to the end with an alphabetical fallback.
- **Search**: Filters the currently selected Active or Archived collection by project name using a case-insensitive substring match. Search is client-side, includes a single clear action, and shows a dedicated no-results state without changing the selected status or sort mode. The field sits beside the status control on desktop and uses a full row on narrow mobile screens.
- **Loading state**: 6 animated skeleton cards while `useProjects` is fetching.
- **Empty state**: Centered message + "New Project" button.
- **Create**: Opens `ProjectModal` in create mode.
- **Edit**: Opens `ProjectModal` in edit mode with existing values pre-filled.
- **Archive / restore**: Optimistically moves the project between the Active and Archived collections. Restoring respects the active-project plan limit.
- **Delete**: Opens `ConfirmDialog`, then calls `useDeleteProject`.
- **Navigate to detail**: The whole card is an accessible button target that navigates to `/projects/:id`; the actions menu remains independently interactive.
- **Projects guide**: A contextual driver.js walkthrough auto-starts once per user after the global Quick Guide has been completed. It is replayable from Help while on `/projects`.

Stats for each card are fetched individually per-project via `useProjectStats` inside a `ProjectCardWrapper` component (so each card loads its own stats independently).

---

### `/projects/:id` — ProjectDetailPage

Displays a single project with stats, a task view, and a sessions list.

**Header**: Project color dot (14px) + optional emoji icon + project name (28px). Edit and Archive/Unarchive buttons in the top-right.

**Stats row** (3 figures, font-data class):

- Total focus hours (`total_focus_minutes / 60` formatted to 1 decimal)
- Tasks completed (`completed / total` ratio string)
- Session count (raw number)

Shows `—` while stats are loading.

**Tabs** (shadcn `Tabs`):

| Tab      | Content                                                |
| -------- | ------------------------------------------------------ |
| Tasks    | Task view with list/kanban toggle + Add task button    |
| Sessions | `ProjectSessionsList` — chronological list of sessions |

**Task view toggle**: Two icon buttons (List, Columns from lucide-react). Active button shows `#4B9EFF`, inactive shows `#7A7890` (inline style). Switching between list and kanban does not refetch — both views read from the same `useTasks` cache.

**Task modals**: The detail page owns the `TaskModal` and delete `ConfirmDialog` state. It passes callbacks (`onEditTask`, `onCreateTask`, `onAddTask`) into the view components.

**Archive/Unarchive logic**: Checks `project.is_archived` to determine which mutation to call. On success, navigates back to `/projects`.

---

## 4. Components

### `ProjectCard`

**File:** `src/components/projects/ProjectCard.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `project` | `Tables<'projects'>` | Full project row |
| `stats` | `ProjectStats` | Focus, task, session-count, and last-focused data |
| `isStatsLoading` | `boolean` | Keeps card data in a loading state until its stats query resolves |
| `onEdit` | `() => void` | Opens edit modal |
| `onArchive` | `() => void` | Archives the project |
| `onRestore` | `() => void` | Restores an archived project |
| `onDelete` | `() => void` | Opens delete confirm |
| `onClick` | `() => void` | Navigates to detail page |

**Renders:**

- Styled `div` with a 3px colored top border (`borderTop: '3px solid project.color'`, inline style), 12px border-radius, hover lift + shadow (via `useState` + `onMouseEnter`/`onMouseLeave`)
- Header row: 12px color dot + optional emoji icon + truncated project name + three-dot dropdown menu (Edit / Archive / Delete)
- Focus stat: `formatDuration(total_focus_minutes)` in `font-data` 28px, rendered as `7h 35m` rather than decimal hours
- Progress row: task count with `(pct%)` label + 4px progress bar track with colored fill
- Activity footer: human-readable last-focused text plus the focus-session count

**`formatDuration` helper** (defined inline in the file):

```ts
455 → "7h 35m"
```

**Key behaviors:**

- Hover state: `translateY(-2px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`, side/bottom borders shift to `rgba(255,255,255,0.1)`. Transition is `all 150ms ease`.
- Progress bar fill is truly empty when `pct === 0`; active projects without tasks show an `Add first task →` prompt that opens the project detail page.
- The dropdown menu is inside the header row; its click handlers stop propagation so clicks don't bubble to the card's `onClick`.

---

### `ProjectModal`

**File:** `src/components/projects/ProjectModal.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Controls dialog visibility |
| `onClose` | `() => void` | Called on cancel or successful save |
| `project` | `Project \| undefined` | If provided, renders in edit mode |

**Renders:** shadcn `Dialog` with:

- Name input (max 50 chars, validated on submit)
- Color picker: 10 preset hex colors, displayed as 28px circular buttons with a ring selection indicator
- Icon picker: 16 preset emoji in an 8-column grid, selected item gets `depth-raised` background + brand border

**State reset:** `useEffect` on `[open]` resets all fields to project values (edit) or defaults (create), and calls `mutation.reset()` on both create and update mutations to clear stale error state.

**Validation:**

- Name is required (trimmed)
- Name max 50 characters
- Errors shown inline below the input

---

### `ProjectSessionsList`

**File:** `src/components/projects/ProjectSessionsList.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `projectId` | `string` | Fetches sessions for this project |

**Renders:** A vertically-divided list of session rows. Each row shows:

- Date (e.g. "Jun 29, 2025") + time (e.g. "3:00 PM") — using `en-US` locale formatting
- Task name column: currently always shows "No task" (task join not yet wired up)
- Duration: formatted as `45m` or `1h 30m`

Loading state: 5 animated skeleton rows.
Empty state: centered message.

---

## 5. Hooks

All hooks are in `src/hooks/useProjects.ts`. They use TanStack Query and read `userId` from `authStore`.

### `useProjects()`

- **Query key:** `['projects', 'active']` (`projectKeys.active`)
- **Query fn:** `fetchProjects(userId)` — only non-archived projects, ordered by `last_used_at` desc
- **Enabled:** `!!userId`

### `useArchivedProjects()`

- **Query key:** `['projects', 'archived']` (`projectKeys.archived`)
- **Query fn:** `fetchArchivedProjects(userId)` — only archived projects
- **Enabled:** `!!userId`
- Used by `ProjectsPage` for the Archived collection and project restoration flow.

### `useProject(id)`

- **Query key:** `['projects', id]` (`projectKeys.detail(id)`)
- **Query fn:** `fetchProjectById(id)`
- **Enabled:** `!!id`

### `useProjectStats(id)`

- **Query key:** `['projects', id, 'stats']` (`projectKeys.stats(id)`)
- **Query fn:** `getProjectStats(id)` — runs two parallel Supabase queries
- **Enabled:** `!!id`

### `useCreateProject()`

- **Mutation fn:** `createProject(data: CreateProjectInput)`
- **On success:** Invalidates `projectKeys.active`

### `useUpdateProject()`

- **Mutation fn:** `updateProject(id, data: UpdateProjectInput)`
- **Variables shape:** `{ id: string; data: UpdateProjectInput }`
- **On success:** Invalidates `projectKeys.active` and `projectKeys.detail(id)`

### `useDeleteProject()`

- **Mutation fn:** `deleteProject(id)`
- **On success:** Invalidates `projectKeys.active`

### `useArchiveProject()`

- **Mutation fn:** `updateProject(id, { is_archived: true })`
- **Optimistic behavior:** Removes the project from Active and inserts it into Archived immediately; restores both caches on failure.
- **Settled:** Invalidates Active, Archived, and the project detail query.

### `useUnarchiveProject()`

- **Mutation fn:** `updateProject(id, { is_archived: false })`
- Mirrors the archive mutation in the opposite direction with the same optimistic rollback and invalidation behavior.

---

## 6. Query Functions

File: `src/lib/supabase/queries/projects.ts`

```ts
fetchProjects(userId: string): Promise<Project[]>
```

Selects all non-archived projects for a user, ordered by `last_used_at` desc (nulls last), then `created_at` desc.

```ts
fetchArchivedProjects(userId: string): Promise<Project[]>
```

Same as above but `is_archived = true`.

```ts
fetchProjectById(id: string): Promise<Project>
```

Single project by primary key; throws if not found.

```ts
createProject(input: CreateProjectInput): Promise<Project>
```

```ts
type CreateProjectInput = {
  user_id: string
  name: string
  color: string
  icon: string | null
}
```

Inserts a single row and returns it.

```ts
updateProject(id: string, input: UpdateProjectInput): Promise<Project>
```

```ts
type UpdateProjectInput = {
  name?: string
  color?: string
  icon?: string | null
  is_archived?: boolean
  last_used_at?: string
}
```

Partial update by primary key, returns updated row.

```ts
deleteProject(id: string): Promise<void>
```

Hard deletes the project row. Cascades to sessions and tasks via DB foreign keys.

```ts
getProjectStats(projectId: string): Promise<ProjectStats>
```

Runs two parallel queries:

1. Selects `duration_mins` from all focus sessions for the project → sums to `total_focus_minutes`, counts to `session_count`
2. Selects `status` from all tasks for the project → counts total and done

Returns `{ total_focus_minutes, total_tasks, completed_tasks, session_count, last_focused_at }`.

---

## 7. Key Behaviors

### Project color: storage and rendering

Colors are stored as hex strings (e.g. `#4B9EFF`) in `projects.color`. They are always applied via inline `style` attributes in components — never via dynamic Tailwind classes. This is required because Tailwind cannot generate classes for arbitrary runtime values.

```tsx
// Correct
<span style={{ backgroundColor: project.color }} />

// Wrong — Tailwind won't generate this class
<span className={`bg-[${project.color}]`} />
```

The colored top border on `ProjectCard` follows the same rule: `style={{ borderTop: '3px solid project.color' }}`.

### Archive vs delete

- **Archive** (`is_archived: true`): Soft operation. The project row remains; sessions and tasks are untouched. The project disappears from the active list but can be restored.
- **Delete**: Hard delete of the project row. Cascades to child rows (sessions, tasks) at the database level via foreign key constraints.

The UI shows an Archive button on both the project card (dropdown) and the detail page header. Delete is only available from the card dropdown.

### Sort modes

Sorting is **client-side** on the already-fetched list in `ProjectsPage`:

- **Last used** (default): sort by `last_used_at` descending; nulls (never used) go to the end.
- **Alphabetical**: `localeCompare` on `project.name`.

The database query in `fetchProjects` also returns data ordered by `last_used_at`, so the default sort costs no extra work.

### Project search

Search state is local to `ProjectsPage`; no additional database query or
migration is required. The page trims the query, normalizes it to lowercase,
filters the currently selected collection by project name, and then applies the
selected sort mode to the results. Clearing the query immediately restores the
full Active or Archived collection.

The input uses `type="text"` with `inputMode="search"` so browsers display the
appropriate keyboard without adding a second native clear button beside the
custom accessible `Clear project search` control.

### Last-used synchronization

Migration `019_sync_project_last_used.sql` adds a session trigger that recomputes
the affected project's `last_used_at` whenever a focus session is inserted,
deleted, reassigned, excluded/restored, or moved in time. The migration also
backfills existing projects from their latest included focus session. This keeps
both the Last used sort and card recency metadata accurate with the trusted timer
lifecycle introduced in migration 015.

### Stats calculation

`getProjectStats` computes on demand (no denormalized columns):

- **Focus hours**: queries all `focus`-type sessions for the project, sums `duration_mins`
- **Task completion**: queries all tasks, counts total and those with `status = 'done'`
- **Percentage** (UI only): `Math.round((completed_tasks / total_tasks) * 100)` in `ProjectCard`

---

## 8. Known Limitations

- **Session task join not wired up**: `ProjectSessionsList` always shows "No task" in the task name column. The comment in the source notes "task join added in Phase 4 when tasks are built" — this was deferred.
- **`sort_order` column unused**: The `projects` table has a `sort_order` column (float) but the current UI ignores it entirely — sort order is computed client-side from `last_used_at` and name.
- **Create/edit/delete still refetch**: Archive and restore are optimistic; create, edit, and delete continue to invalidate and refetch.

---

## 9. Contextual Projects Guide

The shared tour architecture, persistence rules, responsive behavior, and QA
checklist are documented in [`docs/TOURS.md`](TOURS.md). This section records
the Projects-specific integration.

`useProjectsTour()` is mounted by `ProjectsPage` after the Active and Archived
queries finish. It waits until the global onboarding Quick Guide has been seen,
then starts once per user after a short render-settling delay. Navigating away
before that delay completes cancels the start.

For a visible project collection, the guide contains three steps:

1. **Create a project** — targets the New Project button.
2. **Open the workspace** — targets the first visible project card and explains tasks, sessions, and connected focus time.
3. **Manage the project** — targets the first card's actions menu and explains edit, archive/restore, and delete.

If the current collection is empty, only the creation step is shown so driver.js
never targets an element that does not exist. The guide uses mobile-specific
popover placement below 768px.

The Topbar Help menu conditionally shows **Projects guide** only on the exact
`/projects` route. Manual replay checks the currently rendered grid to decide
whether to build the one-step or three-step version; it does not fetch project
data from the Topbar.

| File | Responsibility |
|---|---|
| `src/lib/onboarding/projectTourSteps.ts` | Builds the responsive one-step or three-step driver.js sequence. |
| `src/hooks/useProjectsTour.ts` | Seen state, auto-start gating, replay runner, and cleanup. |
| `src/pages/ProjectsPage.tsx` | Mounts the guide and exposes the New Project target. |
| `src/components/projects/ProjectCard.tsx` | Exposes card and actions-menu targets. |
| `src/components/layout/Topbar.tsx` | Adds the route-specific Projects guide replay entry. |

**Seen flag:** `localStorage['depthly_projects_tour_seen_{userId}']`. Closing the
guide early counts as seen, matching the global Quick Guide behavior.
