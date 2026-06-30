export function formatPeriodKey(
  date: Date,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  if (period === 'daily') return `${y}-${m}-${d}`
  if (period === 'monthly') return `${y}-${m}`
  if (period === 'yearly') return `${y}`

  // weekly — ISO week number
  const w = getISOWeek(date)
  return `${y}-W${String(w).padStart(2, '0')}`
}

export function getDaysInWeek(weekStart: Date): Date[] {
  // weekStart is treated as Monday
  const monday = getMonday(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function getDaysInMonth(year: number, month: number): Date[] {
  // month is 1-indexed
  const count = new Date(year, month, 0).getDate()
  return Array.from({ length: count }, (_, i) => new Date(year, month - 1, i + 1))
}

export function getWeeksInYear(year: number): Date[] {
  // 52 Mondays of ISO weeks in the given year
  const weeks: Date[] = []
  // ISO week 1 contains Jan 4
  const jan4 = new Date(year, 0, 4)
  const firstMonday = getMonday(jan4)
  for (let i = 0; i < 52; i++) {
    const d = new Date(firstMonday)
    d.setDate(firstMonday.getDate() + i * 7)
    weeks.push(d)
  }
  return weeks
}

export function navigatePeriod(
  current: Date,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  direction: 'prev' | 'next'
): Date {
  const delta = direction === 'next' ? 1 : -1
  const d = new Date(current)

  if (period === 'daily') {
    d.setDate(d.getDate() + delta)
  } else if (period === 'weekly') {
    d.setDate(d.getDate() + delta * 7)
  } else if (period === 'monthly') {
    d.setMonth(d.getMonth() + delta)
  } else {
    d.setFullYear(d.getFullYear() + delta)
  }

  return d
}

export function getPeriodLabel(
  date: Date,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  if (period === 'daily') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (period === 'weekly') {
    const monday = getMonday(date)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(monday)} – ${fmt(sunday)}`
  }

  if (period === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return String(date.getFullYear())
}

export function isCurrentPeriod(
  date: Date,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
): boolean {
  const now = new Date()
  return formatPeriodKey(date, period) === formatPeriodKey(now, period)
}

export function formatMinutesToHours(minutes: number): string {
  if (minutes === 0) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function getComparisonLabel(current: number, previous: number): string {
  const diff = current - previous
  if (diff === 0) return '— same as last period'
  const label = formatMinutesToHours(Math.abs(diff))
  return diff > 0 ? `↑ ${label} vs last period` : `↓ ${label} vs last period`
}

export function getBestHourOfDay(
  sessions: Array<{ started_at: string; duration_mins: number }>
): string {
  if (sessions.length === 0) return '—'

  const totals: Record<number, number> = {}
  for (const s of sessions) {
    const hour = new Date(s.started_at).getHours()
    totals[hour] = (totals[hour] ?? 0) + s.duration_mins
  }

  const best = Object.entries(totals).reduce((a, b) => (b[1] > a[1] ? b : a))
  const hour = Number(best[0])
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

export function getBestDayOfWeek(
  summaries: Array<{ date: string; focus_minutes: number }>
): string {
  if (summaries.length === 0) return '—'

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const totals: Record<number, number> = {}

  for (const s of summaries) {
    const dow = new Date(s.date).getDay()
    totals[dow] = (totals[dow] ?? 0) + s.focus_minutes
  }

  const best = Object.entries(totals).reduce((a, b) => (b[1] > a[1] ? b : a))
  return days[Number(best[0])]
}

// --- internal helpers ---

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // Thursday of the current week (ISO week belongs to the year of its Thursday)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const yearStart = new Date(d.getFullYear(), 0, 4)
  return Math.round(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
