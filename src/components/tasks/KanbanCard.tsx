import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, MoreHorizontal } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { formatDueDate, isOverdue } from '@/lib/utils/tasks'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import type { Task } from '@/lib/supabase/queries/tasks'

interface KanbanCardProps {
  task:         Task
  sessionMins?: number
  onEdit:       (task: Task) => void
  onDelete:     (task: Task) => void
  onDuplicate:  (task: Task) => void
}

export function KanbanCard({ task, sessionMins, onEdit, onDelete, onDuplicate }: KanbanCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const done      = task.status === 'done'
  const overdue   = isOverdue(task.due_date, task.status ?? '')
  const dueText   = formatDueDate(task.due_date)
  const showHover = isHovered && !isDragging

  const showPomCount =
    (task.actual_pomodoros != null && task.actual_pomodoros > 0) ||
    task.estimated_pomodoros != null

  const showSessionTime = sessionMins != null && sessionMins > 0
  const showBottom      = !!dueText || showPomCount || showSessionTime

  // Merge dnd-kit's transform transition with visual transitions
  const visualTransition = 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease'
  const composedTransition = transition
    ? `${transition}, ${visualTransition}`
    : visualTransition

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform:       CSS.Transform.toString(transform),
        transition:      composedTransition,
        borderRadius:    10,
        padding:         12,
        backgroundColor: showHover ? '#222228' : '#141417',
        border:          showHover
          ? '1px solid rgba(75, 158, 255, 0.3)'
          : '1px solid #2E2E38',
        boxShadow:       showHover ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
        opacity:         isDragging ? 0.5 : 1,
        outline:         isDragging ? '1px solid #4B9EFF' : 'none',
        cursor:          isDragging ? 'grabbing' : 'grab',
      }}
      {...attributes}
      {...listeners}
      className="group flex flex-col"
    >
      {/* Top row: priority badge + menu */}
      <div className="flex items-center justify-between gap-2">
        {task.priority ? (
          <PriorityBadge priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'} />
        ) : (
          <span />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md
                       text-ink-muted transition-colors
                       hover:bg-depth-raised hover:text-ink-primary
                       opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <MoreHorizontal size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={() => onEdit(task)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(task)}>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(task)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <p
        className="line-clamp-2 leading-snug"
        style={{
          fontSize:       13,
          fontWeight:     500,
          color:          '#E8E6F0',
          marginTop:      8,
          textDecoration: done ? 'line-through' : 'none',
          opacity:        done ? 0.5 : 1,
        }}
      >
        {task.title}
      </p>

      {/* Bottom row */}
      {showBottom && (
        <div
          className="flex items-center gap-3"
          style={{
            marginTop:  10,
            paddingTop: 10,
            borderTop:  '1px solid #2E2E38',
          }}
        >
          {/* Due date chip */}
          {dueText && (
            <span
              style={overdue ? {
                backgroundColor: 'rgba(242, 92, 92, 0.1)',
                color:           '#F25C5C',
                border:          '1px solid rgba(242, 92, 92, 0.2)',
                borderRadius:    6,
                padding:         '2px 8px',
                fontSize:        11,
              } : {
                backgroundColor: '#222228',
                color:           '#7A7890',
                border:          '1px solid transparent',
                borderRadius:    6,
                padding:         '2px 8px',
                fontSize:        11,
              }}
            >
              {dueText}
            </span>
          )}

          {/* Pomodoro count */}
          {showPomCount && (
            <span className="font-data text-ink-muted" style={{ fontSize: 11 }}>
              {task.actual_pomodoros ?? 0}
              {task.estimated_pomodoros != null && ` / ${task.estimated_pomodoros}`}
              {' 🍅'}
            </span>
          )}

          {/* Total session time */}
          {showSessionTime && (
            <span
              className="ml-auto flex items-center gap-1 font-data"
              style={{ fontSize: 11, color: '#3D3B4E' }}
            >
              <Clock size={10} style={{ color: '#3D3B4E', flexShrink: 0 }} />
              {formatMinutesToHours(sessionMins!)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
