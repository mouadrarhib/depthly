import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type TaskOccurrence = Tables<'task_occurrences'>
export type OccurrenceState = 'done' | 'skipped'

export async function fetchTaskOccurrences(
  userId: string,
  start: string,
  end: string
): Promise<TaskOccurrence[]> {
  const rows: TaskOccurrence[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('task_occurrences')
      .select('*')
      .eq('user_id', userId)
      .gte('occurrence_date', start)
      .lte('occurrence_date', end)
      .order('occurrence_date')
      .order('id')
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return rows
}

export async function setTaskOccurrence(input: {
  taskId: string
  userId: string
  date: string
  state: OccurrenceState | 'open'
}): Promise<void> {
  if (input.state === 'open') {
    const { error } = await supabase
      .from('task_occurrences')
      .delete()
      .eq('task_id', input.taskId)
      .eq('occurrence_date', input.date)
      .eq('user_id', input.userId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('task_occurrences').upsert(
    {
      task_id: input.taskId,
      user_id: input.userId,
      occurrence_date: input.date,
      state: input.state,
      completed_at: input.state === 'done' ? new Date().toISOString() : null,
    },
    { onConflict: 'task_id,occurrence_date' }
  )
  if (error) throw error
}
