import type { PostgrestError } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type Session = Tables<'sessions'>

export type SessionWithRelations = Session & {
  projects: { name: string; color: string } | null
  tasks: { title: string } | null
}

export interface SaveSessionParams {
  p_user_id:       string
  p_project_id:    string | null
  p_task_id:       string | null
  p_type:          'focus' | 'break'
  p_duration_mins: number
  p_started_at:    string
  p_ended_at:      string
  p_timer_mode:    'pomodoro' | 'custom' | 'free'  // mapped to timer_mode_type in DB
  p_notes:         string | null
}

export interface UpdateSessionInput {
  project_id?:    string | null
  task_id?:       string | null
  duration_mins?: number
  started_at?:    string
  ended_at?:      string
  notes?:         string | null
}

export interface CreateManualSessionInput {
  user_id:       string
  project_id:    string | null
  task_id:       string | null
  duration_mins: number
  started_at:    string
  ended_at:      string
  notes:         string | null
}

// save_session is a SECURITY DEFINER RPC that writes to sessions,
// daily_summaries, user_stats, and profiles atomically.
// It is not yet in the generated types — cast rpc to accept it explicitly.
type RpcFn = (
  fn: 'save_session',
  params: SaveSessionParams
) => Promise<{ data: Session | null; error: PostgrestError | null }>

// Variant that allows null for p_timer_mode (the RPC accepts text, which is nullable).
type RpcFnNullableMode = (
  fn: 'save_session',
  params: Omit<SaveSessionParams, 'p_timer_mode'> & { p_timer_mode: string | null }
) => Promise<{ data: Session | null; error: PostgrestError | null }>

export async function fetchSessionsByProject(projectId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('project_id', projectId)
    .eq('type', 'focus')
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

export async function fetchSessionsPaginated(
  userId: string,
  page: number,
  pageSize: number = 20,
): Promise<{ sessions: SessionWithRelations[]; totalCount: number }> {
  const from = page * pageSize
  const to   = page * pageSize + pageSize - 1

  const { data, error, count } = await supabase
    .from('sessions')
    .select('*, projects(name, color), tasks(title)', { count: 'exact' })
    .eq('user_id', userId)
    .eq('type', 'focus')
    .order('started_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return {
    sessions:   (data ?? []) as SessionWithRelations[],
    totalCount: count ?? 0,
  }
}

export async function saveSession(params: SaveSessionParams): Promise<Session> {
  const { data, error } = await (supabase.rpc as unknown as RpcFn)(
    'save_session',
    params
  )

  if (error) throw error
  if (!data)  throw new Error('save_session returned no data')

  return data
}

export async function updateSession(id: string, data: UpdateSessionInput): Promise<Session> {
  // KNOWN LIMITATION: changing duration_mins, started_at, or ended_at does NOT
  // recalculate daily_summaries or user_stats — those aggregates will be stale.
  const { data: updated, error } = await supabase
    .from('sessions')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function deleteSession(id: string): Promise<void> {
  // KNOWN LIMITATION: deleting a session does NOT recalculate daily_summaries
  // or user_stats — those aggregates will remain inflated until the next
  // scheduled recalculation or manual correction.
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function fetchSessionsThisMonth(userId: string): Promise<number> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'focus')
    .gte('started_at', firstOfMonth)

  if (error) throw error
  return count ?? 0
}

export async function createManualSession(data: CreateManualSessionInput): Promise<Session> {
  // Routes through save_session() RPC so daily_summaries and user_stats stay correct.
  // The RPC does not expose an is_manual parameter (the DB column defaults to false);
  // p_timer_mode is passed as null, which the RPC coerces to 'pomodoro' internally.
  const { data: session, error } = await (supabase.rpc as unknown as RpcFnNullableMode)(
    'save_session',
    {
      p_user_id:       data.user_id,
      p_project_id:    data.project_id,
      p_task_id:       data.task_id,
      p_type:          'focus',
      p_duration_mins: data.duration_mins,
      p_started_at:    data.started_at,
      p_ended_at:      data.ended_at,
      p_timer_mode:    null,
      p_notes:         data.notes,
    }
  )

  if (error) throw error
  if (!session) throw new Error('save_session returned no data')
  return session
}
