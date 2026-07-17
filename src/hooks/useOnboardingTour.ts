import { useEffect, useRef } from 'react'
import type { Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

import { useAuthStore, useIntroStore, useUiStore } from '@/store'
import { getTourSteps } from '@/lib/onboarding/tourSteps'
import '@/lib/onboarding/onboarding.css'

function tourSeenKey(userId: string): string {
  return `depthly_onboarding_seen_${userId}`
}

export function hasSeenOnboardingTour(userId: string): boolean {
  return localStorage.getItem(tourSeenKey(userId)) === 'true'
}

export function clearOnboardingTourSeen(userId: string): void {
  localStorage.removeItem(tourSeenKey(userId))
}

/**
 * Every tour step targets a [data-tour] element inside <Sidebar>. On mobile
 * the sidebar is a drawer that's translated fully off-screen when closed, so
 * without this the tour would try to highlight invisible elements whenever
 * it's replayed after the user has closed the drawer (the common case —
 * mobile users close it right after navigating). Restores the prior
 * open/closed state once the tour ends.
 */
function ensureMobileSidebarOpenForTour(): () => void {
  const isMobile = window.matchMedia('(max-width: 767px)').matches
  if (!isMobile) return () => {}

  const { sidebarOpen, setSidebarOpen } = useUiStore.getState()
  if (sidebarOpen) return () => {}

  setSidebarOpen(true)
  return () => setSidebarOpen(false)
}

/** Builds and starts the driver.js tour. Also used by the "Replay welcome tour" button in Settings. */
export async function runOnboardingTour(userId: string): Promise<void> {
  const restoreSidebar = ensureMobileSidebarOpenForTour()
  const { driver } = await import('driver.js')
  const tourDriver: Driver = driver({
    showProgress: true,
    steps: getTourSteps(),
    onDestroyed: () => {
      localStorage.setItem(tourSeenKey(userId), 'true')
      restoreSidebar()
    },
  })
  tourDriver.drive()
}

/** Auto-starts the onboarding tour once per user. Mount this only in the main authenticated layout. */
export function useOnboardingTour(): void {
  const userId      = useAuthStore(s => s.user?.id)
  const introActive = useIntroStore(s => s.introActive)
  const hasRun      = useRef(false)

  useEffect(() => {
    // Wait out the LogoIntro splash first — driver.js's popover z-index sits
    // above it, so starting while it's still on screen renders them overlapping.
    if (!userId || introActive || hasRun.current || hasSeenOnboardingTour(userId)) return
    hasRun.current = true
    void runOnboardingTour(userId)
  }, [userId, introActive])
}
