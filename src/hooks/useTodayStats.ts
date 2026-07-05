import { useProfile, useDailySummary } from '@/hooks/useAnalytics'
import { formatPeriodKey } from '@/lib/utils/analytics'

export function useTodayStats() {
  const today = formatPeriodKey(new Date(), 'daily')
  const { data: profile } = useProfile()
  const { data: daily }   = useDailySummary(today)

  return {
    streak:       profile?.current_streak ?? 0,
    focusMinutes: daily?.focus_minutes    ?? 0,
    sessions:     daily?.session_count    ?? 0,
    avatarUrl:    profile?.avatar_url     ?? null,
    displayName:  profile?.display_name   ?? null,
  }
}
