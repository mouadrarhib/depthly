# Tasks — Implementation Reference

## 1. Overview

Tasks are work items that belong to a project. They surface inside the project detail page under the "Tasks" tab and can be viewed in two modes: a vertical **List view** (with drag-to-reorder) and a three-column **Kanban board** (with drag within and across columns).

- Tasks are always scoped to a project — there is no global task list.
- A task can optionally be linked to a focus session via the timer's task selector.
- Completing a task (status → `done`) records a `completed_at` timestamp; toggling back to `todo` clears it.
- Two independent float columns control sort order: `list_order` for the list view and `kanban_order` for the kanban view. They are never shared.

---

## 2. Data Model

Table: `tasks`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `id` | `string` (UUID) | generated | Primary key |
| `project_id` | `string` (UUID) | required | FK → `projects.id` |
| `user_id` | `string` (UUID) | required | FK → `profiles.id` |
| `title` | `string` | required | Display name, max 100 chars |
| `description` | `string \| null` | `null` | Optional free-text detail |
| `status` | `task_status_type` | `'todo'` | Enum: `'todo' \| 'in_progress' \| 'done'` |
| `priority` | `task_priority_type` | `'medium'` | Enum: `'low' \| 'medium' \| 'high' \| 'urgent'` |
| `due_date` | `string \| null` | `null` | ISO date string `YYYY-MM-DD` (no time component) |
| `list_order` | `number` (float) | generated | Sort position in list view |
| `kanban_order` | `number` (float) | generated | Sort position within a kanban column |
| `estimated_pomodoros` | `number \| null` | `null` | User-set focus session estimate |
| `actual_pomodoros` | `number` | `0` | Incremented by the timer system |
| `completed_at` | `string \| null` | `null` | ISO timestamp, set when `status` → `'done'`, cleared on revert |
| `created_at` | `string` | generated | ISO timestamp |
| `updated_at` | `string` | generated | ISO timestamp |

### `list_order` vs `kanban_order`

These two columns are **completely independent**:

- **`list_order`**: Controls position in the list view. Dragging in list view updates only `list_order`. The database query in `fetchTasksByProject` orders by `list_order` ascending.
- **`kanban_order`**: Controls position within a kanban column (i.e. within the same `status`). Dragging in kanban view updates only `kanban_order`. Tasks are sorted by `kanban_order` when rendering each column.

Using separate float columns means that reordering in one view never disturbs the other. Both use fractional indexing (midpoint averaging) to allow unlimited insertions without renumbering.

### `completed_at` behavior

`completed_at` is set to `new Date().toISOString()` when status changes to `'done'`, and set to `null` when status reverts to `'todo'`. It is not set automatically by the database — the client always writes it explicitly alongside the `status` update.

---

## 3. Components

### `TaskListView`
**File:** `src/components/tasks/TaskListView.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `projectId` | `string` | Fetches tasks for this project |
| `onEditTask` | `(task: Task) => void` | Opens edit modal |
| `onCreateTask` | `() => void \| undefined` | Optional; shown in empty state |

**Renders:** A filter bar + drag-sortable list of task rows.

**Sub-components (internal):**
- `SkeletonRow`: animated placeholder row during loading
- `FilterPill`: a toggleable pill with optional color dot; used for status and priority filters
- `SortableTaskRow`: a single draggable task row wrapping `useSortable`

**Key behaviors:**
- Filters are client-side; applied to the already-fetched task list
- Drag handle (`⠿` character) is the only element that receives `useSortable` listeners — the rest of the row uses `{...attributes}` only, so checkbox and menu clicks don't trigger drag
- Two distinct empty states: `isEmpty` (no tasks at all) shows a "Create task" button; `noMatch` (filters hiding everything) shows a "Clear filters" link

---

### `TaskKanbanView`
**File:** `src/components/tasks/TaskKanbanView.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `projectId` | `string` | Fetches tasks for this project |
| `onEditTask` | `(task: Task) => void` | Opens edit modal |
| `onAddTask` | `(status: string) => void \| undefined` | Optional; called when `+` button is clicked in a column |

