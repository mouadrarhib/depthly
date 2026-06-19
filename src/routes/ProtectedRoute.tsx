import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/hooks/shared/useAuth'
import { PATHS } from '@/routes/paths'

/**
 * Wraps any routes that require an authenticated user.
 * Unauthenticated visitors are redirected to /login.
 *
 * Usage in router config:
 *   { element: <ProtectedRoute />, children: [ ...authenticated routes ] }
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  // Wait for auth state to resolve before redirecting
  if (isLoading) return null

  if (!user) {
    return <Navigate to={PATHS.login} replace />
  }

  return <Outlet />
}
