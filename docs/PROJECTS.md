# Projects — Implementation Reference

## 1. Overview

Projects are the top-level organizational unit in Depthly. A project groups related focus sessions and tasks so a user can track time and completion progress for a body of work (e.g. "Client work", "Side project").

- Every **session** is optionally linked to a `project_id`.
- Every **task** belongs to exactly one project via `project_id`.
- Stats (total focus minutes, task completion) are computed on demand from the sessions and tasks tables — they are not stored in the projects table itself.
- Projects can be active or archived. Archived projects are hidden from the main list but their data is retained.

---

## 2. Data Model

Table: `projects`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `id` | `string` (UUID) | generated | Primary key |
| `user_id` | `string` (UUID) | required | Foreign key → `profiles.id` |
| `name` | `string` | required | Display name, max 50 chars |
| `color` | `string` | `#4B9EFF` | Hex color for visual identification |
| `icon` | `string \| null` | `null` | Single emoji character |
| `is_archived` | `boolean` | `false` | Soft-delete / archive state |
| `last_used_at` | `string \| null` | `null` | ISO timestamp; updated when a session is saved for this project |
| `sort_order` | `number` | generated | Legacy column; not used in current sort logic (UI sorts by `last_used_at`) |
| `created_at` | `string` | generated | ISO timestamp |
| `updated_at` | `string` | generated | ISO timestamp |

**Relationships:**
- `projects.user_id` → `profiles.id`
- `sessions.project_id` → `projects.id` (nullable)
- `tasks.project_id` → `projects.id`

**Computed stats** (not columns — fetched separately via `getProjectStats`):

```ts
type ProjectStats = {
  total_focus_minutes: number   // sum of focus session duration_mins
  total_tasks:         number   // count of all tasks in project
  completed_tasks:     number   // count of tasks where status = 'done'
  session_count:       number   // count of focus sessions
}
```

---

## 3. Pages & Routes

### `/projects` — ProjectsPage

Displays a grid of all active (non-archived) projects for the current user.

- **Grid layout**: 1 column (mobile) → 2 (sm) → 3 (lg), gap-5
- **Sort modes**: "Last used" (default) and "Alphabetical", toggled via pill buttons. Sorting is client-side on the already-fetched list. Last-used nulls sort to the end.
- **Loading state**: 6 animated skeleton cards while `useProjects` is fetching.
- **Empty state**: Centered message + "New Project" button.
- **Create**: Opens `ProjectModal` in create mode.
- **Edit**: Opens `ProjectModal` in edit mode with existing values pre-filled.
- **Archive**: Calls `useArchiveProject`, immediately removes the card from the active list.
- **Delete**: Opens `ConfirmDialog`, then calls `useDeleteProject`.
- **Navigate to detail**: Clicking a card navigates to `/projects/:id`.

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

| Tab | Content |
|---|---|
| Tasks | Task view with list/kanban toggle + Add task button |
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
| `stats` | `ProjectStats` | `{ total_focus_minutes, total_tasks, completed_tasks }` |
| `onEdit` | `() => void` | Opens edit modal |
| `onArchive` | `() => void` | Archives the project |
| `onDelete` | `() => void` | Opens delete confirm |
| `onClick` | `() => void` | Navigates to detail page |

**Renders:**
- Styled `div` with a 3px colored top border (`borderTop: '3px solid project.color'`, inline style), 12px border-radius, hover lift + shadow (via `useState` + `onMouseEnter`/`onMouseLeave`)
- Header row: 12px color dot + optional emoji icon + truncated project name + three-dot dropdown menu (Edit / Archive / Delete)
- Focus stat: `formatHours(total_focus_minutes)` in `font-data` 28px
- Progress row: task count with `(pct%)` label + 4px progress bar track with colored fill

**`formatHours` helper** (defined inline in the file):
```ts
function formatHours(minutes: number): string {
  if (minutes === 0) return '0h'
  if (minutes < 60)  return `${minutes}m`
  return `${parseFloat((minutes / 60).toFixed(1))}h`
}
```

**Key behaviors:**
- Hover state: `translateY(-2px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`, side/bottom borders shift to `rgba(255,255,255,0.1)`. Transition is `all 150ms ease`.
- Progress bar fill: minimum width is 4px even when `pct === 0`.
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
- Note: Currently not used by any page component (archive list page not yet built).

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
- **On success:** Invalidates both `projectKeys.active` and `projectKeys.archived`

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
  name:    string
  color:   string
  icon:    string | null
}
```
Inserts a single row and returns it.

```ts
updateProject(id: string, input: UpdateProjectInput): Promise<Project>
```
```ts
type UpdateProjectInput = {
  name?:         string
  color?:        string
  icon?:         string | null
  is_archived?:  boolean
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

Returns `{ total_focus_minutes, total_tasks, completed_tasks, session_count }`.

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

### Stats calculation
`getProjectStats` computes on demand (no denormalized columns):
- **Focus hours**: queries all `focus`-type sessions for the project, sums `duration_mins`
- **Task completion**: queries all tasks, counts total and those with `status = 'done'`
- **Percentage** (UI only): `Math.round((completed_tasks / total_tasks) * 100)` in `ProjectCard`

---

## 8. Known Limitations

- **Session task join not wired up**: `ProjectSessionsList` always shows "No task" in the task name column. The comment in the source notes "task join added in Phase 4 when tasks are built" — this was deferred.
- **Archived projects page not built**: `useArchivedProjects` exists and works, but there is no UI route to view archived projects. They are accessible only via direct Supabase query.
- **`sort_order` column unused**: The `projects` table has a `sort_order` column (float) but the current UI ignores it entirely — sort order is computed client-side from `last_used_at` and name.
- **No optimistic updates on create/edit/delete**: Mutations invalidate and refetch rather than updating the cache directly. This means a brief loading flash after create/edit.
- **`last_used_at` not updated automatically**: Updating this field on session save is handled by the `save_session()` RPC function on the backend, not from client code.
