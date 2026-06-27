import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type Task = Tables<'tasks'>

export const taskKeys = {
  all:           ['tasks']                                       as const,
  byProject:     (projectId: string) => ['tasks', projectId]    as const,
}

export async function fetchTasksByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'done')
    .order('list_order', { ascending: true })

  if (error) throw error
  return data
}
