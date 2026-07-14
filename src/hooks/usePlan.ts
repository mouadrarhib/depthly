import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type PlanType = Database['public']['Enums']['plan_type']

export const FREE_LIMITS = {
  maxProjects:          3,
  maxSessionsPerMonth:  50,
  analyticsWindowDays:  7,
  csvExport:            false,
  leaderboard:          false,
} as const

async function fetchPlan(userId: string): Promise<PlanType> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data.plan
}

export function usePlan() {
  const userId = useAuthStore(s => s.user?.id ?? '')

  const { data: plan = 'free', isLoading } = useQuery({
    queryKey: ['plan', userId] as const,
    queryFn:  () => fetchPlan(userId),
    enabled:  !!userId,
  })

  const isPro = plan === 'pro' || plan === 'founding'

  function checkLimit(type: keyof typeof FREE_LIMITS): boolean {
    if (isPro) return false
    const limit = FREE_LIMITS[type]
    // boolean limits (csvExport, leaderboard): false means feature is blocked
    if (typeof limit === 'boolean') return !limit
    // numeric limits: the limit applies to this user
    return true
  }

  return { plan, isPro, isLoading, checkLimit, FREE_LIMITS }
}
