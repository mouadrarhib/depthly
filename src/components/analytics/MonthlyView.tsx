import { useState } from 'react'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Button } from '@/components/ui/button'
import { useDailySummariesRange, useSessionsForWeek } from '@/hooks/useAnalytics'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import { getDaysInMonth, formatPeriodKey, formatMinutesToHours } from '@/lib/utils/analytics'
import { sessionsToDailyTotals } from '@/lib/utils/analyticsSessions'
import type { AnalyticsProjectScope } from '@/types/app'

interface MonthlyViewProps extends AnalyticsProjectScope {
  date: Date
  onSelectDay?: (date: Date) => void
}
export function MonthlyView({ date, projectId, projectLabel, onSelectDay }: MonthlyViewProps) {
  const days = getDaysInMonth(date.getFullYear(), date.getMonth() + 1)
  const firstKey = formatPeriodKey(days[0], 'daily')
  const lastKey = formatPeriodKey(days[days.length - 1], 'daily')
  const previousDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const previousDays = getDaysInMonth(previousDate.getFullYear(), previousDate.getMonth() + 1)
  const previousFirst = formatPeriodKey(previousDays[0], 'daily')
  const previousLast = formatPeriodKey(previousDays[previousDays.length - 1], 'daily')
  const summaryQuery = useDailySummariesRange(firstKey, lastKey)
  // This range hook supports arbitrary date ranges, including whole months.
  const sessionQuery = useSessionsForWeek(firstKey, lastKey, projectId)
  const previousQuery = useDailySummariesRange(previousFirst, previousLast)
  const previousSessions = useSessionsForWeek(
    previousFirst,
    previousLast,
    projectId,
    projectId !== undefined
  )
  const { windowDays, isPro } = useAnalyticsWindow()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [selection, setSelection] = useState<string | null>(null)
  const todayKey = formatPeriodKey(new Date(), 'daily')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (windowDays - 1))
  const cutoffKey = formatPeriodKey(cutoff, 'daily')
  const locked = !isPro && firstKey < cutoffKey
  const previousAccessible = isPro || previousFirst >= cutoffKey
  const inProgress = firstKey <= todayKey && lastKey >= todayKey
  const upcoming = firstKey > todayKey
  const sessions = sessionQuery.data ?? []
  const summaryMap =
    projectId !== undefined
      ? sessionsToDailyTotals(sessions)
      : new Map((summaryQuery.data ?? []).map((row) => [row.date, row]))
  const previousMap =
    projectId !== undefined
      ? sessionsToDailyTotals(previousSessions.data ?? [])
      : new Map((previousQuery.data ?? []).map((row) => [row.date, row]))
  const minutes = days.reduce(
    (sum, day) => sum + (summaryMap.get(formatPeriodKey(day, 'daily'))?.focus_minutes ?? 0),
    0
  )
  const count = days.reduce(
    (sum, day) => sum + (summaryMap.get(formatPeriodKey(day, 'daily'))?.session_count ?? 0),
    0
  )
  const previousMinutes = previousDays.reduce(
    (sum, day) => sum + (previousMap.get(formatPeriodKey(day, 'daily'))?.focus_minutes ?? 0),
    0
  )
  const selected =
    days.find((day) => formatPeriodKey(day, 'daily') === selection) ??
    days.find((day) => formatPeriodKey(day, 'daily') === todayKey) ??
    days[0]
  const selectedKey = formatPeriodKey(selected, 'daily')
  const selectedSummary = summaryMap.get(selectedKey)
  const selectedFuture = selectedKey > todayKey
  const projectMap = new Map<string, { name: string; color: string; minutes: number }>()
  for (const session of sessions) {
    if (formatPeriodKey(new Date(session.started_at), 'daily') !== selectedKey) continue
    const id = session.project_id ?? '__none__'
    const existing = projectMap.get(id)
    if (existing) existing.minutes += session.duration_mins
    else
      projectMap.set(id, {
        name: session.projects?.name ?? 'No project',
        color: session.projects?.color ?? '#9490aa',
        minutes: session.duration_mins,
      })
  }
  const projects = [...projectMap.entries()].sort((a, b) => b[1].minutes - a[1].minutes)
  const dayTotal = projects.reduce((sum, [, entry]) => sum + entry.minutes, 0)
  const panel = 'rounded-xl border border-depth-border bg-depth-surface'
  const previousLoading =
    previousQuery.isPending || (projectId !== undefined && previousSessions.isPending)
  const previousError =
    previousQuery.isError || (projectId !== undefined && previousSessions.isError)
  if (locked)
    return (
      <section className={`${panel} px-5 py-16 text-center`}>
        <h2 className="text-xl font-medium text-ink-primary">Explore your full focus history</h2>
        <p className="mt-2 text-sm text-ink-primary/75">
          Your Free plan includes the last {windowDays} days. Pro includes earlier months.
        </p>
        <Button className="mt-5" variant="primary" onClick={() => setUpgradeOpen(true)}>
          Upgrade to Pro
        </Button>
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          trigger="analytics"
        />
      </section>
    )
  if (summaryQuery.isPending || sessionQuery.isPending)
    return (
      <div aria-label="Loading monthly analytics" className="space-y-6">
        <div className="h-32 animate-pulse rounded-xl bg-depth-raised" />
        <div className="h-96 animate-pulse rounded-xl bg-depth-raised" />
      </div>
    )
  if (summaryQuery.isError || sessionQuery.isError)
    return (
      <div role="alert" className={`${panel} p-8 text-center text-sm text-ink-primary`}>
        <p>We couldn’t load this month’s focus activity.</p>
        <Button
          variant="ghost"
          onClick={() => {
            void summaryQuery.refetch()
            void sessionQuery.refetch()
          }}
        >
          Try again
        </Button>
      </div>
    )
  const leading = (days[0].getDay() + 6) % 7
  return (
    <div className="space-y-6">
      <section
        aria-label="Monthly focus summary"
        className={`${panel} grid divide-y divide-depth-border sm:grid-cols-2 sm:divide-x sm:divide-y-0`}
      >
        <div className="min-w-0 p-5 sm:p-6">
          <h2 className="text-sm font-medium text-ink-primary/80">Time focused</h2>
          <div className="mt-4 flex flex-wrap items-baseline gap-4">
            <p className="font-data text-3xl text-ink-primary">{formatMinutesToHours(minutes)}</p>
            <p className="text-xs text-ink-primary/70">
              {upcoming
                ? 'Upcoming month'
                : inProgress
                  ? `Month in progress · through ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : 'Recorded for this month'}
            </p>
          </div>
        </div>
        <div className="min-w-0 p-5 sm:p-6">
          <h2 className="text-sm font-medium text-ink-primary/80">Focus sessions</h2>
          <div className="mt-4 flex flex-wrap items-baseline gap-4">
            <p className="font-data text-3xl text-ink-primary">{count}</p>
            <p className="text-xs text-ink-primary/70">Completed focus sessions</p>
          </div>
        </div>
      </section>
      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <section aria-labelledby="monthly-calendar" className={`${panel} min-w-0 p-3 sm:p-6`}>
          <h2 id="monthly-calendar" className="text-lg font-medium text-ink-primary">
            Your month at a glance
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/75">
            Select a day to see its focus sessions and projects.
          </p>
          <div
            className="mt-5 max-w-full overflow-x-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            role="region"
            aria-label="Monthly calendar"
            tabIndex={0}
          >
            <div
              className="grid min-w-[336px] grid-cols-7 gap-1 sm:gap-2"
              role="group"
              aria-label={date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <span
                  key={day}
                  className="py-2 text-center text-[10px] text-ink-primary/70 sm:text-xs"
                >
                  {day}
                </span>
              ))}
              {Array.from({ length: leading }, (_, index) => (
                <span key={`blank-${index}`} aria-hidden="true" />
              ))}
              {days.map((day) => {
                const key = formatPeriodKey(day, 'daily')
                const future = key > todayKey
                const dayMinutes = summaryMap.get(key)?.focus_minutes ?? 0
                const chosen = key === selectedKey
                const intensity = Math.min(1, dayMinutes / 180)
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={future}
                    aria-pressed={chosen}
                    aria-current={key === todayKey ? 'date' : undefined}
                    aria-label={`${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${future ? 'upcoming' : `${dayMinutes} focus minutes, ${summaryMap.get(key)?.session_count ?? 0} sessions`}`}
                    onClick={() => setSelection(key)}
                    className={`flex min-h-14 min-w-0 flex-col items-start justify-between gap-2 rounded-md border p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-h-16 sm:p-2 ${chosen ? 'border-brand' : 'border-depth-border'} ${future ? 'text-ink-primary/40' : 'text-ink-primary hover:border-brand'}`}
                    style={{
                      backgroundColor:
                        !future && dayMinutes > 0
                          ? `rgba(75,158,255,${0.08 + intensity * 0.22})`
                          : undefined,
                    }}
                  >
                    <span className="font-data text-[10px] sm:text-xs">{day.getDate()}</span>
                    {!future && (
                      <span className="font-data text-[9px] leading-tight text-ink-primary/80 sm:text-xs">
                        <span className="sm:hidden">{dayMinutes}m</span>
                        <span className="hidden sm:inline">{formatMinutesToHours(dayMinutes)}</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-primary/70">
            Brighter cells mean more focus time. Future dates show no recorded totals.
          </p>
        </section>
        <section
          aria-labelledby="monthly-selected-day"
          className={`${panel} min-w-0 p-5 sm:p-6`}
          aria-live="polite"
        >
          <h2 id="monthly-selected-day" className="text-lg font-medium text-ink-primary">
            {selected.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h2>
          <p className="mt-1 text-xs text-ink-primary/70">
            Selected day · {projectId === undefined ? 'all projects' : projectLabel}
          </p>
          {selectedFuture ? (
            <p className="mt-8 text-sm text-ink-primary/70">
              This day is still ahead. Recorded focus time will appear here afterward.
            </p>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-depth-border pb-5">
                <p className="font-data text-2xl text-ink-primary">
                  {formatMinutesToHours(selectedSummary?.focus_minutes ?? 0)}
                </p>
                <p className="text-xs text-ink-primary/70">
                  {selectedSummary?.session_count ?? 0} sessions
                </p>
              </div>
              <h3 className="mt-5 text-sm font-medium text-ink-primary/80">Time by project</h3>
              <div
                className="mt-4 max-h-64 space-y-5 overflow-y-auto focus-visible:ring-2 focus-visible:ring-brand"
                role="region"
                aria-label="Selected-day project focus"
                tabIndex={0}
              >
                {projects.length ? (
                  projects.map(([id, entry]) => {
                    const share = dayTotal > 0 ? (entry.minutes / dayTotal) * 100 : 0
                    return (
                      <div key={id}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 break-words text-sm text-ink-primary">
                            {entry.name}
                          </span>
                          <span className="font-data shrink-0 text-xs text-ink-primary/80">
                            {formatMinutesToHours(entry.minutes)}
                          </span>
                        </div>
                        <div
                          className="mt-3 h-2 overflow-hidden rounded-full bg-depth-raised"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${share}%`, backgroundColor: entry.color }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm leading-6 text-ink-primary/70">
                    No focus sessions recorded for this day
                    {projectId !== undefined ? ` for ${projectLabel}` : ''}.
                  </p>
                )}
              </div>
              {onSelectDay && (
                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  onClick={() => onSelectDay(selected)}
                >
                  Open Daily view →
                </Button>
              )}
              <p className="mt-4 text-xs leading-5 text-ink-primary/70">
                Review this day’s sessions, hourly pattern, and daily goal progress in Daily view.
              </p>
            </>
          )}
        </section>
      </div>
      <section
        aria-label="Previous month comparison"
        className={`${panel} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
      >
        <div>
          <h2 className="text-sm font-medium text-ink-primary">Compared with the previous month</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-ink-primary/70">
            {upcoming
              ? 'This month has not started yet.'
              : inProgress
                ? `This month is still in progress. The previous period covers all of ${previousDate.toLocaleDateString(undefined, { month: 'long' })}.`
                : 'Comparing two full calendar months.'}
          </p>
        </div>
        {!previousAccessible ? (
          <p className="text-xs text-ink-primary/70">
            Previous month is outside your accessible history.
          </p>
        ) : previousLoading ? (
          <p className="text-xs text-ink-primary/70">Loading comparison…</p>
        ) : previousError ? (
          <Button
            variant="ghost"
            onClick={() => {
              void previousQuery.refetch()
              void previousSessions.refetch()
            }}
          >
            Retry comparison
          </Button>
        ) : upcoming ? null : (
          <div className="text-right">
            <p className="font-data text-base text-ink-primary">
              {formatMinutesToHours(minutes)}
              {inProgress ? ' so far' : ''}
            </p>
            <p className="mt-2 text-xs text-ink-primary/70">
              Previous full month: {formatMinutesToHours(previousMinutes)}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
