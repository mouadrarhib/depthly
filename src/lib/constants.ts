export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Depthly'
export const APP_URL  = import.meta.env.VITE_APP_URL  ?? 'http://localhost:5173'

/** Centralised React Query cache keys — one per domain, add as you build */
export const QUERY_KEYS = {
  user:        ['user']        as const,
  projects:    ['projects']    as const,
  tasks:       ['tasks']       as const,
  sessions:    ['sessions']    as const,
  analytics:   ['analytics']   as const,
  goals:       ['goals']       as const,
  leaderboard: ['leaderboard'] as const,
} as const

/** Free plan limits — enforced at app layer, not DB */
export const FREE_PLAN_LIMITS = {
  projects: 3,
  tasks:    50,
} as const
