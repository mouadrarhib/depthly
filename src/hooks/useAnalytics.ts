import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { analyticsKeys } from '@/lib/queryKeys'
import {
  fetchProfile,
  fetchDailySummary,
  fetchDailySummariesRange,
  fetchSessionsForDay,
  fetchSessionsForYear,
  fetchSessionsForWeek,
  fetchSessionsAllTime,
  fetchUserStats,
  fetchUserStatsRange,
} from '@/lib/supabase/queries/analytics'

export function useProfile() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.profile(userId),
    queryFn:  () => fetchProfile(userId),
    enabled:  !!userId,
  })
}

export function useDailySummary(date: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.daily(userId, date),
    queryFn:  () => fetchDailySummary(userId, date),
    enabled:  !!userId,
  })
}

export function useDailySummariesRange(start: string, end: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.dailyRange(userId, start, end),
    queryFn:  () => fetchDailySummariesRange(userId, start, end),
    enabled:  !!userId && !!start && !!end,
  })
}

export function useSessionsForDay(date: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsForDay(userId, date),
    queryFn:  () => fetchSessionsForDay(userId, date),
    enabled:  !!userId,
  })
}

export function useSessionsForYear(year: number) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsForYear(userId, year),
    queryFn:  () => fetchSessionsForYear(userId, year),
    enabled:  !!userId,
  })
}

export function useSessionsForWeek(startDate: string, endDate: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsForWeek(userId, startDate, endDate),
    queryFn:  () => fetchSessionsForWeek(userId, startDate, endDate),
    enabled:  !!userId && !!startDate && !!endDate,
  })
}

export function useSessionsAllTime() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.sessionsAllTime(userId),
    queryFn:  () => fetchSessionsAllTime(userId),
    enabled:  !!userId,
  })
}

export function useUserStats(periodType: string, periodKey: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.userStats(userId, periodType, periodKey),
    queryFn:  () => fetchUserStats(
      userId,
      periodType as 'daily' | 'weekly' | 'monthly' | 'yearly',
      periodKey
    ),
    enabled:  !!userId,
  })
}

export function useUserStatsRange(periodType: string, periodKeys: string[]) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: analyticsKeys.userStatsRange(userId, periodType, periodKeys),
    queryFn:  () => fetchUserStatsRange(
      userId,
      periodType as 'daily' | 'weekly' | 'monthly' | 'yearly',
      periodKeys
    ),
    enabled:  !!userId && periodKeys.length > 0,
  })
}