**Renders:** A `DndContext` wrapping three `KanbanColumn` components plus a `DragOverlay`.

---

### `KanbanColumn`
**File:** `src/components/tasks/KanbanColumn.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `status` | `'todo' \| 'in_progress' \| 'done'` | Which column this is |
| `tasks` | `Task[]` | Pre-filtered and sorted tasks for this column |
| `onEditTask` | `(task: Task) => void` | Passed through to each card |
| `onDeleteTask` | `(task: Task) => void` | Passed through to each card |
| `onDuplicateTask` | `(task: Task) => void` | Passed through to each card |
| `onAddTask` | `(status: string) => void` | Called by the `+` button in the column header |

**Add-task entry point:** the kanban board relies solely on each column's own `+` icon to create a task — there is no standalone "Add task" button above the board (that toolbar button is shown only in list view; see `ProjectDetailPage`). This keeps the target column unambiguous: clicking `+` in a column calls `onAddTask(status)`, which flows up to `TaskModal`'s `defaultStatus` prop and pre-selects that column's status on the create form.

**Renders:**
- A styled container div (tinted background per status, 14px radius, 16px padding, 1px border)
- Column header: colored dot + status label + task count badge + `+` icon button
- A `useDroppable` drop zone wrapping a `SortableContext` with all card IDs
- `KanbanCard` for each task, or "No tasks" empty state

**Column colors (from local `COLUMN_CONFIG`):**

| Status | Background | Accent color |
|---|---|---|
| `todo` | `rgba(122, 120, 144, 0.06)` | `#7A7890` |
| `in_progress` | `rgba(75, 158, 255, 0.06)` | `#4B9EFF` |
| `done` | `rgba(61, 214, 140, 0.06)` | `#3DD68C` |

The count badge uses `${color}26` (15% opacity hex alpha) as background with matching text color.

---

