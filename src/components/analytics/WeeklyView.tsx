import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { GoalDialog } from '@/components/goals/GoalDialog'
import { Button } from '@/components/ui/button'
import { useDailySummariesRange, useSessionsForWeek } from '@/hooks/useAnalytics'
import { sessionsToDailyTotals } from '@/lib/utils/analyticsSessions'
import { useGoals } from '@/hooks/useGoals'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import {
  formatPeriodKey,
  formatMinutesToHours,
  getGoalProgress,
  getDaysInWeek,
} from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'
import type { AnalyticsProjectScope } from '@/types/app'

interface WeeklyViewProps extends AnalyticsProjectScope {
  date: Date
  onSelectDay?: (date: Date) => void
}
export function WeeklyView({ date, projectId, projectLabel, onSelectDay }: WeeklyViewProps) {
  const days = getDaysInWeek(date)
  const startKey = formatPeriodKey(days[0], 'daily')
  const endKey = formatPeriodKey(days[6], 'daily')
  const previousDate = new Date(days[0])
  previousDate.setDate(previousDate.getDate() - 7)
  const previousDays = getDaysInWeek(previousDate)
  const prevStart = formatPeriodKey(previousDays[0], 'daily')
  const prevEnd = formatPeriodKey(previousDays[6], 'daily')
  const summaryQuery = useDailySummariesRange(startKey, endKey)
  const sessionQuery = useSessionsForWeek(startKey, endKey, projectId)
  const prevQuery = useDailySummariesRange(prevStart, prevEnd)
  const prevSessions = useSessionsForWeek(prevStart, prevEnd, projectId, projectId !== undefined)
  const goalQuery = useGoals()
  const { windowDays, isPro } = useAnalyticsWindow()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (windowDays - 1))
  const cutoffKey = formatPeriodKey(cutoff, 'daily')
  const todayKey = formatPeriodKey(new Date(), 'daily')
  const locked = !isPro && startKey < cutoffKey
  const previousAccessible = isPro || prevStart >= cutoffKey
  const sessions = sessionQuery.data ?? []
  const overallMap = new Map((summaryQuery.data ?? []).map((item) => [item.date, item]))
  const selectedMap = projectId !== undefined ? sessionsToDailyTotals(sessions) : overallMap
  const previousMap =
    projectId !== undefined
      ? sessionsToDailyTotals(prevSessions.data ?? [])
      : new Map((prevQuery.data ?? []).map((item) => [item.date, item]))
  const overallMinutes = days.reduce(
    (sum, day) => sum + (overallMap.get(formatPeriodKey(day, 'daily'))?.focus_minutes ?? 0),
    0
  )
  const minutes = days.reduce(
    (sum, day) => sum + (selectedMap.get(formatPeriodKey(day, 'daily'))?.focus_minutes ?? 0),
    0
  )
  const count = days.reduce(
    (sum, day) => sum + (selectedMap.get(formatPeriodKey(day, 'daily'))?.session_count ?? 0),
    0
  )
  const previousMinutes = previousDays.reduce(
    (sum, day) => sum + (previousMap.get(formatPeriodKey(day, 'daily'))?.focus_minutes ?? 0),
    0
  )
  const difference = minutes - previousMinutes
  const comparisonPending =
    prevQuery.isPending || (projectId !== undefined && prevSessions.isPending)
  const comparisonError = prevQuery.isError || (projectId !== undefined && prevSessions.isError)
  const target = goalQuery.data?.weekly_goal_minutes ?? null
  const goal = target !== null ? getGoalProgress(overallMinutes, target) : null
  const inProgress = startKey <= todayKey && endKey >= todayKey
  const futureWeek = startKey > todayKey
  const hours = days.map((day) => {
    const key = formatPeriodKey(day, 'daily')
    return {
      day,
      key,
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      minutes: key > todayKey ? null : (selectedMap.get(key)?.focus_minutes ?? 0),
    }
  })
  const projects = new Map<string, { name: string; color: string; minutes: number }>()
  for (const session of sessions) {
    const id = session.project_id ?? '__none__'
    const entry = projects.get(id)
    if (entry) entry.minutes += session.duration_mins
    else
      projects.set(id, {
        name: session.projects?.name ?? 'No project',
        color: session.projects?.color ?? '#9490aa',
        minutes: session.duration_mins,
      })
  }
  const projectTotal = sessions.reduce((sum, session) => sum + session.duration_mins, 0)
  const entries = [...projects.entries()].sort((a, b) => b[1].minutes - a[1].minutes)
  const panel = 'rounded-xl border border-depth-border bg-depth-surface'
  if (locked)
    return (
      <section className={`${panel} px-5 py-16 text-center`}>
        <h2 className="text-xl font-medium text-ink-primary">Explore your full focus history</h2>
        <p className="mt-2 text-sm text-ink-primary/75">
          Your Free plan includes the last {windowDays} days. Pro includes older dates.
        </p>
        <Button variant="primary" className="mt-5" onClick={() => setUpgradeOpen(true)}>
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
      <div aria-label="Loading daily analytics" className="space-y-6">
        <div className="h-40 animate-pulse rounded-xl bg-depth-raised" />
        <div className="h-80 animate-pulse rounded-xl bg-depth-raised" />
      </div>
    )
  if (summaryQuery.isError || sessionQuery.isError)
    return (
      <div role="alert" className={`${panel} p-8 text-center text-sm text-ink-primary`}>
        <p>We couldn’t load this week’s focus activity.</p>
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
  return (
    <div className="space-y-6">
      <section
        aria-label="Weekly focus summary"
        className={`${panel} relative grid grid-cols-1 overflow-hidden sm:grid-cols-2 xl:grid-cols-4`}
      >
        <div className="border-b border-depth-border p-5 sm:p-6 xl:border-b-0">
          <h2 className="text-sm font-medium text-ink-primary/80">Time focused</h2>
          <p className="font-data mt-4 text-3xl text-ink-primary">
            {formatMinutesToHours(minutes)}
          </p>
          <p className="mt-4 text-xs text-ink-primary/70">
            {projectId !== undefined
              ? projectLabel
              : inProgress
                ? 'Week in progress'
                : futureWeek
                  ? 'Upcoming week'
                  : 'Recorded for this week'}
          </p>
        </div>
        <div className="border-b border-depth-border p-5 sm:border-l sm:p-6 xl:border-b-0">
          <h2 className="text-sm font-medium text-ink-primary/80">Focus sessions</h2>
          <p className="font-data mt-4 text-3xl text-ink-primary">{count}</p>
          <p className="mt-4 text-xs text-ink-primary/70">Completed focus sessions</p>
        </div>
        <div className="min-w-0 p-5 sm:col-span-2 sm:p-6 xl:border-l xl:border-depth-border">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-primary/80">Weekly goal</h2>
            <button
              onClick={() => setGoalDialogOpen(true)}
              className="min-h-11 text-xs text-brand focus-visible:ring-2 focus-visible:ring-brand"
            >
              {target === null ? 'Set goal' : 'Edit goal'}
            </button>
          </div>
          {goalQuery.isPending ? (
            <div className="h-12 animate-pulse rounded bg-depth-raised" />
          ) : goalQuery.isError ? (
            <div role="alert" className="text-sm text-ink-primary/75">
              Goal unavailable.{' '}
              <button className="min-h-11 text-brand" onClick={() => void goalQuery.refetch()}>
                Retry
              </button>
            </div>
          ) : goal && target !== null ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-data text-xl text-ink-primary sm:text-2xl">
                  {overallMinutes} / {target} min
                </p>
                <span className="font-data text-lg text-brand">{goal.percentage}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Overall weekly goal"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.max(0, goal.percentage))}
                className="mt-3 h-2 overflow-hidden rounded-full bg-depth-raised"
              >
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.min(100, Math.max(0, goal.percentage))}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-ink-primary/70">
                <span>
                  {goal.isComplete ? 'Weekly goal reached' : `${goal.remaining} min to your goal`}
                </span>
                <span>Overall goal · all projects</span>
              </div>
            </>
          ) : (
            <p className="text-sm leading-6 text-ink-primary/75">
              Choose a daily focus target to see your progress here.
            </p>
          )}
          <p className="mt-2 text-[11px] text-ink-primary/60">
            Compared with your current weekly target.
          </p>
        </div>
      </section>
      {count === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-depth-border px-5 py-4">
          <div>
            <h2 className="text-sm font-medium text-ink-primary">
              No focus sessions on this week{projectId !== undefined ? ` for ${projectLabel}` : ''}.
            </h2>
            <p className="mt-1 text-xs text-ink-primary/70">
              Choose another date or record a session to see your focus time here.
            </p>
          </div>
          <Link to={PATHS.timer} className="inline-flex min-h-11 items-center text-sm text-brand">
            Open timer →
          </Link>
        </div>
      )}
      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <section className={`${panel} min-w-0 p-5 sm:p-6`} aria-labelledby="weekly-focus-pattern">
          <h2 id="weekly-focus-pattern" className="text-lg font-medium text-ink-primary">
            Your focus across the week
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/75">
            Compare daily totals. Today is highlighted; future days stay empty.
          </p>
          <div
            className="mt-5 h-56 w-full"
            role="img"
            aria-label={hours
              .map(
                (item) =>
                  `${item.label}: ${item.minutes === null ? 'upcoming' : `${item.minutes} minutes`}`
              )
              .join('; ')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hours} margin={{ left: -20, right: 0, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#2e2e38" vertical={false} />
                <XAxis dataKey="label" hide />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#aaa7ba', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#ffffff08' }}
                  formatter={(value) => [`${value} min`, 'Focus time']}
                  contentStyle={{
                    backgroundColor: '#141417',
                    borderColor: '#2e2e38',
                    borderRadius: 8,
                    color: '#e8e6f0',
                  }}
                  itemStyle={{ color: '#e8e6f0' }}
                />
                <Bar dataKey="minutes" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {hours.map((item) => (
                    <Cell key={item.key} fill={item.key === todayKey ? '#4b9eff' : '#345c89'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="ml-6 grid grid-cols-7 gap-1">
            {hours.map((item) => (
              <button
                key={item.key}
                disabled={item.minutes === null || !onSelectDay}
                onClick={() => onSelectDay?.(item.day)}
                aria-label={`Open Daily view for ${item.day.toLocaleDateString()}`}
                className={`flex min-h-11 flex-col items-center justify-center rounded-md text-xs focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default ${item.key === todayKey ? 'text-brand' : 'text-ink-primary/75'} ${item.minutes !== null ? 'hover:bg-depth-raised' : ''}`}
              >
                <span>{item.label}</span>
                {item.minutes === null && (
                  <span className="text-[9px] text-ink-primary/50">Upcoming</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-primary/70">
            Select a day to explore its Daily view.
          </p>
        </section>
        <section className={`${panel} min-w-0 p-5 sm:p-6`} aria-labelledby="weekly-projects">
          <h2 id="weekly-projects" className="text-lg font-medium text-ink-primary">
            Where your time went
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/75">
            Focus time by project for this week.
          </p>
          <div
            className="mt-5 max-h-60 space-y-6 overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            role="region"
            aria-label="Weekly project focus"
            tabIndex={0}
          >
            {entries.length ? (
              entries.map(([id, entry]) => {
                const share = projectTotal > 0 ? (entry.minutes / projectTotal) * 100 : 0
                return (
                  <div key={id}>
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-start gap-2 text-ink-primary">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden="true"
                        />
                        <span className="break-words">{entry.name}</span>
                      </span>
                      <span className="font-data shrink-0 text-xs text-ink-primary">
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
                    <p className="font-data mt-2 text-right text-xs text-ink-primary/70">
                      {share.toFixed(1)}% of this week’s time
                    </p>
                  </div>
                )
              })
            ) : (
              <p className="py-8 text-center text-sm text-ink-primary/70">
                Project totals will appear here after a focus session.
              </p>
            )}
          </div>
        </section>
      </div>
      <section
        className={`${panel} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
        aria-label="Previous week comparison"
      >
        <div>
          <h2 className="text-sm font-medium text-ink-primary">Compared with the previous week</h2>
          <p className="mt-2 text-xs leading-5 text-ink-primary/70">
            {futureWeek
              ? 'This week has not started yet.'
              : inProgress
                ? 'This week is still in progress. The previous period covers all seven days.'
                : 'Comparing two full calendar weeks.'}
          </p>
        </div>
        {!previousAccessible ? (
          <p className="text-xs text-ink-primary/70">
            Previous week is outside your accessible history.
          </p>
        ) : comparisonPending ? (
          <p className="text-xs text-ink-primary/70">Loading comparison…</p>
        ) : comparisonError ? (
          <button
            className="min-h-11 text-sm text-brand"
            onClick={() => {
              void prevQuery.refetch()
              void prevSessions.refetch()
            }}
          >
            Retry comparison
          </button>
        ) : futureWeek ? null : (
          <div className="text-right">
            <p className="font-data text-2xl text-brand">
              {difference > 0 ? '+' : difference < 0 ? '−' : ''}
              {formatMinutesToHours(Math.abs(difference))}
            </p>
            <p className="mt-2 text-xs text-ink-primary/75">
              Previous full week: {formatMinutesToHours(previousMinutes)}
              {previousMinutes > 0
                ? ` · ${((Math.abs(difference) / previousMinutes) * 100).toFixed(1)}% ${difference < 0 ? 'less' : 'more'}`
                : ' · no previous focus time'}
            </p>
          </div>
        )}
      </section>
      <GoalDialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} />
    </div>
  )
}
