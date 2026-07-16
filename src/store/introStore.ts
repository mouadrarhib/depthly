import { create } from 'zustand'

interface IntroState {
  introActive:    boolean
  setIntroActive: (active: boolean) => void
}

/**
 * Tracks whether the LogoIntro splash (App.tsx) is currently on screen.
 * Not persisted — it's per-session UI state, reset on every load.
 *
 * Read by useOnboardingTour so the tour never starts underneath the splash —
 * driver.js's popover z-index sits above the intro's, so without this they'd
 * render on top of each other.
 */
export const useIntroStore = create<IntroState>()((set) => ({
  introActive:    false,
  setIntroActive: (introActive) => set({ introActive }),
}))
