import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { useProjects } from '@/hooks/useProjects'
import { usePlan, FREE_LIMITS } from '@/hooks/usePlan'
import { fetchSessionsThisMonth } from '@/lib/supabase/queries/sessions'

export function useProjectLimit() {
  const { plan, isPro }    = usePlan()
  const { data: projects } = useProjects()
  const count = projects?.length ?? 0
  const max   = FREE_LIMITS.maxProjects
  return {
    isAtLimit: plan !== undefined && !isPro && count >= max,
    count,
    max,
    isPro,
  }
}

export function useSessionMonthLimit() {
  const userId          = useAuthStore(s => s.user?.id ?? '')
  const { plan, isPro }  = usePlan()
  const { data: count = 0 } = useQuery({
    queryKey: ['sessions', 'month-count', userId] as const,
    queryFn:  () => fetchSessionsThisMonth(userId),
    enabled:  !!userId,
  })
  const max = FREE_LIMITS.maxSessionsPerMonth
  return {
    isAtLimit: plan !== undefined && !isPro && count >= max,
    count,
    max,
    isPro,
  }
}

export function useAnalyticsWindow() {
  const { isPro } = usePlan()
  return {
    windowDays: isPro ? 9999 : FREE_LIMITS.analyticsWindowDays,
    isPro,
  }
}

export function useCanExportCSV() {
  const { isPro } = usePlan()
  return { canExport: isPro, isPro }
}

export function useCanAppearOnLeaderboard() {
  const { isPro } = usePlan()
  return { canAppear: isPro, isPro }
}
