import { PATHS } from '@/routes/paths'

export function safeAuthNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return PATHS.dashboard
  try {
    const url = new URL(value, window.location.origin)
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : PATHS.dashboard
  } catch {
    return PATHS.dashboard
  }
}

export function authPath(path: '/login' | '/signup', next: string): string {
  return `${path}?next=${encodeURIComponent(safeAuthNext(next))}`
}
