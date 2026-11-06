import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useProfile, useSessionsAllTime } from '@/hooks/useAnalytics'
import { usePlan } from '@/hooks/usePlan'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import {
  getCurrentFocusStreak,
  getLongestFocusStreak,
  sessionsToDailyTotals,
} from '@/lib/utils/analyticsSessions'
import { PATHS } from '@/routes/paths'
import type { AnalyticsProjectScope } from '@/types/app'

// Count local calendar days, including today and days with no sessions.
function calendarDaysSince(value: string) {
  const start = new Date(value)
  const end = new Date()
  return Math.max(
    1,
    Math.round(
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        86_400_000
    ) + 1
  )
}

export function OverviewView({ projectId, projectLabel }: AnalyticsProjectScope) {
  const profileQuery = useProfile()
  const query = useSessionsAllTime(projectId)
  const { isPro } = usePlan()
  const sessions = query.data ?? []
  const total = sessions.reduce((sum, session) => sum + session.duration_mins, 0)
  const firstSession = sessions.reduce<string | null>(
    (first, session) => (!first || session.started_at < first ? session.started_at : first),
    null
  )
  const freeStart = new Date()
  freeStart.setHours(0, 0, 0, 0)
  freeStart.setDate(freeStart.getDate() - 6)
  const rangeStart = isPro
    ? (firstSession ?? profileQuery.data?.member_since ?? new Date().toISOString())
    : freeStart.toISOString()
  const dailyTotals = [...sessionsToDailyTotals(sessions).values()]
  const currentStreak = getCurrentFocusStreak(dailyTotals)
  const longestStreak = getLongestFocusStreak(dailyTotals)
  const rangeLabel = isPro ? 'All time' : 'Last 7 days'
  const projectMap = new Map<string, { name: string; color: string; minutes: number }>()
  for (const session of sessions) {
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
  if (query.isPending)
    return (
      <div aria-label="Loading overview" className="space-y-6">
        <div className="h-36 animate-pulse rounded-xl bg-depth-raised" />
        <div className="h-80 animate-pulse rounded-xl bg-depth-raised" />
      </div>
    )
  if (query.isError)
    return (
      <div
        role="alert"
        className="rounded-xl border border-depth-border p-8 text-center text-sm text-ink-primary"
      >
        <p>We couldn’t load your focus overview.</p>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    )
  const stats = [
    {
      title: 'Total focus',
      value: formatMinutesToHours(total),
      note: isPro ? 'Time from your focus sessions' : 'Focus time in the last 7 days',
    },
    { title: 'Focus sessions', value: sessions.length, note: 'Completed focus sessions' },
    {
      title: 'Average per day',
      value: formatMinutesToHours(Math.round(total / calendarDaysSince(rangeStart))),
      note: 'Includes days without a session',
    },
    {
      title: 'Current streak',
      value: `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`,
      note: `Longest streak: ${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}${isPro ? '' : ' in this range'}`,
    },
  ]
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-primary/70">
        <p>
          {rangeLabel}
          {projectId !== undefined ? ` · ${projectLabel}` : ' · All projects'}
        </p>
        <p>
          {isPro
            ? firstSession
              ? `First focus session · ${new Date(firstSession).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
              : 'No focus sessions yet'
            : 'Showing your accessible analytics range'}
        </p>
      </div>
      <section
        aria-label="Focus summary"
        className="grid grid-cols-1 overflow-hidden rounded-xl border border-depth-border bg-depth-surface sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            className={`min-w-0 border-depth-border p-5 sm:p-6 ${index ? 'border-t' : ''} ${index === 1 ? 'sm:border-l sm:border-t-0' : ''} ${index === 3 ? 'sm:border-l' : ''} xl:border-t-0 ${index ? 'xl:border-l' : ''}`}
          >
            <h2 className="text-sm font-medium text-ink-primary/80">{stat.title}</h2>
            <p className="font-data mt-4 break-words text-[clamp(24px,2.5vw,30px)] leading-tight tracking-tight text-ink-primary">
              {stat.value}
            </p>
            <p className="mt-4 text-xs leading-5 text-ink-primary/70">{stat.note}</p>
          </div>
        ))}
      </section>
      <section
        className="overflow-hidden rounded-xl border border-depth-border bg-depth-surface"
        aria-labelledby="overview-project-breakdown"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-depth-border px-5 py-5 sm:px-6">
          <div>
            <h2 id="overview-project-breakdown" className="text-lg font-medium text-ink-primary">
              Focus by project
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-primary/75">
              {projectId === undefined
                ? 'See which projects you’ve spent the most time on.'
                : `Focus time recorded for ${projectLabel}.`}
            </p>
          </div>
          <span className="text-xs text-ink-primary/70">{rangeLabel}</span>
        </div>
        {projects.length ? (
          <>
            <div
              className="max-h-[32rem] overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              role="region"
              aria-label="Project focus breakdown"
              tabIndex={0}
            >
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 z-10 bg-depth-surface text-xs text-ink-primary/70">
                  <tr>
                    <th scope="col" className="w-[45%] px-5 py-4 font-medium sm:w-[28%] sm:px-6">
                      Project
                    </th>
                    <th scope="col" className="hidden w-[40%] py-4 font-medium sm:table-cell">
                      <span className="sr-only">Share of total focus</span>
                    </th>
                    <th scope="col" className="w-[30%] px-2 py-4 text-right font-medium sm:w-[18%]">
                      Focus time
                    </th>
                    <th
                      scope="col"
                      className="w-[25%] px-5 py-4 text-right font-medium sm:w-[14%] sm:px-6"
                    >
                      % of total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(([id, entry]) => {
                    const share = total > 0 ? (entry.minutes / total) * 100 : 0
                    return (
                      <tr key={id} className="border-t border-depth-border/50">
                        <th scope="row" className="px-5 py-3 font-normal sm:px-6">
                          <span className="flex items-start gap-2">
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: entry.color }}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 break-words text-ink-primary">
                              {entry.name}
                            </span>
                          </span>
                        </th>
                        <td className="hidden py-3 sm:table-cell" aria-hidden="true">
                          <div className="h-3 overflow-hidden rounded bg-depth-raised">
                            <div
                              className="h-full rounded"
                              style={{ width: `${share}%`, backgroundColor: entry.color }}
                            />
                          </div>
                        </td>
                        <td className="font-data px-2 py-3 text-right text-xs text-ink-primary sm:text-sm">
                          {formatMinutesToHours(entry.minutes)}
                        </td>
                        <td className="font-data px-5 py-3 text-right text-xs text-ink-primary/75 sm:px-6">
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-depth-border px-5 py-3 text-xs leading-5 text-ink-primary/70 sm:px-6">
              Sessions without a linked project appear under “No project”.
            </p>
          </>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-ink-primary">
              No focus sessions in this range{projectId !== undefined ? ` for ${projectLabel}` : ''}
              .
            </p>
            <p className="mt-2 text-xs text-ink-primary/70">
              Record a focus session to see how your time adds up.
            </p>
            <Link
              to={PATHS.timer}
              className="mt-3 inline-flex min-h-11 items-center text-sm text-brand"
            >
              Open timer →
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
