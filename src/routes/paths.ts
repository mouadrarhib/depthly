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
  emailConfirmed:   '/email-confirmed',

  // App — Dashboard at root; timer is embedded in the dashboard.
  // Uncomment each as you build its page (matches Sidebar NAV_ITEMS).
  home:      '/',            // Dashboard
  dashboard: '/dashboard',   // Alias — redirects to /
  timer:     '/timer',       // Alias — redirects to / (timer is embedded in dashboard)
  settings:  '/settings',
  projects:  '/projects',
  sessions:  '/sessions',
  analytics:   '/analytics',
  leaderboard: '/leaderboard',
  // tasks: '/tasks',
  // goals: '/goals',

  // Dynamic routes — functions to avoid string concatenation at call site
  project:  (id: string) => `/projects/${id}`,
  task:     (id: string) => `/tasks/${id}`,
} as const
