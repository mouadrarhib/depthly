import { useState } from 'react'

import { Check, Clock, ListTodo, MoreHorizontal, Timer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import {
  useTasks,
  useTaskSessionMins,
  useUpdateTask,
  useDeleteTask,
  useDuplicateTask,
} from '@/hooks/useTasks'
import type { Task } from '@/lib/supabase/queries/tasks'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import {
  formatDueDate,
  isOverdue,
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
  STATUS_CONFIG,
} from '@/lib/utils/tasks'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'todo' | 'in_progress' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type StatusFilter = 'all' | Status
type PriorityFilter = 'all' | Priority

const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done']

// Sorts within a status group: highest priority first, then soonest due date
// (undated tasks last). Priority is what the user asked to order by; due
// date is just a sensible tiebreaker so same-priority tasks don't jump
// around unpredictably between renders.
function sortByPriority(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const rankA = PRIORITY_ORDER[(a.priority ?? 'medium') as Priority]
    const rankB = PRIORITY_ORDER[(b.priority ?? 'medium') as Priority]
    if (rankA !== rankB) return rankA - rankB
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-lg border border-depth-border bg-depth-surface px-3 py-3">
      <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-depth-raised" />
      <div className="h-3.5 flex-1 rounded bg-depth-raised" />
      <div className="h-5 w-14 rounded-full bg-depth-raised" />
      <div className="h-3 w-10 rounded bg-depth-raised" />
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
  color?: string
}

export function FilterPill({ label, active, onClick, color }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
      style={{
        borderColor: active ? '#4B9EFF' : 'var(--color-border)',
        backgroundColor: active ? '#4B9EFF1A' : 'transparent',
        color: active ? '#4B9EFF' : 'var(--color-text-muted)',
      }}
    >
      {color && (
        <span
          className="inline-block shrink-0 rounded-full"
          style={{ width: 6, height: 6, backgroundColor: color }}
        />
      )}
      {label}
    </button>
  )
}

// ─── Status group header ──────────────────────────────────────────────────────

function GroupHeader({ status, count }: { status: Status; count: number }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: cfg.color }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: cfg.color,
        }}
      >
        {cfg.label}
      </span>
      <span style={{ fontSize: 11, color: '#aaa7ba' }}>{count}</span>
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

interface RowProps {
  task: Task
  sessionMins?: number
  onOpen: (task: Task) => void
  onEdit: (task: Task) => void
  onDeleteRequest: (id: string) => void
  onToggle: (task: Task) => void
  onDuplicate: (id: string) => void
}

