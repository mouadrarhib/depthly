import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { clearOAuthPending, isOAuthPending } from '@/lib/oauthPending'
import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
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
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Resolve the current session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)

      // A pending flag with no resulting session means the OAuth attempt
      // was abandoned/denied — clear it so it can't misfire on some later,
      // unrelated visit to /dashboard in this tab.
      if (!session && isOAuthPending()) {
        clearOAuthPending()
      }
    })

    // 2. Subscribe to future changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      // Falls back to a client-side hop only when Supabase lands the OAuth
      // redirect on / (unlisted redirect URL) instead of /dashboard directly
      // — App.tsx's own isOAuthPending() check handles the direct-landing
      // case synchronously, before this async listener even runs.
      if (event === 'SIGNED_IN' && session && isOAuthPending()) {
        navigate(PATHS.dashboard, { replace: true, state: { fromAuth: true } })
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setIsLoading, navigate])

  return { user, isLoading }
}
