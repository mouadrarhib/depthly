import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { goalKeys } from '@/lib/queryKeys'
import { fetchGoals, updateGoals } from '@/lib/supabase/queries/goals'
import type { UpdateGoalsInput } from '@/lib/supabase/queries/goals'

export function useGoals() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: goalKeys.detail(userId),
    queryFn:  () => fetchGoals(userId),
    enabled:  !!userId,
  })
}

export function useUpdateGoals() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: (data: UpdateGoalsInput) => updateGoals(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.detail(userId) })
    },
  })
}
