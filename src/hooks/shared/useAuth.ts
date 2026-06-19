import { useEffect } from 'react'

import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store'

/**
 * Provides the current auth session and syncs Supabase auth state into the store.
 *
 * Mount this ONCE near the top of your component tree (e.g. AppLayout or main.tsx).
 * After that, read auth state from useAuthStore() directly — cheaper, no extra subscriptions.
 *
 * Returns:
 *   user      — the Supabase User object, or null if not signed in
 *   isLoading — true until the initial session check resolves
 */
export function useAuth() {
  const { user, isLoading, setUser, setIsLoading } = useAuthStore()

  useEffect(() => {
    // 1. Resolve the current session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // 2. Subscribe to future changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setIsLoading])

  return { user, isLoading }
}
