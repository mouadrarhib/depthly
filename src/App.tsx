import { useEffect, useState } from 'react'
import type { Location } from 'react-router-dom'
import { RouterProvider } from 'react-router-dom'

import { LogoIntro } from '@/components/LogoIntro'
import { clearOAuthPending, isOAuthPending } from '@/lib/oauthPending'
import { router } from '@/routes'
import { useIntroStore } from '@/store'

interface DashboardArrivalState {
  fromAuth?: boolean
}

function isAuthArrivalAtDashboard(location: Location) {
  if (location.pathname !== '/dashboard') return false

  const hasFromAuthState = (location.state as DashboardArrivalState | null)?.fromAuth === true
  // Google OAuth can land here via a hard navigation (unloaded/reloaded
  // page), which carries no router state at all — isOAuthPending() is the
  // only signal that survives that trip, and it's readable synchronously
  // here so the intro is already showing on the very first paint, before
  // the dashboard underneath ever gets a chance to render.
  return hasFromAuthState || isOAuthPending()
}

function clearNavigationState(location: Location) {
  window.history.replaceState({}, '', location.pathname + location.search)
  clearOAuthPending()
}

/**
 * App is intentionally minimal — it just wires the router.
 * Global providers (QueryClient, Auth, Theme) live in main.tsx.
 * Feature-specific providers live in their own layouts/pages.
 *
 * The logo intro only plays when /dashboard is reached via an auth flow —
 * login, signup, or the landing page's "Go to app" CTA — which pass
 * `state: { fromAuth: true }` when navigating. Sidebar/internal links to
 * /dashboard carry no state, so they never retrigger it. The state is
 * cleared from history as soon as it's consumed so refreshing /dashboard
 * doesn't replay the intro.
 *
 * LogoIntro renders outside the router context (it's a sibling of
 * RouterProvider), so useLocation() isn't available here — instead we read
 * router.state directly and subscribe to it for subsequent navigations.
 */
export default function App() {
  // introStore is updated synchronously at every one of these call sites
  // (not mirrored via a useEffect) because React fires child effects —
  // including AppLayout's useOnboardingTour, several levels down — before
  // this component's own effects. A useEffect-based sync would leave
  // introActive stale (false) for the entire first commit, letting the tour
  // start underneath the still-visible splash on the very login/OAuth
  // arrival it's meant to guard against.
  const [showIntro, setShowIntro] = useState(() => {
    const initial = isAuthArrivalAtDashboard(router.state.location)
    useIntroStore.getState().setIntroActive(initial)
    return initial
  })

  useEffect(() => {
    if (isAuthArrivalAtDashboard(router.state.location)) {
      clearNavigationState(router.state.location)
    }

    return router.subscribe(({ location }) => {
      if (isAuthArrivalAtDashboard(location)) {
        useIntroStore.getState().setIntroActive(true)
        setShowIntro(true)
        clearNavigationState(location)
      }
    })
  }, [])

  const handleIntroComplete = () => {
    useIntroStore.getState().setIntroActive(false)
    setShowIntro(false)
  }

  return (
    <>
      {showIntro && <LogoIntro onComplete={handleIntroComplete} />}
      <RouterProvider router={router} />
    </>
  )
}
