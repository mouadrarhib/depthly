import type { Task } from '@/lib/supabase/queries/tasks'

export const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#7A7890' },
  medium: { label: 'Medium', color: '#4B9EFF' },
  high:   { label: 'High',   color: '#F5A623' },
  urgent: { label: 'Urgent', color: '#F25C5C' },
} as const

export const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: '#7A7890' },
  in_progress: { label: 'In Progress', color: '#4B9EFF' },
  done:        { label: 'Done',        color: '#3DD68C' },
} as const

export function formatDueDate(date: string | null): string {
  if (!date) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Append time to avoid UTC offset shifting the date
  const due = new Date(`${date}T00:00:00`)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0)  return 'Today'
  if (diffDays === 1)  return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) {
    return due.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isOverdue(due_date: string | null, status: string): boolean {
  if (!due_date || status === 'done') return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(`${due_date}T00:00:00`)
  due.setHours(0, 0, 0, 0)

  return due < today
}

export function getListOrder(tasks: Task[], index: number): number {
  if (tasks.length === 0) return 1
  if (index <= 0) return tasks[0].list_order - 1
  if (index >= tasks.length) return tasks[tasks.length - 1].list_order + 1
  return (tasks[index - 1].list_order + tasks[index].list_order) / 2
}

export function getKanbanOrder(tasks: Task[], index: number): number {
  if (tasks.length === 0) return 1
  if (index <= 0) return tasks[0].kanban_order - 1
  if (index >= tasks.length) return tasks[tasks.length - 1].kanban_order + 1
  return (tasks[index - 1].kanban_order + tasks[index].kanban_order) / 2
}
