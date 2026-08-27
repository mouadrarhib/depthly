import { supabase } from '@/lib/supabase/client'
import { toAppError } from '@/lib/supabase/errors'
import type { Database, Tables } from '@/types/database'

export type Session = Tables<'sessions'>

export type SessionWithRelations = Session & {
  projects: { name: string; color: string } | null
  tasks: { title: string } | null
}

export type ActiveTimerRun = Tables<'active_timer_runs'>

export interface SessionMetadataInput {
  project_id: string | null
  task_id: string | null
  title: string | null
  notes: string | null
}

export interface StartTimerRunInput extends SessionMetadataInput {
  type: 'focus' | 'break'
  timer_mode: 'pomodoro' | 'free'
  target_seconds: number | null
  timezone: string
}

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>
type TrustedTimerRpc = (fn: string, params?: Record<string, unknown>) => RpcResult<unknown>
// Supabase's rpc method reads internal client state through `this`. Keep it
// bound to the client instead of storing a detached method reference.
const trustedRpc = supabase.rpc.bind(supabase) as unknown as TrustedTimerRpc

function throwRpcError(error: { message: string } | null): void {
  if (error) throw toAppError(error)
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export async function fetchSessionsByProject(projectId: string): Promise<SessionWithRelations[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, projects(name, color), tasks(title)')
    .eq('project_id', projectId)
    .eq('type', 'focus')
    .order('started_at', { ascending: false })
    .limit(50)

  throwRpcError(error)
  return (data ?? []) as SessionWithRelations[]
}

// 'all' returns both focus and break sessions. Defaults to 'focus' so every
// existing caller (e.g. the home page's recent-sessions list) keeps its
// current behavior unchanged.
export type SessionTypeFilter = 'all' | 'focus' | 'break'

export interface SessionPageFilters {
  type: SessionTypeFilter
  search: string
  timezone: string
  fromDate: string | null
  toDate: string | null
  projectId: string | null
  minDuration: number | null
  maxDuration: number | null
}

export async function fetchSessionCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  throwRpcError(error)
  return count ?? 0
}

export async function fetchSessionsPaginated(
  page: number,
  filters: SessionPageFilters,
  pageSize: number = 20,
): Promise<{ sessions: SessionWithRelations[]; totalCount: number }> {
  const { data, error } = await supabase.rpc('get_sessions_page', {
    p_page: page,
    p_page_size: pageSize,
    p_type: filters.type === 'all' ? null : filters.type,
    p_search: filters.search.trim() || null,
    p_timezone: filters.timezone,
    p_from_date: filters.fromDate,
    p_to_date: filters.toDate,
    p_project_id: filters.projectId,
    p_min_duration: filters.minDuration,
    p_max_duration: filters.maxDuration,
  })

  throwRpcError(error)
  const rows = data ?? []
  return {
    sessions: rows.map(({ project_name, project_color, task_title, total_count: _count, ...session }) => ({
      ...session,
      projects:
        project_name !== null && project_color !== null
          ? { name: project_name, color: project_color }
          : null,
      tasks: task_title ? { title: task_title } : null,
    })),
    totalCount: rows[0]?.total_count ?? 0,
  }
}

export async function fetchActiveTimerRun(userId: string): Promise<ActiveTimerRun | null> {
  const { data, error } = await supabase.from('active_timer_runs').select('*').eq('user_id', userId).maybeSingle()
  throwRpcError(error)
  return data
}

export async function startTimerRun(input: StartTimerRunInput): Promise<ActiveTimerRun> {
  const { data, error } = await trustedRpc('start_timer_run', {
    p_type: input.type, p_timer_mode: input.timer_mode, p_target_seconds: input.target_seconds,
    p_timezone: input.timezone, p_project_id: input.project_id, p_task_id: input.task_id,
    p_title: input.title, p_notes: input.notes,
  })
  throwRpcError(error)
  if (!data) throw new Error('Timer did not start')
  return data as ActiveTimerRun
}

async function timerRunAction(name: string, runId: string): Promise<ActiveTimerRun> {
  const { data, error } = await trustedRpc(name, { p_run_id: runId })
  throwRpcError(error)
  if (!data) throw new Error('Timer action failed')
  return data as ActiveTimerRun
}

export const pauseTimerRun = (id: string) => timerRunAction('pause_timer_run', id)
export const resumeTimerRun = (id: string) => timerRunAction('resume_timer_run', id)

export async function finishTimerRun(id: string, metadata: SessionMetadataInput): Promise<Session> {
  const { data, error } = await trustedRpc('finish_timer_run', { p_run_id: id, p_project_id: metadata.project_id,
    p_task_id: metadata.task_id, p_title: metadata.title, p_notes: metadata.notes })
  throwRpcError(error)
  if (!data) throw new Error('Session did not save')
  return data as Session
}

export async function cancelTimerRun(id: string): Promise<void> {
  const { error } = await trustedRpc('cancel_timer_run', { p_run_id: id })
  throwRpcError(error)
}

export async function updateSessionMetadata(id: string, data: SessionMetadataInput): Promise<Session> {
  const { data: updated, error } = await trustedRpc('update_session_metadata', {
    p_session_id: id, p_project_id: data.project_id, p_task_id: data.task_id,
    p_title: data.title, p_notes: data.notes,
  })
  throwRpcError(error)
  if (!updated) throw new Error('Session not found')
  return updated as Session
}

export async function fetchSessionsThisMonth(_userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_monthly_focus_session_count', {
    p_timezone: browserTimeZone(),
  })

  if (error) throw toAppError(error)
  return data ?? 0
}

export type ExportFilters = {
  startDate?:     string
  endDate?:       string
  projectId?:     string | null
  includeBreaks?: boolean // defaults to false — export is focus sessions only unless opted in
}

export async function fetchSessionsForExport(
  _userId: string,
  filters: ExportFilters,
): Promise<SessionWithRelations[]> {
  type ExportRow = Database['public']['Functions']['export_my_sessions']['Returns'][number]
  const pageSize = 500
  const sessions: SessionWithRelations[] = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.rpc('export_my_sessions', {
      p_start_date: filters.startDate ?? null,
      p_end_date: filters.endDate ?? null,
      p_project_id: filters.projectId ?? null,
      p_include_breaks: filters.includeBreaks ?? false,
      p_offset: offset,
      p_limit: pageSize,
      p_timezone: browserTimeZone(),
    })

    if (error) throw toAppError(error)
    const rows = (data ?? []) as ExportRow[]
    sessions.push(
      ...rows.map((row) => {
        const { project_name, project_color, task_title, ...session } = row
        return {
          ...session,
          projects:
            project_name && project_color ? { name: project_name, color: project_color } : null,
          tasks: task_title ? { title: task_title } : null,
        }
      }),
    )
    if (rows.length < pageSize) break
  }

  return sessions
}
