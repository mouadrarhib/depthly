import { useQuery } from '@tanstack/react-query'

import { analyticsKeys } from '@/lib/queryKeys'
import {
  fetchProfile,
  fetchDailySummary,
  fetchDailySummariesRange,
  fetchSessionsForDay,
  fetchSessionsForYear,
  fetchSessionsForWeek,
  fetchSessionsAllTime,
} from '@/lib/supabase/queries/analytics'
import { useAuthStore } from '@/store/authStore'

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.profile(userId),
    queryFn: () => fetchProfile(userId),
    enabled: !!userId,
  })
}

export function useDailySummary(date: string) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.daily(userId, date),
    queryFn: () => fetchDailySummary(userId, date),
    enabled: !!userId,
  })
}

export function useDailySummariesRange(start: string, end: string) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.dailyRange(userId, start, end),
    queryFn: () => fetchDailySummariesRange(userId, start, end),
    enabled: !!userId && !!start && !!end,
  })
}

function projectScopeKey(projectId: string | null | undefined): string {
  return projectId === undefined ? 'all' : (projectId ?? 'unassigned')
}

export function useSessionsForDay(date: string, projectId?: string | null) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsForDay(userId, date, projectScopeKey(projectId)),
    queryFn: () => fetchSessionsForDay(userId, date, projectId),
    enabled: !!userId,
  })
}

export function useSessionsForYear(year: number, projectId?: string | null) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsForYear(userId, year, projectScopeKey(projectId)),
    queryFn: () => fetchSessionsForYear(userId, year, projectId),
    enabled: !!userId,
  })
}

export function useSessionsForWeek(
  startDate: string,
  endDate: string,
  projectId?: string | null,
  enabled = true
) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsForWeek(userId, startDate, endDate, projectScopeKey(projectId)),
    queryFn: () => fetchSessionsForWeek(userId, startDate, endDate, projectId),
    enabled: enabled && !!userId && !!startDate && !!endDate,
  })
}

export function useSessionsAllTime(projectId?: string | null) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsAllTime(userId, projectScopeKey(projectId)),
    queryFn: () => fetchSessionsAllTime(userId, projectId),
    enabled: !!userId,
  })
}
