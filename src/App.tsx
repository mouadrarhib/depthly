import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'

import { LogoIntro } from '@/components/LogoIntro'
import { router } from '@/routes'

/**
 * App is intentionally minimal — it just wires the router.
 * Global providers (QueryClient, Auth, Theme) live in main.tsx.
 * Feature-specific providers live in their own layouts/pages.
 *
 * The logo intro plays every time /dashboard is visited.
 * LogoIntro renders outside the router context (it's a sibling of
 * RouterProvider), so useLocation() isn't available here — instead we
 * subscribe to the data router directly, which also catches client-side
 * navigations (e.g. landing page -> /dashboard) and not just full loads.
 */
export default function App() {
  const [showIntro, setShowIntro] = useState(
    () => router.state.location.pathname === '/dashboard',
  )

  useEffect(() => {
    return router.subscribe((state) => {
      setShowIntro(state.location.pathname === '/dashboard')
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
