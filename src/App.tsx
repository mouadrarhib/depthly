import { useEffect, useState } from 'react'
import type { Location } from 'react-router-dom'
import { RouterProvider } from 'react-router-dom'

import { LogoIntro } from '@/components/LogoIntro'
import { router } from '@/routes'

interface DashboardArrivalState {
  fromAuth?: boolean
}

function isAuthArrivalAtDashboard(location: Location) {
  return (
    location.pathname === '/dashboard' &&
    (location.state as DashboardArrivalState | null)?.fromAuth === true
  )
}

function clearNavigationState(location: Location) {
  window.history.replaceState({}, '', location.pathname + location.search)
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
  const [showIntro, setShowIntro] = useState(() =>
    isAuthArrivalAtDashboard(router.state.location),
  )

  useEffect(() => {
    if (isAuthArrivalAtDashboard(router.state.location)) {
      clearNavigationState(router.state.location)
    }

    return router.subscribe(({ location }) => {
      if (isAuthArrivalAtDashboard(location)) {
        setShowIntro(true)
        clearNavigationState(location)
      }
    })
  }, [])

  const handleIntroComplete = () => {
    setShowIntro(false)
  }

  return (
    <>
      {showIntro && <LogoIntro onComplete={handleIntroComplete} />}
      <RouterProvider router={router} />
    </>
  )
}