### `KanbanCard`
**File:** `src/components/tasks/KanbanCard.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `task` | `Task` | The task to display |
| `onEdit` | `(task: Task) => void` | Opens edit modal |
| `onDelete` | `(task: Task) => void` | Opens delete confirm |
| `onDuplicate` | `(task: Task) => void` | Duplicates the task |

**Renders:**
- A `useSortable` drag handle wrapping the entire card
- Top row: `PriorityBadge` (or empty span) + three-dot dropdown menu
- Title (line-clamp-2, strikethrough + reduced opacity when done)
- Bottom row (only when due date or pomodoro count exists): due date chip + pomodoro count, separated from title by a 1px top border

**Hover state** (via `useState` + `onMouseEnter`/`onMouseLeave`):
- Background: `#141417` → `#222228`
- Border: `#2E2E38` → `rgba(75, 158, 255, 0.3)`
- Box shadow: none → `0 4px 12px rgba(0,0,0,0.3)`
- Transition: `background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease` (merged with dnd-kit's transform transition to avoid conflicts)

**Hover is suppressed while dragging** (`showHover = isHovered && !isDragging`).

**Three-dot menu**: `opacity-100 md:opacity-0 md:group-hover:opacity-100` — always visible on touch, hover-only on desktop. Uses `onPointerDown stopPropagation` to prevent drag activation when opening the menu.

**Due date chip styling:**
- Normal: `background transparent, color #7A7890, border 1px solid #2E2E38`
- Overdue: `background transparent, color #F25C5C, border 1px solid #F25C5C`
- Ghost/outline style (transparent background, colored 1px border) deliberately distinguishes the due-date chip from `PriorityBadge`'s filled/tinted style, so an urgent+overdue card doesn't read as two duplicate red alarms.

**Priority badge dimming when done:** the `PriorityBadge` in the top row is wrapped in a `<span style={{ opacity: done ? 0.5 : 1 }}>` — matches the 0.5 opacity already applied to the strikethrough title, so completed tasks (including completed urgent ones) read as visually quieter than active tasks.

---

### `TaskModal`
**File:** `src/components/tasks/TaskModal.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Controls dialog visibility |
| `onClose` | `() => void` | Called on cancel or successful save |
| `projectId` | `string` | Required for create mode and query invalidation |
| `task` | `Task \| undefined` | If provided, renders in edit mode |

**Fields:**
- **Title**: text input, max 100 chars, required, autoFocus
- **Description**: plain `<textarea>`, optional
- **Status + Priority**: two shadcn `Select` components in a 2-column grid
- **Due date**: native `<input type="date">` with an X clear button (lucide `X` icon)
- **Estimated sessions**: checkbox toggle + `Stepper` component (min 1, max 20)

**Order calculation on create:**
```ts
list_order   = tasks.length + 1           // append to end of list view
kanban_order = tasks.filter(t => t.status === status).length + 1  // append to target column
```

**State reset:** `useEffect` on `[open]` resets all fields and calls `mutation.reset()` on both create and update mutations.

---

### `PriorityBadge`
**File:** `src/components/ui/PriorityBadge.tsx`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `priority` | `'low' \| 'medium' \| 'high' \| 'urgent'` | Which priority level |

**Renders:** A shadcn `Badge` (variant `"outline"`) with all colors applied via inline `style`:
- `backgroundColor`: `${color}26` (15% opacity)
- `color`: full color
- `borderColor`: `${color}66` (40% opacity)
- `fontSize`: 11px, `fontWeight`: 500

---

## 4. Views

### List View

**Drag and drop:**
- Library: `@dnd-kit/core` + `@dnd-kit/sortable`
- Sensor: `PointerSensor` with `activationConstraint: { distance: 5 }` (5px movement before drag activates, prevents accidental drags on clicks)
- Collision detection: `closestCenter`
- Only the `⠿` drag handle receives `{...listeners}` — the `{...attributes}` (for keyboard navigation) go on the outer row div

**`list_order` recalculation on reorder:**
```ts
// After arrayMove to get the new visual order:
const reordered    = arrayMove(filtered, oldIndex, newIndex)
const withoutMoved = reordered.filter((_, i) => i !== newIndex)
const newOrder     = getListOrder(withoutMoved, newIndex)
// Only the moved task's list_order is updated — not all tasks
```

**Filters (client-side):**
- Status filter: `'all' | 'todo' | 'in_progress' | 'done'`
- Priority filter: `'all' | 'low' | 'medium' | 'high' | 'urgent'`
- Both filters applied with `Array.filter` on the cached task list — no extra queries
- Status pills and priority pills are separated by a 1px `depth-border` vertical divider

**Checkbox completion:**
```ts
// Toggle: done → todo clears completed_at; todo/in_progress → done sets it
updateTask.mutate({
  id: task.id,
  projectId,
  data: {
    status:       isDone ? 'todo' : 'done',
    completed_at: isDone ? null   : new Date().toISOString(),
  },
})
```

---

### Kanban View

**Column structure:** Three fixed columns in order: `['todo', 'in_progress', 'done']`. The column array is defined as `const COLUMNS: Status[] = ['todo', 'in_progress', 'done']` in `TaskKanbanView`.

Each `KanbanColumn` uses:
- `useDroppable({ id: status })` from `@dnd-kit/core` — makes the column a drop target
- A nested `SortableContext` (from `@dnd-kit/sortable`) for card reordering within the column

**Drag within column (reorder):**
- `over.id` is a task ID (not a column status)
- Target column tasks are collected (excluding dragged task), sorted by `kanban_order`
- New `kanban_order` is calculated at the insertion point
- Mutates: `reorderKanban([{ id, kanban_order: newOrder }])`

**Drag across columns (status change):**
- `over.id` is either a task ID (insert before that card) or a column status string (append to bottom)
- Disambiguation: `(COLUMNS as string[]).includes(overId)` — if true, it's a column drop
- New `kanban_order` is calculated at the insertion point in the target column
- Mutates: `reorderKanban([{ id, kanban_order: newOrder, status: targetStatus }])`

**Collision detection:** `closestCorners` (not `closestCenter`). This gives better results when dragging over the edge of a column or between cards.

**DragOverlay:** Renders an inline card div (not `KanbanCard`) to avoid re-entrant `isDragging: true` from `useSortable`. If `KanbanCard` were used in the overlay, its `useSortable` call would see `isDragging: true` and compound the opacity to `0.5 × 0.5 = 0.25`. The overlay card is a simplified layout without dnd hooks.

---

## 5. Hooks

All hooks are in `src/hooks/useTasks.ts`.

### `useTasks(projectId: string)`
- **Query key:** `taskKeys.byProject(projectId)` → `['tasks', 'project', projectId]`
- **Query fn:** `fetchTasksByProject(projectId)` — ordered by `list_order` ascending
- **Enabled:** `!!projectId`
- Returns all tasks for the project regardless of status/priority (filtering is client-side)

### `useCreateTask()`
- **Variables:** `CreateTaskInput` (see data model)
- **On success:** Invalidates `taskKeys.byProject(project_id)` and `projectKeys.stats(project_id)`

### `useUpdateTask()`
- **Variables:** `{ id: string; projectId: string; data: UpdateTaskInput }`
- `projectId` is in the variables (not in `data`) for invalidation only
- **On success:** Invalidates `taskKeys.byProject(projectId)`
- No optimistic update

### `useDeleteTask()`
- **Variables:** `{ id: string; projectId: string }`
- **On success:** Invalidates `taskKeys.byProject(projectId)` and `projectKeys.stats(projectId)`

### `useDuplicateTask()`
- **Variables:** `id: string` (the source task ID)
- **On success:** Invalidates `taskKeys.byProject(result.project_id)` (project ID comes from the returned copy)

### `useReorderTasks(projectId: string)`
- `projectId` is passed at hook call time (not per-mutation)
- **Variables:** `Array<{ id: string; list_order: number }>`
- **Optimistic update:**
  1. `cancelQueries` on the task list
  2. Snapshot previous data
  3. Patch cache: update `list_order` for matching task IDs
  4. Return `{ previous }` for rollback
- **On error:** Restores snapshot
- **On settled:** Invalidates to sync with server

### `useReorderKanban(projectId: string)`
- Same structure as `useReorderTasks`
- **Variables:** `Array<{ id: string; kanban_order: number; status?: string }>`
- **Optimistic update:** Patches both `kanban_order` and `status` (if provided) in the cache
- On cross-column drag, the status change is reflected immediately in the UI before the server responds

---

## 6. Utility Functions (`src/lib/utils/tasks.ts`)

### `PRIORITY_CONFIG`
```ts
const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#7A7890' },
  medium: { label: 'Medium', color: '#4B9EFF' },
  high:   { label: 'High',   color: '#F5A623' },
  urgent: { label: 'Urgent', color: '#F25C5C' },
} as const
```

### `STATUS_CONFIG`
```ts
const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: '#7A7890' },
  in_progress: { label: 'In Progress', color: '#4B9EFF' },
  done:        { label: 'Done',        color: '#3DD68C' },
} as const
```

### `formatDueDate(date: string | null): string`
Returns a human-readable relative date string. Appends `T00:00:00` before parsing to avoid UTC offset shifting the date.

| Input | Output |
|---|---|
| `null` | `''` |
| Today's date | `'Today'` |
| Tomorrow's date | `'Tomorrow'` |
| Yesterday's date | `'Yesterday'` |
| Within 7 days | `'Mon'`, `'Tue'`, etc. |
| Further out | `'Jun 15'`, `'Dec 3'`, etc. |

### `isOverdue(due_date: string | null, status: string): boolean`
Returns `true` only if:
- `due_date` is not null
- `status` is not `'done'`
- The parsed due date is strictly before today (midnight, local time)

Also appends `T00:00:00` before parsing for the same UTC offset reason.

### `getListOrder(tasks: Task[], index: number): number`
Computes the `list_order` float for inserting at `index` in `tasks` (tasks at this point should exclude the item being moved).

```
index <= 0       → tasks[0].list_order - 1        (prepend)
index >= length  → tasks[last].list_order + 1     (append)
else             → (tasks[index-1].list_order + tasks[index].list_order) / 2  (midpoint)
```

Example: inserting between tasks with `list_order` 3 and 5 → returns 4.

### `getKanbanOrder(tasks: Task[], index: number): number`
Same logic as `getListOrder` but operates on `kanban_order` instead.

---

## 7. Drag and Drop Architecture

**Packages used:**
- `@dnd-kit/core` — `DndContext`, `DragOverlay`, `useDroppable`, sensors, collision detection
- `@dnd-kit/sortable` — `SortableContext`, `useSortable`, `arrayMove`, `verticalListSortingStrategy`
- `@dnd-kit/utilities` — `CSS.Transform.toString`

**List view:**
```
DndContext (closestCenter, PointerSensor distance:5)
  └── SortableContext (items = filtered task IDs, verticalListSortingStrategy)
        └── SortableTaskRow × N (useSortable on task.id)
              listeners → drag handle span only
              attributes → outer row div
