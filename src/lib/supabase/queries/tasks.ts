import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type Task = Tables<'tasks'>

export type CreateTaskInput = {
  project_id: string
  user_id: string
  title: string
  description?: string
  status?: 'todo' | 'in_progress' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  estimated_pomodoros?: number
  list_order: number
  kanban_order: number
}

export type UpdateTaskInput = {
  title?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null
  estimated_pomodoros?: number | null
  list_order?: number
  kanban_order?: number
  completed_at?: string | null
}

export async function fetchTasksByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('list_order', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchTaskById(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createTask(data: CreateTaskInput): Promise<Task> {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
  const { data: task, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function fetchSessionMinsByTask(projectId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('sessions')
    .select('task_id, duration_mins')
    .eq('project_id', projectId)
    .not('task_id', 'is', null)

  if (error) throw error

  const totals: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.task_id) {
      totals[row.task_id] = (totals[row.task_id] ?? 0) + row.duration_mins
    }
  }
  return totals
}

export async function duplicateTask(id: string): Promise<Task> {
  const original = await fetchTaskById(id)

  const { data: copy, error } = await supabase
    .from('tasks')
    .insert({
      project_id: original.project_id,
      user_id: original.user_id,
      title: `${original.title} (copy)`,
      description: original.description,
      status: original.status,
      priority: original.priority,
      due_date: original.due_date,
      estimated_pomodoros: original.estimated_pomodoros,
      list_order: original.list_order + 0.5,
      kanban_order: original.kanban_order + 0.5,
      completed_at: null,
      actual_pomodoros: 0,
    })
    .select()
    .single()

  if (error) throw error
  return copy
}
