import { useEffect, useRef } from 'react'
import 'driver.js/dist/driver.css'

import { hasSeenOnboardingTour } from '@/hooks/useOnboardingTour'
import { getProjectTourSteps } from '@/lib/onboarding/projectTourSteps'
import '@/lib/onboarding/onboarding.css'
import { useAuthStore, useIntroStore } from '@/store'

const ONBOARDING_FINISHED_EVENT = 'depthly:onboarding-tour-finished'

function projectsTourSeenKey(userId: string): string {
  return `depthly_projects_tour_seen_${userId}`
}

export function hasSeenProjectsTour(userId: string): boolean {
  return localStorage.getItem(projectsTourSeenKey(userId)) === 'true'
}

export function clearProjectsTourSeen(userId: string): void {
  localStorage.removeItem(projectsTourSeenKey(userId))
}

function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 767px)').matches
}

export async function runProjectsTour(userId: string, hasProjects: boolean): Promise<void> {
  const { driver } = await import('driver.js')
  const tourDriver = driver({
    showProgress: true,
    steps: getProjectTourSteps(hasProjects, isMobileViewport()),
    onDestroyed: () => {
      localStorage.setItem(projectsTourSeenKey(userId), 'true')
    },
  })

  tourDriver.drive()
}

export function useProjectsTour(hasProjects: boolean, isLoading: boolean): void {
  const userId = useAuthStore((state) => state.user?.id)
  const introActive = useIntroStore((state) => state.introActive)
  const hasRun = useRef(false)

  useEffect(() => {
    if (!userId || introActive || isLoading || hasRun.current || hasSeenProjectsTour(userId)) {
      return
    }

    let startTimer: number | undefined

    function startWhenReady() {
      if (!userId || hasRun.current || !hasSeenOnboardingTour(userId)) return
      hasRun.current = true
      startTimer = window.setTimeout(() => void runProjectsTour(userId, hasProjects), 250)
    }

    startWhenReady()
    window.addEventListener(ONBOARDING_FINISHED_EVENT, startWhenReady)
    return () => {
      window.removeEventListener(ONBOARDING_FINISHED_EVENT, startWhenReady)
      if (startTimer !== undefined) window.clearTimeout(startTimer)
    }
  }, [hasProjects, introActive, isLoading, userId])
}
