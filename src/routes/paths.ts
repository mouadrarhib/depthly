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

  // App — Timer lives at home, the rest are Depthly's other domains.
  // Uncomment each as you build its page (matches Sidebar NAV_ITEMS).
  home:     '/',            // Timer
  settings: '/settings',
  projects: '/projects',
  // projects:    '/projects',
  // tasks:       '/tasks',
  // analytics:   '/analytics',
  // goals:       '/goals',
  // leaderboard: '/leaderboard',

  // Dynamic routes — functions to avoid string concatenation at call site
  project:  (id: string) => `/projects/${id}`,
  task:     (id: string) => `/tasks/${id}`,
} as const
