import { formatPeriodKey } from '@/lib/utils/analytics'

// profiles.current_streak only self-corrects the next time save_session()
// runs for that user (see the reset-on-gap CASE logic there) — there's no
// cron zeroing it out, so it goes stale for anyone who hasn't focused today
// or yesterday. This derives what should actually be displayed right now
// without touching the stored column, which the RPC still needs intact to
// compute the next real increment/reset correctly.
export function getEffectiveStreak(currentStreak: number, lastFocusDate: string | null): number {
  if (!lastFocusDate || currentStreak <= 0) return 0

  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isStillActive =
    lastFocusDate === formatPeriodKey(today, 'daily') ||
    lastFocusDate === formatPeriodKey(yesterday, 'daily')

  return isStillActive ? currentStreak : 0
}
