import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'

import { useAuthStore } from '@/store/authStore'
import { billingKeys, analyticsKeys } from '@/lib/queryKeys'
import { fetchSubscriptions } from '@/lib/supabase/queries/billing'
import { supabase } from '@/lib/supabase/client'

export function useSubscriptions() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: billingKeys.subscriptions(userId),
    queryFn:  () => fetchSubscriptions(userId),
    enabled:  !!userId,
  })
}

// cancel-subscription returns { error: string } in its response body on failure.
// supabase-js only exposes that body via error.context (the raw Response), not
// error.message — same pattern as UpgradeModal's create-checkout error handling.
async function extractErrorMessage(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // context wasn't JSON — fall through to the generic message below
    }
  }
  return err instanceof Error ? err.message : 'Could not cancel your subscription. Please try again.'
}

export function useCancelSubscription() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; message: string }>(
        'cancel-subscription',
      )
      if (error || !data?.success) {
        throw new Error(await extractErrorMessage(error ?? new Error('Cancellation failed')))
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.subscriptions(userId) })
      qc.invalidateQueries({ queryKey: analyticsKeys.profile(userId) })
    },
  })
}
