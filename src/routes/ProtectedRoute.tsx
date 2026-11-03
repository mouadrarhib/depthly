import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/shared/useAuth'
import { authPath } from '@/lib/authRedirect'
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
  const location = useLocation()

  // Wait for auth state to resolve before redirecting
  if (isLoading) return null

  if (!user) {
    return <Navigate to={authPath(PATHS.login, `${location.pathname}${location.search}${location.hash}`)} replace />
  }

  return <Outlet />
}
