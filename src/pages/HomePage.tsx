import { useMemo, useState } from 'react'

import { ChevronRight, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts'

import { GoalDialog } from '@/components/goals/GoalDialog'
import { TimerWidget } from '@/components/home/TimerWidget'
import { TodayPlanCard } from '@/components/home/TodayPlanCard'
import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { SessionModal } from '@/components/sessions/SessionModal'
import { SessionRow } from '@/components/sessions/SessionRow'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDailySummariesRange, useDailySummary, useProfile } from '@/hooks/useAnalytics'
import { useGoals } from '@/hooks/useGoals'
import { useProjects } from '@/hooks/useProjects'
import { useSessionsPaginated } from '@/hooks/useSessions'
import { useSetTaskOccurrence, useTaskOccurrences } from '@/hooks/useTaskOccurrences'
import { usePlannerTasks, useUpdateTask } from '@/hooks/useTasks'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'
import { formatPeriodKey, getDaysInWeek } from '@/lib/utils/analytics'
import { addDays, dateKey } from '@/lib/utils/plannerDates'
import { daysInRange, entriesForDay } from '@/lib/utils/recurrence'
import type { PlannerEntry, OccurrenceState } from '@/lib/utils/recurrence'
import { PATHS } from '@/routes/paths'
import { showSaveToast, useTimerStore } from '@/store/timerStore'