```

**Kanban board:**
```
DndContext (closestCorners, PointerSensor distance:5)
  ├── KanbanColumn × 3
  │     useDroppable({ id: status })
  │     └── SortableContext (items = column task IDs)
  │           └── KanbanCard × N (useSortable on task.id)
  │                 listeners + attributes → root div
  └── DragOverlay
        └── inline card div (no useSortable)
```

**Why `useDroppable` on the column AND `SortableContext` inside?**
`SortableContext` alone handles reordering within the same context. `useDroppable` is added at the column level so that dropping onto an empty column (or the column background) registers as a drop on that column rather than disappearing. The `over.id` will then be the column's status string, which `handleDragEnd` checks via `COLUMNS.includes(overId)`.

**Why float `list_order` / `kanban_order` instead of integers?**
Integer ordering requires renumbering all rows after every drag (O(n) writes). Float midpoint insertion requires only one write per drag, regardless of list length. The tradeoff is that after many insertions between the same two items, the float precision degrades — but in practice this is rare and can be corrected by a full renumber if needed.

---

## 8. Priority & Status System

### Priority levels

| Key | Label | Color | Usage |
|---|---|---|---|
| `low` | Low | `#7A7890` | ink-muted grey |
| `medium` | Medium | `#4B9EFF` | brand blue (default) |
| `high` | High | `#F5A623` | amber |
| `urgent` | Urgent | `#F25C5C` | red |

