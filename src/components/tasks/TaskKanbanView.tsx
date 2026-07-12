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
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import {
  useTasks,
  useTaskSessionMins,
  useDeleteTask,
  useDuplicateTask,
  useReorderKanban,
} from '@/hooks/useTasks'
import { formatDueDate, isOverdue, getKanbanOrder } from '@/lib/utils/tasks'
import type { Task } from '@/lib/supabase/queries/tasks'

type Status = 'todo' | 'in_progress' | 'done'

const COLUMNS: Status[] = ['todo', 'in_progress', 'done']

interface TaskKanbanViewProps {
  projectId:   string
  onEditTask:  (task: Task) => void
  onAddTask?:  (status: string) => void
}

export function TaskKanbanView({ projectId, onEditTask, onAddTask }: TaskKanbanViewProps) {
  const { data: tasks = [], isLoading } = useTasks(projectId)
  const { data: sessionMinsMap }        = useTaskSessionMins(projectId)

  const deleteTask    = useDeleteTask()
  const duplicateTask = useDuplicateTask()
  const reorderKanban = useReorderKanban(projectId)

  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getColumnTasks(status: Status): Task[] {
    return tasks
      .filter(t => t.status === status)
      .sort((a, b) => a.kanban_order - b.kanban_order)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find(t => t.id === event.active.id) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const draggedId = active.id as string
    const overId    = over.id   as string
    if (draggedId === overId) return

    const draggedTask = tasks.find(t => t.id === draggedId)
    if (!draggedTask) return

    const sourceStatus = draggedTask.status as Status

    // over.id is either a column status string or a task id
    const isColumnDrop = (COLUMNS as string[]).includes(overId)
    const overTask     = isColumnDrop ? undefined : tasks.find(t => t.id === overId)
    const targetStatus = (isColumnDrop ? overId : overTask?.status) as Status | undefined

    if (!targetStatus) return

    // Target column tasks without the dragged item, sorted by kanban_order
    const targetColumnTasks = tasks
      .filter(t => t.status === targetStatus && t.id !== draggedId)
      .sort((a, b) => a.kanban_order - b.kanban_order)

    const rawIndex  = overTask ? targetColumnTasks.findIndex(t => t.id === overId) : -1
    const insertAt  = rawIndex < 0 ? targetColumnTasks.length : rawIndex
    const newOrder  = getKanbanOrder(targetColumnTasks, insertAt)

    if (sourceStatus === targetStatus) {
      reorderKanban.mutate([{ id: draggedId, kanban_order: newOrder }])
    } else {
      reorderKanban.mutate([{ id: draggedId, kanban_order: newOrder, status: targetStatus }])
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto">
        {COLUMNS.map(col => (
          <div
            key={col}
            className="animate-pulse shrink-0 rounded-lg bg-depth-surface"
            style={{ width: 300, height: 420 }}
          />
        ))}
      </div>
    )
  }

  // ─── Board ────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            sessionMinsMap={sessionMinsMap}
            onEditTask={onEditTask}
            onDeleteTask={task => deleteTask.mutate({ id: task.id, projectId })}
            onDuplicateTask={task => duplicateTask.mutate(task.id)}
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
              style={{ fontSize: 13, color: '#E8E6F0' }}
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
                      : '#7A7890',
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
  )
}