function TaskRow({
  task,
  sessionMins,
  onOpen,
  onEdit,
  onDeleteRequest,
  onToggle,
  onDuplicate,
}: RowProps) {
  const done = task.status === 'done'
  const overdue = isOverdue(task.due_date, task.status ?? '')
  const dueText = formatDueDate(task.due_date)

  const showPomCount =
    (task.actual_pomodoros != null && task.actual_pomodoros > 0) || task.estimated_pomodoros != null

  return (
    <div
      onClick={() => onOpen(task)}
      className="group flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-depth-border px-3 py-4 transition-colors hover:bg-depth-raised"
    >
      {/* Checkbox + title — always its own flexible row so the title can
          never be squeezed to zero width by the metadata below/beside it
          (that's what happened when title shared one fixed-column grid
          with badge/date/pomodoro/duration columns that reserved space
          unconditionally, even with no metadata present). */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {/* Outer button is a 44x44px touch target (mobile tap-target
            guideline) via negative margin so it doesn't grow the row's
            layout footprint beyond the visible circle's original 18px. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle(task)
          }}
          aria-label={done ? 'Mark as to do' : 'Mark as done'}
          className="flex shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ width: 44, height: 44, margin: -13 }}
        >
          <span
            aria-hidden="true"
            className="flex items-center justify-center rounded-full border transition-colors"
            style={{
              width: 18,
              height: 18,
              backgroundColor: done ? '#4B9EFF' : 'transparent',
              borderColor: done ? '#4B9EFF' : '#77758b',
            }}
          >
            {done && <Check size={10} strokeWidth={3} color="#ffffff" />}
          </span>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpen(task)
          }}
          className="min-w-0 flex-1 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          style={{
            color: done ? '#B9B6C8' : 'var(--color-text)',
            textDecoration: 'none',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.title}
        </button>
      </div>

      {/* Metadata — priority, due date, pomodoro count, duration. Always
          rendered (even fully empty) so every row reserves the same vertical
          space and the list doesn't look uneven between rows that have
          metadata and rows that don't. On md+ this becomes a fixed-column
          grid so values line up across rows regardless of content width or
          missing data. On mobile it's set to order-last + w-full so it
          always wraps onto its own line instead of competing with the title
          for space. */}
      <div
        className="order-last flex min-h-[17px] w-full flex-wrap items-center gap-2 pl-14 md:order-none md:grid md:w-auto md:flex-nowrap md:items-center md:gap-2.5 md:pl-0"
        style={{ gridTemplateColumns: '90px 90px 70px 80px' }}
      >
        {/* Priority badge */}
        <div>
          {task.priority && (
            <PriorityBadge
              priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'}
              dimmed={false}
            />
          )}
        </div>

        {/* Due date */}
        <div>
          {dueText && (
            <span
              className="shrink-0"
              style={{ fontSize: 12, color: overdue ? '#F25C5C' : 'var(--color-text-muted)' }}
            >
              {dueText}
            </span>
          )}
        </div>

        {/* Pomodoro count */}
        <div className="flex md:justify-end">
          {showPomCount && (
            <span
              className="font-data inline-flex shrink-0 items-center gap-1 text-ink-primary/70"
              style={{ fontSize: 12 }}
              aria-label={`Pomodoro count: ${task.actual_pomodoros ?? 0}${
                task.estimated_pomodoros != null ? ` of ${task.estimated_pomodoros} estimated` : ''
              }`}
            >
              {task.actual_pomodoros ?? 0}
              {task.estimated_pomodoros != null && ` / ${task.estimated_pomodoros}`}
              <Timer size={12} style={{ flexShrink: 0 }} aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Duration */}
        <div className="flex md:justify-end">
          {sessionMins != null && sessionMins > 0 && (
            <span
              className="font-data flex shrink-0 items-center gap-1"
              style={{ fontSize: 12, color: '#aaa7ba' }}
              aria-label={`Time logged: ${formatMinutesToHours(sessionMins)}`}
            >
              <Clock size={11} style={{ color: '#aaa7ba', flexShrink: 0 }} aria-hidden="true" />
              {formatMinutesToHours(sessionMins)}
            </span>
          )}
        </div>
      </div>

      {/* Three-dot menu — visible on hover only */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${task.title}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-secondary opacity-100 transition-all hover:bg-depth-raised hover:text-ink-primary group-focus-within:opacity-100 group-hover:opacity-100"
        >
          <MoreHorizontal size={15} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={() => onEdit(task)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDuplicate(task.id)}>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onDeleteRequest(task.id)}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── TaskListView ─────────────────────────────────────────────────────────────

interface TaskListViewProps {
  filters?: { search: string; status: string; priority: string }
  onClearFilters?: () => void
  projectId: string
  onOpenTask: (task: Task) => void
  onEditTask: (task: Task) => void
  onCreateTask?: () => void
}

export function TaskListView({
  projectId,
  onOpenTask,
  onEditTask,
  onCreateTask,
  filters,
  onClearFilters,
}: TaskListViewProps) {
  const { data: tasks = [], isLoading, isError, refetch } = useTasks(projectId)
  const { data: sessionMinsMap } = useTaskSessionMins(projectId)

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const duplicateTask = useDuplicateTask()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [showCompleted, setShowCompleted] = useState(false)
  const activeStatus = filters?.status ?? statusFilter
  const activePriority = filters?.priority ?? priorityFilter
  const filtered = tasks
    .filter(
      (t) =>
        !filters?.search ||
        t.title.toLocaleLowerCase().includes(filters.search.trim().toLocaleLowerCase())
    )
    .filter((t) => activeStatus === 'all' || t.status === activeStatus)
    .filter((t) => activePriority === 'all' || t.priority === activePriority)

  const isEmpty = tasks.length === 0
  const noMatch = !isEmpty && filtered.length === 0

  // Grouped by status (To Do → In Progress → Done), sorted by priority
  // within each group — a specific filter collapses this to a single flat,
  // priority-sorted list since the group header would just repeat the filter.
  const groups =
    activeStatus === 'all'
      ? STATUS_ORDER.map((status) => ({
          status,
          items: sortByPriority(filtered.filter((t) => t.status === status)),
        })).filter((g) => g.items.length > 0)
      : [{ status: activeStatus as Status, items: sortByPriority(filtered) }]

  function handleToggle(task: Task) {
    const isDone = task.status === 'done'
    updateTask.mutate({
      id: task.id,
      projectId,
      data: {
        status: isDone ? 'todo' : 'done',
        completed_at: isDone ? null : new Date().toISOString(),
      },
    })
  }

  if (isError)
    return (
      <div role="alert" className="py-10 text-center text-sm text-ink-primary">
        <p>We couldn’t load tasks for this project.</p>
        <button className="mt-3 min-h-11 px-4 text-brand" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 lg:flex-1 lg:overflow-hidden">
      {/* Standalone filter bar */}
      {!filters && (
        <div className="flex flex-col gap-3 rounded-xl border border-depth-border bg-depth-surface p-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Status
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
              <FilterPill
                label="All"
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              {STATUS_ORDER.map((s) => (
                <FilterPill
                  key={s}
                  label={STATUS_CONFIG[s].label}
                  color={STATUS_CONFIG[s].color}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                />
              ))}
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-depth-border sm:block" />

          <div className="flex min-w-0 flex-col gap-1.5 border-t border-depth-border pt-3 sm:border-t-0 sm:pt-0">
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Priority
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
              <FilterPill
                label="All"
                active={priorityFilter === 'all'}
                onClick={() => setPriorityFilter('all')}
              />
              {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
                <FilterPill
                  key={p}
                  label={PRIORITY_CONFIG[p].label}
                  color={PRIORITY_CONFIG[p].color}
                  active={priorityFilter === p}
                  onClick={() => setPriorityFilter(p)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Empty states */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-depth-border bg-depth-surface px-5 py-10 text-center sm:border-dashed sm:bg-transparent sm:py-12">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-depth-raised text-ink-secondary sm:hidden">
            <ListTodo size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-primary sm:font-normal sm:text-ink-primary/70">
              No tasks yet
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-secondary sm:hidden">
              Add the first task to turn this project into an actionable workspace.
            </p>
          </div>
          {onCreateTask && (
            <Button variant="primary" size="sm" onClick={onCreateTask}>
              Create task
            </Button>
          )}
        </div>
      )}

      {noMatch && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-depth-border py-10 text-center">
          <p className="text-sm text-ink-primary/70">No tasks match the current filters</p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all')
              setPriorityFilter('all')
              onClearFilters?.()
            }}
            className="text-xs text-brand hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Task list — grouped by status, sorted by priority within each group */}
      {filtered.length > 0 && (
        <div
          role="region"
          aria-label="Project tasks"
          tabIndex={0}
          className="flex flex-col gap-5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
        >
          <div className="sticky top-0 z-10 hidden shrink-0 items-center gap-2.5 border-b border-depth-border bg-depth-bg px-3 py-3 text-xs text-ink-primary/75 md:flex">
            <span className="flex-1">Task</span>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: '90px 90px 70px 80px' }}>
              <span>Priority</span>
              <span>Due</span>
              <span className="text-right">Pomodoros</span>
              <span className="text-right">Focus time</span>
            </div>
            <span className="w-7" />
          </div>

          {groups.map(({ status, items }) => (
            <div key={status}>
              {status === 'done' && activeStatus === 'all' && (
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  aria-expanded={showCompleted}
                  className="mb-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-depth-border bg-depth-surface px-4 text-left text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span>Completed tasks · {items.length}</span>
                  <span className="text-brand">
                    {showCompleted ? 'Hide completed' : 'Show completed'}
                  </span>
                </button>
              )}
              {(status !== 'done' || activeStatus !== 'all' || showCompleted) && (
                <>
                  {activeStatus === 'all' && status !== 'done' && (
                    <GroupHeader status={status} count={items.length} />
                  )}
                  <div className="flex flex-col gap-1.5">
                    {items.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        sessionMins={sessionMinsMap?.[task.id]}
                        onOpen={onOpenTask}
                        onEdit={onEditTask}
                        onDeleteRequest={setDeleteTarget}
                        onToggle={handleToggle}
                        onDuplicate={(id) => duplicateTask.mutate(id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteTask.mutate(
            { id: deleteTarget, projectId },
            { onSuccess: () => setDeleteTarget(null) }
          )
        }}
        title="Delete task"
        description="This task will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        isLoading={deleteTask.isPending}
      />
    </div>
  )
}
