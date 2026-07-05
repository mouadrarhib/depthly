import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { useProjects } from '@/hooks/useProjects'
import { fetchSessionsThisMonth } from '@/lib/supabase/queries/sessions'
import type { Database } from '@/types/database'

type PlanType = Database['public']['Enums']['plan_type']

const FREE_PROJECT_LIMIT      = 3
const FREE_SESSION_MONTH_LIMIT = 50

async function fetchUserPlan(userId: string): Promise<PlanType> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data.plan
}

function usePlan() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  const { data: plan } = useQuery({
    queryKey: ['plan', userId] as const,
    queryFn:  () => fetchUserPlan(userId),
    enabled:  !!userId,
  })
  const isPro = plan === 'pro' || plan === 'founding'
  return { plan, isPro }
}

export function useProjectLimit() {
  const { plan, isPro }    = usePlan()
  const { data: projects } = useProjects()
  const count = projects?.length ?? 0
  const max   = FREE_PROJECT_LIMIT
  return {
    isAtLimit: plan !== undefined && !isPro && count >= max,
    count,
    max,
    isPro,
  }
}

export function useSessionMonthLimit() {
  const userId     = useAuthStore(s => s.user?.id ?? '')
  const { plan, isPro } = usePlan()
  const { data: count = 0 } = useQuery({
    queryKey: ['sessions', 'month-count', userId] as const,
    queryFn:  () => fetchSessionsThisMonth(userId),
    enabled:  !!userId,
  })
  const max = FREE_SESSION_MONTH_LIMIT
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
    windowDays: isPro ? 9999 : 7,
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
