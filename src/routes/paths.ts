/**
 * Single source of truth for all route paths.
 *
 * Usage:
 *   import { PATHS } from '@/routes/paths'
 *   navigate(PATHS.home)
 *   <Link to={PATHS.project(id)}>...</Link>
 *
 * Never hardcode path strings in components or hooks.
 */
export const PATHS = {
  // Auth
  login:           '/login',
  signup:          '/signup',
  forgotPassword:   '/forgot-password',
  resetPassword:    '/reset-password',

  // Public marketing site
  home:      '/',            // Landing page (logged-out visitors)

  // App — authenticated area starts at /dashboard (the "Home" page in the
  // sidebar — the URL wasn't renamed to /home to avoid colliding with
  // `home` above, which already means the public landing page at `/`).
  dashboard: '/dashboard',   // Home
  timer:     '/timer',
  settings:  '/settings',
  projects:  '/projects',
  sessions:  '/sessions',
  analytics:   '/analytics',
  leaderboard: '/leaderboard',
  billing:     '/billing',
  // tasks: '/tasks',
  // goals: '/goals',

  // Dynamic routes — functions to avoid string concatenation at call site
  project:  (id: string) => `/projects/${id}`,
  task:     (id: string) => `/tasks/${id}`,
} as const
