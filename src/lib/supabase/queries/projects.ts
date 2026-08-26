import { supabase } from '@/lib/supabase/client'
import { toAppError } from '@/lib/supabase/errors'
import type { Tables } from '@/types/database'

export type Project = Tables<'projects'>

export type CreateProjectInput = {
  name: string
  color: string
  icon: string | null
}

export type UpdateProjectInput = {
  name?: string
  color?: string
  icon?: string | null
  is_archived?: boolean
  last_used_at?: string
}

export type ProjectStats = {
  total_focus_minutes: number
  total_tasks: number
  completed_tasks: number
  session_count: number
  last_focused_at: string | null
}

export async function fetchProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw toAppError(error)
  return data
}

export async function fetchArchivedProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', true)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw toAppError(error)
  return data
}

export async function fetchProjectById(id: string): Promise<Project> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()

  if (error) throw toAppError(error)
  return data
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data, error } = await supabase.rpc('create_project', {
    p_name: input.name,
    p_color: input.color,
    p_icon: input.icon,
  })

  if (error) throw toAppError(error)
  if (!data) throw new Error('Project was not created')
  return data
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  if (input.is_archived !== undefined) {
    const { is_archived, ...metadata } = input
    if (Object.keys(metadata).length > 0) {
      throw new Error('Archive changes must be submitted separately from project edits')
    }
    return setProjectArchived(id, is_archived)
  }

  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw toAppError(error)
  return data
}

export async function setProjectArchived(id: string, archived: boolean): Promise<Project> {
  const { data, error } = await supabase.rpc('set_project_archived', {
    p_project_id: id,
    p_archived: archived,
  })

  if (error) throw error
  if (!data) throw new Error('Project was not updated')
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) throw error
}

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const [sessionsResult, tasksResult] = await Promise.all([
    supabase
      .from('sessions')
      .select('duration_mins, started_at')
      .eq('project_id', projectId)
      .eq('type', 'focus'),
    supabase.from('tasks').select('status').eq('project_id', projectId),
  ])

  if (sessionsResult.error) throw sessionsResult.error
  if (tasksResult.error) throw tasksResult.error

  const total_focus_minutes = sessionsResult.data.reduce((sum, s) => sum + s.duration_mins, 0)
  const total_tasks = tasksResult.data.length
  const completed_tasks = tasksResult.data.filter((t) => t.status === 'done').length

  const session_count = sessionsResult.data.length
  const last_focused_at = sessionsResult.data.reduce<string | null>(
    (latest, session) => (!latest || session.started_at > latest ? session.started_at : latest),
    null
  )

  return { total_focus_minutes, total_tasks, completed_tasks, session_count, last_focused_at }
}
