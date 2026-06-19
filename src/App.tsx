import { RouterProvider } from 'react-router-dom'

import { router } from '@/routes'

/**
 * App is intentionally minimal — it just wires the router.
 * Global providers (QueryClient, Auth, Theme) live in main.tsx.
 * Feature-specific providers live in their own layouts/pages.
 */
export default function App() {
  return <RouterProvider router={router} />
}