const QUICK_LINKS = [
  { label: 'Projects', description: 'Choose what to work on', path: PATHS.projects },
  { label: 'Analytics', description: 'Review focus patterns', path: PATHS.analytics },
  { label: 'Sessions', description: 'Browse your history', path: PATHS.sessions },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage() {
  const greeting = useMemo(getGreeting, [])
  const today = useMemo(() => formatPeriodKey(new Date(), 'daily'), [])
  const weekDays = useMemo(() => getDaysInWeek(new Date()), [])
  const weekStart = useMemo(() => formatPeriodKey(weekDays[0], 'daily'), [weekDays])
  const weekEnd = useMemo(() => formatPeriodKey(weekDays[6], 'daily'), [weekDays])

  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: dailySummary } = useDailySummary(today)
  const { data: goals } = useGoals()
  const { data: sessionsData } = useSessionsPaginated(0)
  const { data: weekSummaries } = useDailySummariesRange(weekStart, weekEnd)
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = usePlannerTasks()
  const { data: projects = [] } = useProjects()
  const historyStart = useMemo(() => dateKey(addDays(new Date(), -7)), [])
  const upcomingEnd = useMemo(() => dateKey(addDays(new Date(), 7)), [])
  const {
    data: occurrences = [],
    isLoading: occurrencesLoading,
    isError: occurrencesError,
  } = useTaskOccurrences(historyStart, upcomingEnd)
  const updateTask = useUpdateTask()
  const setOccurrence = useSetTaskOccurrence()
  const selectedTaskId = useTimerStore((state) => state.selectedTaskId)
  const isTimerRunning = useTimerStore((state) => state.isRunning)
  const isTimerPaused = useTimerStore((state) => state.isPaused)
  const setSelectedProject = useTimerStore((state) => state.setSelectedProject)
  const setSelectedTask = useTimerStore((state) => state.setSelectedTask)

  const [editingSession, setEditingSession] = useState<SessionWithRelations | null>(null)
  const [viewingSession, setViewingSession] = useState<SessionWithRelations | null>(null)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)

  const recentSessions = (sessionsData?.sessions ?? []).slice(0, 3)
  const focusMinutes = dailySummary?.focus_minutes ?? 0
  const sessionCount = dailySummary?.session_count ?? 0
  const dailyGoalMins = goals?.daily_goal_minutes ?? null
  const goalPct = dailyGoalMins
    ? Math.min(100, Math.round((focusMinutes / dailyGoalMins) * 100))
    : 0
  const minutesRemaining = dailyGoalMins ? Math.max(0, dailyGoalMins - focusMinutes) : 0
  const rawName = profile?.display_name
  const displayName = rawName && !rawName.includes('@') ? rawName : undefined
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects]
  )
  const occurrenceStates = useMemo(
    () =>
      new Map(
        occurrences.map((row) => [
          `${row.task_id}:${row.occurrence_date}`,
          row.state as OccurrenceState,
        ])
      ),
    [occurrences]
  )
  const todayEntries = useMemo(
    () =>
      entriesForDay(tasks, occurrenceStates, today).sort((a, b) => {
        const stateScore = (entry: PlannerEntry) =>
          entry.state === 'open' ? 0 : entry.state === 'done' ? 1 : 2
        return (
          stateScore(a) - stateScore(b) ||
          (a.task.due_date ?? '9999').localeCompare(b.task.due_date ?? '9999') ||
          a.task.title.localeCompare(b.task.title)
        )
      }),
    [tasks, occurrenceStates, today]
  )
  const nextTask =
    todayEntries.find((entry) => entry.state === 'open' && entry.task.id === selectedTaskId) ??
    todayEntries.find((entry) => entry.state === 'open')
  const missedTask = useMemo(() => {
    const recentDays = daysInRange(historyStart, dateKey(addDays(new Date(), -1)))
    const recurring = tasks
      .filter((task) => task.status !== 'done' && task.repeat_days)
      .flatMap((task) => {
        const missed = [...recentDays]
          .reverse()
          .find((day) =>
            entriesForDay([task], occurrenceStates, day).some((entry) => entry.state === 'open')
          )
        return missed ? entriesForDay([task], occurrenceStates, missed) : []
      })
    const oneOff = tasks
      .filter(
        (task) =>
          task.status !== 'done' &&
          !task.repeat_days &&
          task.scheduled_date &&
          task.scheduled_date < today
      )
      .map(
        (task): PlannerEntry => ({
          task,
          date: task.scheduled_date!,
          recurring: false,
          state: 'open',
        })
      )
    return [...oneOff, ...recurring].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  }, [tasks, occurrenceStates, historyStart, today])
  const upcomingTasks = useMemo(() => {
    const days = daysInRange(dateKey(addDays(new Date(), 1)), upcomingEnd)
    const seen = new Set<string>()
    const upcoming: PlannerEntry[] = []
    for (const day of days) {
      for (const entry of entriesForDay(tasks, occurrenceStates, day)) {
        if (entry.state !== 'open' || seen.has(entry.task.id)) continue
        seen.add(entry.task.id)
        upcoming.push(entry)
        if (upcoming.length === 2) return upcoming
      }
    }
    return upcoming
  }, [tasks, occurrenceStates, upcomingEnd])

  function selectPlanTask(entry: PlannerEntry) {
    const timer = useTimerStore.getState()
    if (timer.isRunning || timer.isPaused) {
      showSaveToast('Finish or stop your current session before choosing another task')
      return
    }
    setSelectedProject(entry.task.project_id)
    setSelectedTask(entry.task.id)
    document.getElementById('home-focus-timer')?.scrollIntoView({ block: 'start' })
  }

  function togglePlanDone(entry: PlannerEntry) {
    if (entry.recurring) {
      setOccurrence.mutate({
        taskId: entry.task.id,
        date: today,
        state: entry.state === 'done' ? 'open' : 'done',
      })
    } else {
      const done = entry.task.status === 'done'
      updateTask.mutate({
        id: entry.task.id,
        projectId: entry.task.project_id,
        data: {
          status: done ? 'todo' : 'done',
          completed_at: done ? null : new Date().toISOString(),
        },
      })
    }
  }

  const weekChartData = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return weekDays.map((day, index) => {
      const key = formatPeriodKey(day, 'daily')
      const summary = weekSummaries?.find((item) => item.date === key)
      return { day: labels[index], minutes: summary?.focus_minutes ?? 0, isToday: key === today }
    })
  }, [weekDays, weekSummaries, today])

  const handleEditFromDetail = () => {
    if (!viewingSession) return
    setEditingSession(viewingSession)
    setViewingSession(null)
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 py-2 sm:space-y-6 sm:py-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {profileLoading ? (
            <div className="space-y-2">
              <Skeleton width={240} height={32} borderRadius={6} />
              <Skeleton width={300} height={16} borderRadius={4} />
            </div>
          ) : (
            <>
              <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[34px]">
                {displayName ? `${greeting}, ${displayName}` : greeting}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose one task, then give it a focused block of time.
              </p>
            </>
          )}
        </div>
        <div
          className="flex w-fit items-center gap-5 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground sm:gap-6"
          aria-label="Today's activity"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Today so far
            </p>
            <p className="font-data mt-1 text-base font-semibold text-foreground">
              {focusMinutes} min
            </p>
          </div>
          <span className="h-9 w-px bg-border" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sessions
            </p>
            <p className="font-data mt-1 text-base font-semibold text-foreground">
              {sessionCount}
            </p>
          </div>
        </div>
      </header>

      {profile?.total_sessions === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3.5">
          <Target size={19} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-foreground">Welcome to Depthly.</span> Start your
            first focus session to begin tracking your progress.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.87fr)] lg:gap-5">
        <section
          id="home-focus-timer"
          className="min-w-0 scroll-mt-20 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7 lg:min-h-[396px]"
          aria-label="Focus timer"
        >
          <TimerWidget
            nextTask={nextTask}
            projectName={nextTask ? projectNames.get(nextTask.task.project_id) : undefined}
          />
        </section>

        <TodayPlanCard
          entries={todayEntries}
          missed={missedTask}
          upcoming={upcomingTasks}
          projectNames={projectNames}
          isLoading={tasksLoading || occurrencesLoading}
          isError={tasksError || occurrencesError}
          isSaving={updateTask.isPending || setOccurrence.isPending}
          canSelectTask={!isTimerRunning && !isTimerPaused}
          saveError={updateTask.isError || setOccurrence.isError}
          onSelectTask={selectPlanTask}
          onToggleDone={togglePlanDone}
        />

        <section
          className="min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5"
          aria-labelledby="recent-heading"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-heading" className="text-base font-semibold text-foreground">
              Recent sessions
            </h2>
            <Link
              to={PATHS.sessions}
              className="inline-flex min-h-9 items-center text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              View all →
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Your completed focus sessions will appear here.
              </p>
              <Link
                to={PATHS.timer}
                className="mt-2 inline-flex min-h-9 items-center text-xs font-medium text-brand hover:underline"
              >
                Start your first session →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onOpenDetail={() => setViewingSession(session)}
                  onEdit={() => setEditingSession(session)}
                />
              ))}
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-border bg-card p-5 text-card-foreground lg:min-h-[270px]"
          aria-labelledby="daily-goal-heading"
        >
          <h2 id="daily-goal-heading" className="text-base font-semibold text-foreground">
            Daily goal
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Keep your target in view as you work.</p>
          {dailyGoalMins ? (
            <>
              <p className="font-data mt-6 text-[26px] font-semibold text-foreground">
                {focusMinutes}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / {dailyGoalMins} min
                </span>
              </p>
              <div
                role="progressbar"
                aria-label="Daily focus goal"
                aria-valuenow={goalPct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-brand" style={{ width: `${goalPct}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {minutesRemaining === 0
                    ? 'Goal reached today'
                    : `${minutesRemaining} min to your target`}
                </span>
                <span className="font-data text-brand">{goalPct}%</span>
              </div>
            </>
          ) : (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground">
                Set a daily focus target to track your progress.
              </p>
              <button
                type="button"
                onClick={() => setGoalDialogOpen(true)}
                className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Set a goal →
              </button>
            </div>
          )}
        </section>

        <nav
          className="rounded-2xl border border-border bg-card p-5 text-card-foreground"
          aria-label="Keep moving"
        >
          <h2 className="text-base font-semibold text-foreground">Keep moving</h2>
          <p className="mt-1 text-xs text-muted-foreground">Your next useful places.</p>
          <div className="mt-4 divide-y divide-border border-t border-border sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="group flex min-h-[60px] items-center justify-between gap-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-3 first:sm:pl-0 last:sm:pr-0"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground group-hover:text-brand">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {link.description}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-muted-foreground group-hover:text-brand"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </nav>
        <section
          className="rounded-2xl border border-border bg-card p-5 text-card-foreground lg:min-h-[170px]"
          aria-labelledby="week-heading"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="week-heading" className="text-base font-semibold text-foreground">
              This week
            </h2>
            <span className="text-xs text-muted-foreground">Focus minutes</span>
          </div>
          <div
            className="mt-6"
            role="img"
            aria-label={`This week's focus minutes: ${weekChartData.map((entry) => `${entry.day} ${entry.minutes}`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height={105}>
              <BarChart
                data={weekChartData}
                barCategoryGap="28%"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#9290A4' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="minutes" radius={[4, 4, 0, 0]} minPointSize={3}>
                  {weekChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.isToday ? '#4B9EFF' : '#354258'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <SessionDetailModal
        open={!!viewingSession}
        onClose={() => setViewingSession(null)}
        session={viewingSession}
        onEdit={handleEditFromDetail}
      />
      <SessionModal
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession ?? undefined}
      />
      <GoalDialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} />
    </div>
  )
}
