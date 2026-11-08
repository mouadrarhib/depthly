import { useState } from 'react'

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'

import { KanbanColumn } from '@/components/tasks/KanbanColumn'
import { FilterPill } from '@/components/tasks/TaskListView'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import {
  useTasks,
  useTaskSessionMins,
  useDeleteTask,
  useDuplicateTask,
  useReorderKanban,
} from '@/hooks/useTasks'
import type { Task } from '@/lib/supabase/queries/tasks'
import { formatDueDate, isOverdue, getKanbanOrder, PRIORITY_CONFIG } from '@/lib/utils/tasks'

type Status = 'todo' | 'in_progress' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type PriorityFilter = 'all' | Priority

const COLUMNS: Status[] = ['todo', 'in_progress', 'done']

interface TaskKanbanViewProps {
  filters?: { search: string; status: string; priority: string }
  onClearFilters?: () => void
  projectId: string
  onOpenTask: (task: Task) => void
  onEditTask: (task: Task) => void
  onAddTask?: (status: string) => void
}

export function TaskKanbanView({
  projectId,
  onOpenTask,
  onEditTask,
  onAddTask,
  filters,
  onClearFilters,
}: TaskKanbanViewProps) {
  const { data: tasks = [], isLoading, isError, refetch } = useTasks(projectId)
  const { data: sessionMinsMap } = useTaskSessionMins(projectId)

  const deleteTask = useDeleteTask()
  const duplicateTask = useDuplicateTask()
  const reorderKanban = useReorderKanban(projectId)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filteredTasks = tasks.filter(
    (t) =>
      (!filters?.search ||
        t.title.toLocaleLowerCase().includes(filters.search.trim().toLocaleLowerCase())) &&
      (!filters || filters.status === 'all' || t.status === filters.status) &&
      ((filters?.priority ?? priorityFilter) === 'all' ||
        t.priority === (filters?.priority ?? priorityFilter))
  )

  function getColumnTasks(status: Status): Task[] {
    return filteredTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.kanban_order - b.kanban_order)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string
    if (draggedId === overId) return

    const draggedTask = tasks.find((t) => t.id === draggedId)
    if (!draggedTask) return

    const sourceStatus = draggedTask.status as Status

    // over.id is either a column status string or a task id
    const isColumnDrop = (COLUMNS as string[]).includes(overId)
    const overTask = isColumnDrop ? undefined : tasks.find((t) => t.id === overId)
    const targetStatus = (isColumnDrop ? overId : overTask?.status) as Status | undefined

    if (!targetStatus) return

    // Target column tasks without the dragged item, sorted by kanban_order
    const targetColumnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== draggedId)
      .sort((a, b) => a.kanban_order - b.kanban_order)

    const rawIndex = overTask ? targetColumnTasks.findIndex((t) => t.id === overId) : -1
    const insertAt = rawIndex < 0 ? targetColumnTasks.length : rawIndex
    const newOrder = getKanbanOrder(targetColumnTasks, insertAt)

    if (sourceStatus === targetStatus) {
      reorderKanban.mutate([{ id: draggedId, kanban_order: newOrder }])
    } else {
      reorderKanban.mutate([{ id: draggedId, kanban_order: newOrder, status: targetStatus }])
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

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
      <div className="flex gap-4 overflow-x-auto">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="shrink-0 animate-pulse rounded-lg bg-depth-surface"
            style={{ width: 300, height: 420 }}
          />
        ))}
      </div>
    )
  }

  // ─── Board ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Standalone priority filter */}
      {!filters && (
        <div className="flex flex-wrap gap-1.5">
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
      )}
      {filters && tasks.length > 0 && filteredTasks.length === 0 && (
        <div className="py-6 text-center text-sm text-ink-primary/75">
          No tasks match these filters.{' '}
          <button className="min-h-11 text-brand" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="grid grid-cols-1 items-stretch gap-4 pb-4 md:grid-cols-3">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getColumnTasks(status)}
              sessionMinsMap={sessionMinsMap}
              onOpenTask={onOpenTask}
              onEditTask={onEditTask}
              onDeleteTask={(task) => deleteTask.mutate({ id: task.id, projectId })}
              onDuplicateTask={(task) => duplicateTask.mutate(task.id)}
              onAddTask={onAddTask ?? (() => {})}
            />
          ))}
        </div>

        {/* Drag overlay — inline card to avoid useSortable re-entrant isDragging */}
        <DragOverlay>
          {activeTask && (
            <div
              className="flex flex-col gap-2.5 border border-depth-border bg-depth-surface p-3"
              style={{ width: 300, opacity: 0.9, borderRadius: 10, cursor: 'grabbing' }}
            >
              <div className="flex items-center gap-2">
                {activeTask.priority && (
                  <PriorityBadge
                    priority={activeTask.priority as 'low' | 'medium' | 'high' | 'urgent'}
                  />
                )}
              </div>

              <p
                className="line-clamp-2 font-medium leading-snug"
                style={{ fontSize: 13, color: 'var(--color-text)' }}
              >
                {activeTask.title}
              </p>

              {formatDueDate(activeTask.due_date) && (
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      fontSize: 11,
                      color: isOverdue(activeTask.due_date, activeTask.status ?? '')
                        ? '#F25C5C'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {formatDueDate(activeTask.due_date)}
                  </span>
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