### Status values

| Key | Label | Color | Usage |
|---|---|---|---|
| `todo` | To Do | `#7A7890` | grey |
| `in_progress` | In Progress | `#4B9EFF` | brand blue |
| `done` | Done | `#3DD68C` | green |

### `PriorityBadge` color rendering

Colors are applied entirely via inline `style` — never dynamic Tailwind classes:

```tsx
style={{
  backgroundColor: `${color}26`,  // 15% opacity (0x26 = 38 ≈ 255×0.15)
  color:           color,
  borderColor:     `${color}66`,  // 40% opacity (0x66 = 102 ≈ 255×0.40)
  fontSize:        '11px',
  fontWeight:      500,
}}
```

### Overdue detection (`isOverdue`)

A task is overdue when:
1. `due_date` is not null
2. `status !== 'done'` (completed tasks are never overdue)
3. The due date, parsed as midnight local time, is strictly before today midnight

The due date string (`YYYY-MM-DD`) is always parsed with `T00:00:00` appended to avoid the browser interpreting it as UTC and shifting it by the user's timezone offset.

---

## 9. Known Limitations

- **No task-session link in sessions list**: `ProjectSessionsList` always shows "No task" — the sessions query does not join on `task_id` yet.
- **No global task view**: Tasks can only be accessed through a project's detail page. There is no `/tasks` route.
- **`actual_pomodoros` not incremented by client**: The field exists and is displayed, but the timer's `save_session()` RPC is responsible for incrementing it. The client never writes to this field directly.
- **Float precision decay**: After many drag-and-drop operations inserting between the same two tasks, `list_order` / `kanban_order` values can become very close together (e.g. `3.000000001` and `3.000000002`). There is no renormalization mechanism in place yet.
- **No subtasks**: Tasks are flat — there is no parent/child task relationship in the schema.
- **No bulk operations**: No select-all, bulk delete, or bulk status change in the UI.
- **Filters reset on navigation**: Status and priority filter state lives in `TaskListView` component state, so navigating away and back resets filters to "All".
