import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

/**
 * Global UI state — sidebar, modals, view preferences.
 * Persisted so the layout feels the same after a refresh.
 *
 * Rule: Only put things here that:
 *   (a) multiple unrelated components need to read/write, AND
 *   (b) are NOT stored in the database
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen:    true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar:  () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'ui-preferences' } // localStorage key
  )
)
