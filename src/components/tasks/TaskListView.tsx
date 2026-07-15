import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Clock, MoreHorizontal, Timer } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import {
  useTasks,
  useTaskSessionMins,
  useUpdateTask,
  useDeleteTask,
  useDuplicateTask,
  useReorderTasks,
} from '@/hooks/useTasks'
import {
  formatDueDate,
  isOverdue,
  getListOrder,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
} from '@/lib/utils/tasks'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import type { Task } from '@/lib/supabase/queries/tasks'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter   = 'all' | 'todo' | 'in_progress' | 'done'
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent'

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-lg border
                    border-depth-border bg-depth-surface px-3 py-3">
      <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-depth-raised" />
      <div className="h-3.5 flex-1 rounded bg-depth-raised" />
      <div className="h-5 w-14 rounded-full bg-depth-raised" />
      <div className="h-3 w-10 rounded bg-depth-raised" />
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

interface FilterPillProps {
  label:   string
  active:  boolean
  onClick: () => void
  color?:  string
}

function FilterPill({ label, active, onClick, color }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1
                 text-xs font-medium transition-colors"
      style={{
        borderColor:     active ? '#4B9EFF' : '#2E2E38',
        backgroundColor: active ? '#4B9EFF1A' : 'transparent',
        color:           active ? '#4B9EFF' : '#7A7890',
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

// ─── Sortable task row ────────────────────────────────────────────────────────

interface RowProps {
  task:            Task
  projectId:       string
  sessionMins?:    number
  onEdit:          (task: Task) => void
  onDeleteRequest: (id: string) => void
  onToggle:        (task: Task) => void
  onDuplicate:     (id: string) => void
}

function SortableTaskRow({
  task,
  projectId: _projectId,
  sessionMins,
  onEdit,
  onDeleteRequest,
  onToggle,
  onDuplicate,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const done    = task.status === 'done'
  const overdue = isOverdue(task.due_date, task.status ?? '')
  const dueText = formatDueDate(task.due_date)

  const showPomCount =
    (task.actual_pomodoros != null && task.actual_pomodoros > 0) ||
    task.estimated_pomodoros != null

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      className="group flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg border
                 border-depth-border bg-depth-surface px-3 py-2.5 transition-colors
                 hover:bg-depth-raised"
    >
      {/* Drag handle — visible on hover only */}
      <span
        {...listeners}
        className="shrink-0 cursor-grab select-none text-lg leading-none text-ink-muted
                   opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Drag to reorder"
      >
        ⠿
      </span>

      {/* Checkbox + title — always its own flexible row so the title can
          never be squeezed to zero width by the metadata below/beside it
          (that's what happened when title shared one fixed-column grid
          with badge/date/pomodoro/duration columns that reserved space
          unconditionally, even with no metadata present). */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <button
          type="button"
          onClick={() => onToggle(task)}
          aria-label={done ? 'Mark as to do' : 'Mark as done'}
          className="shrink-0 flex items-center justify-center rounded-full border
                     transition-colors"
          style={{
            width:           18,
            height:          18,
            backgroundColor: done ? '#4B9EFF' : 'transparent',
            borderColor:     done ? '#4B9EFF' : '#222228',
          }}
        >
          {done && <Check size={10} strokeWidth={3} color="#ffffff" />}
        </button>

        <span
          className="min-w-0 flex-1 truncate text-sm"
          style={{
            color:          done ? '#7A7890' : '#E8E6F0',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
      </div>

      {/* Metadata — priority, due date, pomodoro count, duration. On md+ this
          becomes a fixed-column grid so values line up across rows regardless
          of content width or missing data. On mobile it's set to order-last +
          w-full so it always wraps onto its own line instead of competing
          with the title for space. */}
      {(task.priority || dueText || showPomCount || (sessionMins != null && sessionMins > 0)) && (
        <div
          className="order-last flex w-full flex-wrap items-center gap-2 pl-14
                     md:order-none md:w-auto md:grid md:flex-nowrap md:items-center
                     md:gap-2.5 md:pl-0"
          style={{ gridTemplateColumns: '90px 90px 70px 80px' }}
        >
          {/* Priority badge */}
          <div>
            {task.priority && (
              <PriorityBadge
                priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'}
                dimmed={done}
              />
            )}
          </div>

          {/* Due date */}
          <div>
            {dueText && (
              <span
                className="shrink-0"
                style={{ fontSize: 12, color: overdue ? '#F25C5C' : '#7A7890' }}
              >
                {dueText}
              </span>
            )}
          </div>

          {/* Pomodoro count */}
          <div className="flex md:justify-end">
            {showPomCount && (
              <span
                className="font-data inline-flex shrink-0 items-center gap-1 text-ink-muted"
                style={{ fontSize: 12 }}
              >
                {task.actual_pomodoros ?? 0}
                {task.estimated_pomodoros != null && ` / ${task.estimated_pomodoros}`}
                <Timer size={12} style={{ flexShrink: 0 }} />
              </span>
            )}
          </div>

          {/* Duration */}
          <div className="flex md:justify-end">
            {sessionMins != null && sessionMins > 0 && (
              <span
                className="flex shrink-0 items-center gap-1 font-data"
                style={{ fontSize: 12, color: '#3D3B4E' }}
              >
                <Clock size={11} style={{ color: '#3D3B4E', flexShrink: 0 }} />
                {formatMinutesToHours(sessionMins)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Three-dot menu — visible on hover only */}
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={e => e.stopPropagation()}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md
                     text-ink-secondary opacity-0 transition-all
                     hover:bg-depth-raised hover:text-ink-primary
                     group-hover:opacity-100"
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
  projectId:      string
  onEditTask:     (task: Task) => void
  onCreateTask?:  () => void
}

export function TaskListView({ projectId, onEditTask, onCreateTask }: TaskListViewProps) {
  const { data: tasks = [], isLoading } = useTasks(projectId)
  const { data: sessionMinsMap }        = useTaskSessionMins(projectId)

  const updateTask    = useUpdateTask()
  const deleteTask    = useDeleteTask()
  const duplicateTask = useDuplicateTask()
  const reorderTasks  = useReorderTasks(projectId)

  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [deleteTarget,   setDeleteTarget]   = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const filtered = tasks
    .filter(t => statusFilter   === 'all' || t.status   === statusFilter)
    .filter(t => priorityFilter === 'all' || t.priority === priorityFilter)

  const isEmpty  = tasks.length === 0
  const noMatch  = !isEmpty && filtered.length === 0

  function handleToggle(task: Task) {
    const isDone = task.status === 'done'
    updateTask.mutate({
      id: task.id,
      projectId,
      data: {
        status:       isDone ? 'todo' : 'done',
        completed_at: isDone ? null   : new Date().toISOString(),
      },
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = filtered.findIndex(t => t.id === active.id)
    const newIndex = filtered.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered    = arrayMove(filtered, oldIndex, newIndex)
    const withoutMoved = reordered.filter((_, i) => i !== newIndex)
    const newOrder     = getListOrder(withoutMoved, newIndex)

    reorderTasks.mutate([{ id: active.id as string, list_order: newOrder }])
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Filter bar */}
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex flex-col gap-1.5">
          <span
            style={{
              fontSize:      11,
              fontWeight:    600,
              letterSpacing: '0.08em',
              color:         '#7A7890',
              textTransform: 'uppercase',
            }}
          >
            Status
          </span>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            {(['todo', 'in_progress', 'done'] as const).map(s => (
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

        <div className="w-px self-stretch bg-depth-border" />

        <div className="flex flex-col gap-1.5">
          <span
            style={{
              fontSize:      11,
              fontWeight:    600,
              letterSpacing: '0.08em',
              color:         '#7A7890',
              textTransform: 'uppercase',
            }}
          >
            Priority
          </span>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill label="All" active={priorityFilter === 'all'} onClick={() => setPriorityFilter('all')} />
            {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
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

      {/* Empty states */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed
                        border-depth-border py-12 text-center">
          <p className="text-sm text-ink-muted">No tasks yet</p>
          {onCreateTask && (
            <button
              type="button"
              onClick={onCreateTask}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium
                         text-white transition-opacity hover:opacity-90"
            >
              Create task
            </button>
          )}
        </div>
      )}

      {noMatch && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed
                        border-depth-border py-10 text-center">
          <p className="text-sm text-ink-muted">No tasks match the current filters</p>
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setPriorityFilter('all') }}
            className="text-xs text-brand hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Task list */}
      {filtered.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {filtered.map(task => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  sessionMins={sessionMinsMap?.[task.id]}
                  onEdit={onEditTask}
                  onDeleteRequest={setDeleteTarget}
                  onToggle={handleToggle}
                  onDuplicate={id => duplicateTask.mutate(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteTask.mutate(
            { id: deleteTarget, projectId },
            { onSuccess: () => setDeleteTarget(null) },
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
