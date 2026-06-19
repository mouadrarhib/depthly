import { create } from 'zustand'

import type { User } from '@supabase/supabase-js'

interface AuthState {
  user:      User | null
  isLoading: boolean
  setUser:      (user: User | null) => void
  setIsLoading: (loading: boolean) => void
}

/**
 * Auth state — the current Supabase user session.
 *
 * Source of truth is Supabase; this store just makes it synchronously
 * available to any component without a hook call. The AuthProvider in
 * layout syncs the Supabase session into this store on mount and on
 * auth state changes.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user:         null,
  isLoading:    true,
  setUser:      (user)      => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
}))
