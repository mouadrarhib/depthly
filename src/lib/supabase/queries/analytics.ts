import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'
import { getEffectiveStreak } from '@/lib/utils/streak'

type DailySummary = Tables<'daily_summaries'>
type UserStats = Tables<'user_stats'>
type Profile = Tables<'profiles'>
type Session = Tables<'sessions'>

export type SessionWithProject = Session & {
  projects: { name: string; color: string } | null
}

export async function fetchDailySummary(
  userId: string,
  date: string
): Promise<DailySummary | null> {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchDailySummariesRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchSessionsForDay(
  userId: string,
  date: string
): Promise<SessionWithProject[]> {
  // Parse date as LOCAL midnight so the range spans the full local calendar day,
  // not a UTC-midnight-to-UTC-midnight window (which shifts by the user's offset).
  const [y, m, d] = date.split('-').map(Number)
  const startOfDay = new Date(y, m - 1, d)
  const endOfDay   = new Date(y, m - 1, d + 1)

  const { data, error } = await supabase
    .from('sessions')
    .select('*, projects(name, color)')
    .eq('user_id', userId)
    .eq('type', 'focus')
    .gte('started_at', startOfDay.toISOString())
    .lt('started_at', endOfDay.toISOString())
    .order('started_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as SessionWithProject[]
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
  userId: string,
  year: number
): Promise<SessionProjectSliceWithDate[]> {
  const startOfYear = new Date(year, 0, 1)
  const endOfYear   = new Date(year + 1, 0, 1)

  const { data, error } = await supabase
    .from('sessions')
    .select('duration_mins, project_id, started_at, projects(name, color)')
    .eq('user_id', userId)
    .eq('type', 'focus')
    .gte('started_at', startOfYear.toISOString())
    .lt('started_at', endOfYear.toISOString())

  if (error) throw error
  return (data ?? []) as SessionProjectSliceWithDate[]
}

export async function fetchSessionsForWeek(
  userId: string,
  startDate: string,
  endDate: string
): Promise<SessionProjectSliceWithDate[]> {
  // Parse both bounds as LOCAL midnight so the range spans full local
  // calendar days, not a UTC-midnight-to-UTC-midnight window — same
  // approach as fetchSessionsForDay, extended to a date range.
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const startOfRange = new Date(sy, sm - 1, sd)
  const endOfRange   = new Date(ey, em - 1, ed + 1)

  const { data, error } = await supabase
    .from('sessions')
    .select('duration_mins, project_id, started_at, projects(name, color)')
    .eq('user_id', userId)
    .eq('type', 'focus')
    .gte('started_at', startOfRange.toISOString())
    .lt('started_at', endOfRange.toISOString())

  if (error) throw error
  return (data ?? []) as SessionProjectSliceWithDate[]
}

export async function fetchSessionsAllTime(
  userId: string
): Promise<SessionProjectSlice[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('duration_mins, project_id, projects(name, color)')
    .eq('user_id', userId)
    .eq('type', 'focus')

  if (error) throw error
  return (data ?? []) as SessionProjectSlice[]
}

export async function fetchUserStats(
  userId: string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  periodKey: string
): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchUserStatsRange(
  userId: string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  periodKeys: string[]
): Promise<UserStats[]> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .in('period_key', periodKeys)

  if (error) throw error
  return data ?? []
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // current_streak is stale until the next save_session() call — display
  // the corrected value everywhere this profile is consumed.
  return { ...data, current_streak: getEffectiveStreak(data.current_streak, data.last_focus_date) }
}
