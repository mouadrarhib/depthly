import { supabase } from '@/lib/supabase/client'
import type { Database, Tables } from '@/types/database'
import { getEffectiveStreak } from '@/lib/utils/streak'

type DailySummary = Tables<'daily_summaries'>
type Profile = Tables<'profiles'>
type Session = Tables<'sessions'>

export type SessionWithProject = Session & {
  projects: { name: string; color: string } | null
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function projectFilter(projectId: string | null | undefined): {
  p_project_id: string | null
  p_project_filter_mode: 'all' | 'assigned' | 'unassigned'
} {
  if (projectId === undefined) return { p_project_id: null, p_project_filter_mode: 'all' }
  if (projectId === null) return { p_project_id: null, p_project_filter_mode: 'unassigned' }
  return { p_project_id: projectId, p_project_filter_mode: 'assigned' }
}

function toSessionWithProject(
  row: Database['public']['Functions']['get_analytics_sessions']['Returns'][number],
): SessionWithProject {
  const { project_name, project_color, ...session } = row
  return {
    ...session,
    projects:
      project_name && project_color ? { name: project_name, color: project_color } : null,
  }
}

export async function fetchDailySummary(
  _userId: string,
  date: string
): Promise<DailySummary | null> {
  const { data, error } = await supabase.rpc('get_analytics_daily_summaries', {
    p_start_date: date,
    p_end_date: date,
    p_timezone: browserTimeZone(),
  })

  if (error) throw error
  return data?.[0] ?? null
}

export async function fetchDailySummariesRange(
  _userId: string,
  startDate: string,
  endDate: string
): Promise<DailySummary[]> {
  const { data, error } = await supabase.rpc('get_analytics_daily_summaries', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_timezone: browserTimeZone(),
  })

  if (error) throw error
  return data ?? []
}

export async function fetchSessionsForDay(
  _userId: string,
  date: string,
  projectId?: string | null
): Promise<SessionWithProject[]> {
  const { data, error } = await supabase.rpc('get_analytics_sessions', {
    p_start_date: date,
    p_end_date: date,
    p_timezone: browserTimeZone(),
    ...projectFilter(projectId),
  })

  if (error) throw error
  return (data ?? []).map(toSessionWithProject)
}

export type SessionProjectSlice = {
  duration_mins: number
  project_id: string | null
  projects: { name: string; color: string } | null
}

export type SessionProjectSliceWithDate = SessionProjectSlice & {
  started_at: string
}

export async function fetchSessionsForYear(
  _userId: string,
  year: number,
  projectId?: string | null
): Promise<SessionProjectSliceWithDate[]> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  const { data, error } = await supabase.rpc('get_analytics_sessions', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_timezone: browserTimeZone(),
    ...projectFilter(projectId),
  })

  if (error) throw error
  return (data ?? []).map(toSessionWithProject)
}

export async function fetchSessionsForWeek(
  _userId: string,
  startDate: string,
  endDate: string,
  projectId?: string | null
): Promise<SessionProjectSliceWithDate[]> {
  const { data, error } = await supabase.rpc('get_analytics_sessions', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_timezone: browserTimeZone(),
    ...projectFilter(projectId),
  })

  if (error) throw error
  return (data ?? []).map(toSessionWithProject)
}

export async function fetchSessionsAllTime(
  _userId: string,
  projectId?: string | null
): Promise<SessionProjectSliceWithDate[]> {
  const { data, error } = await supabase.rpc('get_analytics_sessions', {
    p_start_date: null,
    p_end_date: null,
    p_timezone: browserTimeZone(),
    ...projectFilter(projectId),
  })

  if (error) throw error
  return (data ?? []).map(toSessionWithProject)
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (error) throw error
  if (!data) return null

  // current_streak is stale until the next save_session() call — display
  // the corrected value everywhere this profile is consumed.
  return { ...data, current_streak: getEffectiveStreak(data.current_streak, data.last_focus_date) }
}
