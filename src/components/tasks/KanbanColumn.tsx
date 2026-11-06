import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'

import { KanbanCard } from '@/components/tasks/KanbanCard'
import type { Task } from '@/lib/supabase/queries/tasks'

type Status = 'todo' | 'in_progress' | 'done'

const COLUMN_MAX_HEIGHT = 640

const COLUMN_CONFIG: Record<Status, { bg: string; color: string; label: string }> = {
  todo: { bg: 'rgba(122, 120, 144, 0.06)', color: '#7A7890', label: 'To Do' },
  in_progress: { bg: 'rgba(75, 158, 255, 0.06)', color: '#4B9EFF', label: 'In Progress' },
  done: { bg: 'rgba(61, 214, 140, 0.06)', color: '#3DD68C', label: 'Done' },
}

interface KanbanColumnProps {
  status: Status
  tasks: Task[]
  sessionMinsMap?: Record<string, number>
  onOpenTask: (task: Task) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onDuplicateTask: (task: Task) => void
  onAddTask: (status: string) => void
}

export function KanbanColumn({
  status,
  tasks,
  sessionMinsMap,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onAddTask,
}: KanbanColumnProps) {
  const cfg = COLUMN_CONFIG[status]

  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      style={{
        width: '100%',
        minWidth: 0,
        minHeight: 340,
        maxHeight: COLUMN_MAX_HEIGHT,
        borderRadius: 14,
        padding: 16,
        border: '1px solid rgba(46, 46, 56, 0.8)',
        backgroundColor: 'var(--color-depth-surface, #141417)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <div className="mb-4 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: cfg.color,
              flexShrink: 0,
            }}
          />

          {/* Label */}
          <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>

          {/* Count badge */}
          <span
            style={{
              backgroundColor: `${cfg.color}26`,
              color: cfg.color,
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {tasks.length}
          </span>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={() => onAddTask(status)}
          aria-label={`Add task to ${cfg.label}`}
          className="flex h-11 w-11 items-center justify-center rounded-md text-ink-primary/70 transition-colors hover:bg-depth-raised hover:text-ink-primary"
          style={{ borderRadius: 6 }}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 transition-colors"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          borderRadius: 8,
          padding: 4,
          backgroundColor: isOver ? 'rgba(46, 46, 56, 0.35)' : 'transparent',
          border: isOver ? '1px dashed rgba(46, 46, 56, 0.8)' : '1px dashed transparent',
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-ink-primary/75">
                {status === 'in_progress'
                  ? 'No tasks in progress'
                  : status === 'done'
                    ? 'No completed tasks yet'
                    : 'No tasks to do'}
              </p>
              <p className="text-xs leading-5 text-ink-primary/60">
                {status === 'in_progress'
                  ? 'Move a task here when you begin.'
                  : status === 'done'
                    ? 'Finished tasks will appear here.'
                    : 'Add a task to plan your next step.'}
              </p>
              <button
                onClick={() => onAddTask(status)}
                className="min-h-11 rounded-md border border-depth-border px-3 text-xs text-brand"
              >
                + Add task
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                sessionMins={sessionMinsMap?.[task.id]}
                onOpen={onOpenTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onDuplicate={onDuplicateTask}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
