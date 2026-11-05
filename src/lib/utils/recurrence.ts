import type { Task } from '@/lib/supabase/queries/tasks'
import { addDays, dateKey, fromDateKey } from '@/lib/utils/plannerDates'

export type OccurrenceState = 'done' | 'skipped'
export type PlannerEntry = {
  task: Task
  date: string
  recurring: boolean
  state: OccurrenceState | 'open'
}

/** ISO weekdays: Monday=1 through Sunday=7. */
export function isoWeekday(date: Date): number {
  return date.getDay() || 7
}

export function occursOn(task: Task, day: string): boolean {
  if (!task.repeat_days?.length || !task.repeat_start_date || task.status === 'done') return false
  if (day < task.repeat_start_date || (task.repeat_end_date && day > task.repeat_end_date))
    return false
  return task.repeat_days.includes(isoWeekday(fromDateKey(day)))
}

export function entriesForDay(
  tasks: Task[],
  states: Map<string, OccurrenceState>,
  day: string
): PlannerEntry[] {
  const entries: PlannerEntry[] = []
  for (const task of tasks) {
    if (occursOn(task, day)) {
      const state = states.get(`${task.id}:${day}`) ?? 'open'
      entries.push({ task, date: day, recurring: true, state })
    } else if (!task.repeat_days && task.scheduled_date === day) {
      entries.push({
        task,
        date: day,
        recurring: false,
        state: task.status === 'done' ? 'done' : 'open',
      })
    }
  }
  return entries
}

export function daysInRange(start: string, end: string): string[] {
  const days: string[] = []
  for (let current = fromDateKey(start); dateKey(current) <= end; current = addDays(current, 1)) {
    days.push(dateKey(current))
  }
  return days
}
