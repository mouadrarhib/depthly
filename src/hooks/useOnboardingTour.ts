import { useEffect, useRef } from 'react'
import type { Driver, DriveStep } from 'driver.js'
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

// Matches Sidebar.tsx's own desktop/mobile threshold (useMediaQuery('(min-width: 768px)')).
function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 767px)').matches
}

function stepLocation(step: DriveStep): 'sidebar' | 'topbar' {
  return (step.data?.location as 'sidebar' | 'topbar' | undefined) ?? 'sidebar'
}

/**
 * Every step targets either an element inside the mobile sidebar drawer
 * (closed, it's translated fully off-screen — nothing to highlight) or the
 * Topbar (the drawer, left open, darkens it via AppLayout's own backdrop,
 * which has no knowledge of driver.js's overlay cutout). So the drawer needs
 * to be open for sidebar steps and closed for the Today's Stats step.
 *
 * driver.js measures a step's target synchronously the moment it's told to
 * move there — it won't wait for the drawer's 200ms CSS transition
 * (Sidebar.tsx). Toggling the drawer and immediately letting driver.js
 * advance highlighted a stale, still-mid-transition position (the popover
 * landing on top of the row instead of below it, or the "hidden by the
 * guide" symptom on mobile). So rather than fix the position up after the
 * fact, this gates the *advance itself*: `thenAdvance` only runs once the
 * drawer's state already matches what `step` needs.
 */
function prepareMobileSidebarForStep(step: DriveStep, thenAdvance: () => void): void {
  if (!isMobileViewport()) {
    thenAdvance()
    return
  }

  const wantOpen = stepLocation(step) === 'sidebar'
  const { sidebarOpen, setSidebarOpen } = useUiStore.getState()
  if (sidebarOpen === wantOpen) {
    thenAdvance()
    return
  }

  setSidebarOpen(wantOpen)
  window.setTimeout(thenAdvance, 220)
}

/** Builds and starts the driver.js tour. Also used by the "Replay welcome tour" button in Settings. */
export async function runOnboardingTour(userId: string): Promise<void> {
  const wasSidebarOpen = useUiStore.getState().sidebarOpen
  const steps = getTourSteps(isMobileViewport())
  const { driver } = await import('driver.js')

  // onNextClick/onPrevClick, set at the Config level, take over *all*
  // forward/backward navigation — driver.js routes left/right-arrow-key
  // navigation through these same hooks too, not just the popover buttons —
  // so this is the single choke point for "don't move until the drawer's
  // ready" regardless of how the user navigates.
  const tourDriver: Driver = driver({
    showProgress: true,
    steps,
    onNextClick: (_element, _step, opts) => {
      const nextStep = steps[(opts.driver.getActiveIndex() ?? 0) + 1]
      // No `onDoneClick` is configured, so driver.js falls back to firing
      // this same onNextClick handler for the "Done" button on the last
      // step too — there's no next step to prepare for, so finish the tour
      // directly instead of silently no-op'ing (which read as "Done" doing
      // nothing at all).
      if (!nextStep) {
        opts.driver.destroy()
        return
      }
      prepareMobileSidebarForStep(nextStep, () => opts.driver.moveNext())
    },
    onPrevClick: (_element, _step, opts) => {
      const prevStep = steps[(opts.driver.getActiveIndex() ?? 0) - 1]
      if (!prevStep) return
      prepareMobileSidebarForStep(prevStep, () => opts.driver.movePrevious())
    },
    onDestroyed: () => {
      localStorage.setItem(tourSeenKey(userId), 'true')
      if (isMobileViewport()) useUiStore.getState().setSidebarOpen(wasSidebarOpen)
    },
  })

  prepareMobileSidebarForStep(steps[0], () => tourDriver.drive())
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
