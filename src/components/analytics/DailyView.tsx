import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { GoalDialog } from '@/components/goals/GoalDialog'
import { GoalHistoryRow } from '@/components/goals/GoalHistoryRow'
import { Button } from '@/components/ui/button'
import { ConfettiBurst } from '@/components/ui/ConfettiBurst'
import { useDailySummary, useSessionsForDay, useDailySummariesRange } from '@/hooks/useAnalytics'
import { useGoalCelebration } from '@/hooks/useGoalCelebration'
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

interface DailyViewProps extends AnalyticsProjectScope {
  date: Date
}
export function DailyView({ date, projectId, projectLabel }: DailyViewProps) {
  const dateKey = formatPeriodKey(date, 'daily')
  const summaryQuery = useDailySummary(dateKey)
  const sessionQuery = useSessionsForDay(dateKey, projectId)
  const goalQuery = useGoals()
  const weekDays = getDaysInWeek(date)
  const historyQuery = useDailySummariesRange(
    formatPeriodKey(weekDays[0], 'daily'),
    formatPeriodKey(weekDays[6], 'daily')
  )
  const { windowDays, isPro } = useAnalyticsWindow()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (windowDays - 1))
  const locked = !isPro && dateKey < formatPeriodKey(cutoff, 'daily')
  const sessions = sessionQuery.data ?? []
  const overallMinutes = summaryQuery.data?.focus_minutes ?? 0
  const minutes =
    projectId !== undefined
      ? sessions.reduce((sum, session) => sum + session.duration_mins, 0)
      : overallMinutes
  const count = projectId !== undefined ? sessions.length : (summaryQuery.data?.session_count ?? 0)
  const target = goalQuery.data?.daily_goal_minutes ?? null
  const goal = target !== null ? getGoalProgress(overallMinutes, target) : null
  const { shouldCelebrate } = useGoalCelebration(
    overallMinutes,
    target,
    dateKey === formatPeriodKey(new Date(), 'daily')
  )
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 }))
  const projects = new Map<string, { name: string; color: string; minutes: number }>()
  for (const session of sessions) {
    hours[new Date(session.started_at).getHours()].minutes += session.duration_mins
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
        <p>We couldn’t load this day’s focus activity.</p>
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
        aria-label="Daily focus summary"
        className={`${panel} relative grid grid-cols-1 overflow-hidden sm:grid-cols-2 xl:grid-cols-4`}
      >
        <ConfettiBurst trigger={shouldCelebrate} />
        <div className="border-b border-depth-border p-5 sm:p-6 xl:border-b-0">
          <h2 className="text-sm font-medium text-ink-primary/80">Time focused</h2>
          <p className="font-data mt-4 text-3xl text-ink-primary">
            {formatMinutesToHours(minutes)}
          </p>
          <p className="mt-4 text-xs text-ink-primary/70">
            {projectId !== undefined ? projectLabel : 'Recorded on this day'}
          </p>
        </div>
        <div className="border-b border-depth-border p-5 sm:border-l sm:p-6 xl:border-b-0">
          <h2 className="text-sm font-medium text-ink-primary/80">Focus sessions</h2>
          <p className="font-data mt-4 text-3xl text-ink-primary">{count}</p>
          <p className="mt-4 text-xs text-ink-primary/70">Completed focus sessions</p>
        </div>
        <div className="min-w-0 p-5 sm:col-span-2 sm:p-6 xl:border-l xl:border-depth-border">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-primary/80">Daily goal</h2>
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
                aria-label="Overall daily goal"
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
                  {goal.isComplete ? 'Daily goal reached' : `${goal.remaining} min to your goal`}
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
            Compared with your current daily target.
          </p>
        </div>
      </section>
      {count === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-depth-border px-5 py-4">
          <div>
            <h2 className="text-sm font-medium text-ink-primary">
              No focus sessions on this day{projectId !== undefined ? ` for ${projectLabel}` : ''}.
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
        <section className={`${panel} min-w-0 p-5 sm:p-6`} aria-labelledby="daily-start-hours">
          <h2 id="daily-start-hours" className="text-lg font-medium text-ink-primary">
            Focus by session start hour
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/75">
            See when your recorded sessions began.
          </p>
          <div
            className="mt-5 h-56 w-full"
            role="img"
            aria-label={`Focus minutes by local session start hour: ${
              hours
                .filter((slot) => slot.minutes > 0)
                .map((slot) => `${slot.hour}:00, ${slot.minutes} minutes`)
                .join('; ') || 'no sessions'
            }`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hours} margin={{ left: -20, right: 0, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-depth-border, var(--color-border))" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(hour) => `${String(hour).padStart(2, '0')}`}
                  interval={2}
                  tick={{ fill: '#aaa7ba', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#aaa7ba', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#ffffff08' }}
                  labelFormatter={(hour) =>
                    `Started in the ${String(hour).padStart(2, '0')}:00 hour`
                  }
                  formatter={(value) => [`${value} min`, 'Focus time']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-raised)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text)',
                  }}
                  itemStyle={{ color: 'var(--color-text)' }}
                />
                <Bar
                  dataKey="minutes"
                  fill="#4B9EFF"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-primary/70">
            Each bar includes the full duration of sessions that started in that hour.
          </p>
        </section>
        <section className={`${panel} min-w-0 p-5 sm:p-6`} aria-labelledby="daily-projects">
          <h2 id="daily-projects" className="text-lg font-medium text-ink-primary">
            Where your time went
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/75">
            Focus time by project for this day.
          </p>
          <div
            className="mt-5 max-h-60 space-y-6 overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            role="region"
            aria-label="Daily project focus"
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
                      {share.toFixed(1)}% of this day’s time
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
        className={`${panel} flex flex-wrap items-center justify-between gap-6 p-5 sm:p-6`}
        aria-label="Weekly goal history"
      >
        <div>
          <h2 className="text-sm font-medium text-ink-primary">Daily goal this week</h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/70">
            Recorded goal results for the selected week.
          </p>
        </div>
        {historyQuery.isPending ? (
          <div className="h-8 w-60 animate-pulse rounded bg-depth-raised" />
        ) : historyQuery.isError ? (
          <button
            className="min-h-11 text-sm text-brand"
            onClick={() => void historyQuery.refetch()}
          >
            Retry goal history
          </button>
        ) : (
          <div
            className="min-w-0 max-w-full overflow-x-auto p-1"
            role="region"
            aria-label="Weekly goal results"
            tabIndex={0}
          >
            <div className="min-w-max">
              <GoalHistoryRow weekDays={weekDays} summaries={historyQuery.data ?? []} />
            </div>
          </div>
        )}
      </section>
      <GoalDialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} />
    </div>
  )
}
