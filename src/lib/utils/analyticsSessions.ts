import type { SessionProjectSliceWithDate } from '@/lib/supabase/queries/analytics'

export interface AnalyticsDayTotal {
  date: string
  focus_minutes: number
  session_count: number
}

function toLocalDateKey(value: string): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function sessionsToDailyTotals(
  sessions: SessionProjectSliceWithDate[]
): Map<string, AnalyticsDayTotal> {
  const totals = new Map<string, AnalyticsDayTotal>()

  for (const session of sessions) {
    const date = toLocalDateKey(session.started_at)
    const current = totals.get(date)
    if (current) {
      current.focus_minutes += session.duration_mins
      current.session_count += 1
    } else {
      totals.set(date, {
        date,
        focus_minutes: session.duration_mins,
        session_count: 1,
      })
    }
  }

  return totals
}

export function getLongestFocusStreak(days: AnalyticsDayTotal[]): number {
  const activeDates = days
    .filter((day) => day.focus_minutes > 0)
    .map((day) => day.date)
    .sort()

  if (activeDates.length === 0) return 0

  let longest = 1
  let current = 1
  for (let index = 1; index < activeDates.length; index += 1) {
    const previous = new Date(`${activeDates[index - 1]}T00:00:00`)
    const next = new Date(`${activeDates[index]}T00:00:00`)
    const difference = Math.round((next.getTime() - previous.getTime()) / 86_400_000)
    current = difference === 1 ? current + 1 : 1
    longest = Math.max(longest, current)
  }

  return longest
}

export function getCurrentFocusStreak(days: AnalyticsDayTotal[]): number {
  const activeDates = new Set(days.filter((day) => day.focus_minutes > 0).map((day) => day.date))
  if (activeDates.size === 0) return 0

  const cursor = new Date()
  const todayKey = toLocalDateKey(cursor.toISOString())
  if (!activeDates.has(todayKey)) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (activeDates.has(toLocalDateKey(cursor.toISOString()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
