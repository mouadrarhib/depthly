/**
 * Formatting utilities — pure functions, no React, no side effects.
 */

/** Format seconds as MM:SS or HH:MM:SS */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
  }
  return [m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/** Format a date as "Mon, 12 Jun 2025" */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

/** Compact number: 1500 → "1.5K" */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(n)
}

/** Truncate with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}
