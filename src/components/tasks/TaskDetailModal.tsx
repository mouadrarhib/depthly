import { Timer, Clock, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import type { Task } from '@/lib/supabase/queries/tasks'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import { formatDueDate, isOverdue, STATUS_CONFIG } from '@/lib/utils/tasks'

interface TaskDetailModalProps {
  open:         boolean
  onClose:      () => void
  task:         Task | null
  sessionMins?: number
  onEdit:       (task: Task) => void
  onStartTimer: (task: Task) => void
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex flex-col gap-1">
      <span
        style={{
          fontSize:      11,
          fontWeight:    600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         '#7A7890',
        }}
      >
        {label}
      </span>
      <div className="min-w-0" style={{ fontSize: 13, color: '#E8E6F0' }}>{children}</div>
    </div>
  )
}

export function TaskDetailModal({ open, onClose, task, sessionMins, onEdit, onStartTimer }: TaskDetailModalProps) {
  if (!task) return null

  const done      = task.status === 'done'
  const overdue   = isOverdue(task.due_date, task.status ?? '')
  const dueText   = formatDueDate(task.due_date)
  const statusCfg = STATUS_CONFIG[(task.status ?? 'todo') as 'todo' | 'in_progress' | 'done']

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-depth-surface border-depth-border max-w-md">
        <DialogHeader>
          <DialogTitle
            className="text-ink-primary"
            style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}
          >
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="min-w-0 flex flex-col gap-4 pt-1">

          {/* Status + priority pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                fontSize:        11,
                fontWeight:      500,
                backgroundColor: `${statusCfg.color}26`,
                color:           statusCfg.color,
                border:          `1px solid ${statusCfg.color}66`,
              }}
            >
              {statusCfg.label}
            </span>
            {task.priority && (
              <PriorityBadge priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'} />
            )}
          </div>

          {/* Description */}
          <DetailRow label="Description">
            {task.description ? (
              <p
                className="min-w-0 max-h-40 overflow-y-auto whitespace-pre-wrap break-words"
                style={{ lineHeight: 1.5, color: '#B0AECB' }}
              >
                {task.description}
              </p>
            ) : (
              <span style={{ color: '#3D3B4E', fontStyle: 'italic' }}>No description</span>
            )}
          </DetailRow>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Due date">
              {dueText ? (
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: overdue ? '#F25C5C' : '#E8E6F0' }}
                >
                  <Calendar size={13} />
                  {dueText}
                </span>
              ) : (
                <span style={{ color: '#3D3B4E' }}>—</span>
              )}
            </DetailRow>

            <DetailRow label="Focus sessions">
              <span className="font-data inline-flex items-center gap-1.5">
                <Timer size={13} style={{ color: '#7A7890' }} />
                {task.actual_pomodoros ?? 0}
                {task.estimated_pomodoros != null && ` / ${task.estimated_pomodoros}`}
              </span>
            </DetailRow>

            <DetailRow label="Time logged">
              <span className="font-data inline-flex items-center gap-1.5">
                <Clock size={13} style={{ color: '#7A7890' }} />
                {sessionMins != null && sessionMins > 0 ? formatMinutesToHours(sessionMins) : '—'}
              </span>
            </DetailRow>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onEdit(task)}>
            Edit
          </Button>
          <Button variant="primary" onClick={() => onStartTimer(task)} style={{ gap: 8 }}>
            <Timer size={15} />
            Start Timer
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
