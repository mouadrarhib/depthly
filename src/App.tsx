import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'

import { LogoIntro } from '@/components/LogoIntro'
import { router } from '@/routes'

/**
 * App is intentionally minimal — it just wires the router.
 * Global providers (QueryClient, Auth, Theme) live in main.tsx.
 * Feature-specific providers live in their own layouts/pages.
 *
 * The logo intro plays on every load before the router mounts —
 * it's not gated behind a "seen it before" flag.
 */
export default function App() {
  const [showIntro, setShowIntro] = useState(true)

  return (
    <>
      {showIntro && <LogoIntro onComplete={() => setShowIntro(false)} />}
      <RouterProvider router={router} />
    </>
  )
}
