import { useMemo, useState } from 'react'

import { BarChart2, CheckCircle, ChevronRight, Clock, FolderOpen, History, Target, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts'

import { GoalDialog } from '@/components/goals/GoalDialog'
import { TimerWidget } from '@/components/home/TimerWidget'
import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { SessionModal } from '@/components/sessions/SessionModal'
import { SessionRow } from '@/components/sessions/SessionRow'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Skeleton } from '@/components/ui/Skeleton'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { useProfile, useDailySummary, useDailySummariesRange } from '@/hooks/useAnalytics'
import { useGoals } from '@/hooks/useGoals'
import { useSessionsPaginated } from '@/hooks/useSessions'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'
import {
  formatMinutesToHours,
  formatPeriodKey,
  getDaysInWeek,
} from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'

const STAT_COLORS = {
  focus:    '#4B9EFF',
  sessions: '#3DD68C',
  goal:     '#F5A623',
} as const

// ── Today's stats row — icon chip + value + caption ─────────────────────────

function IconChip({ color, icon }: { color: string; icon: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: 32, height: 32, background: `${color}1F` }}
    >
      {icon}
    </div>
  )
}

interface StatCardProps {
  icon:      React.ReactNode
  value:     React.ReactNode
  label?:    string
  children?: React.ReactNode
}

function StatCard({ icon, value, label, children }: StatCardProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-4 sm:px-4">
      {icon}
      <span className="font-data mt-1 text-[20px] font-semibold leading-none text-ink-primary sm:text-[22px]">
        {value}
      </span>
      {label && (
        <span
          className="text-center leading-tight text-ink-secondary"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

const QUICK_LINKS = [
  { label: 'Analytics',   description: 'Review your focus patterns', icon: BarChart2,  path: PATHS.analytics   },
  { label: 'Leaderboard', description: 'See how you compare',        icon: Trophy,     path: PATHS.leaderboard },
  { label: 'Projects',    description: 'Choose what to work on',     icon: FolderOpen, path: PATHS.projects    },
  { label: 'Sessions',    description: 'Browse your focus history',  icon: History,    path: PATHS.sessions    },
]

const GREETINGS = {
  night:     ['Good night', 'Burning the midnight oil', 'Still going strong'],
  morning:   ['Good morning', 'Rise and focus', 'Fresh start'],
  afternoon: ['Good afternoon', 'Keep the momentum'],
  evening:   ['Good evening', 'Wrapping up strong'],
} as const satisfies Record<string, readonly string[]>

function getGreeting(): string {
  const h = new Date().getHours()
  const bucket = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  const options = GREETINGS[bucket]
  return options[Math.floor(Math.random() * options.length)]
}

export function HomePage() {
  // Picked once per page load, not re-rolled on every re-render.
  const greeting = useMemo(getGreeting, [])

  const today = useMemo(() => formatPeriodKey(new Date(), 'daily'), [])
  const weekDays = useMemo(() => getDaysInWeek(new Date()), [])
  const weekStart = useMemo(() => formatPeriodKey(weekDays[0], 'daily'), [weekDays])
  const weekEnd   = useMemo(() => formatPeriodKey(weekDays[6], 'daily'), [weekDays])

  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: dailySummary }  = useDailySummary(today)
  const { data: goals }         = useGoals()
  const { data: sessionsData }  = useSessionsPaginated(0)
  const { data: weekSummaries } = useDailySummariesRange(weekStart, weekEnd)

  const [editingSession,  setEditingSession]  = useState<SessionWithRelations | null>(null)
  const [viewingSession,  setViewingSession]  = useState<SessionWithRelations | null>(null)
  const [goalDialogOpen,  setGoalDialogOpen]  = useState(false)

  const sessions       = sessionsData?.sessions ?? []
  const recentSessions = sessions.slice(0, 3)

  const focusMinutes    = dailySummary?.focus_minutes  ?? 0
  const sessionCount    = dailySummary?.session_count  ?? 0
  const dailyGoalMins   = goals?.daily_goal_minutes    ?? null
  const goalPct         = dailyGoalMins
    ? Math.min(100, Math.round((focusMinutes / dailyGoalMins) * 100))
    : 0

  const rawName         = profile?.display_name
  const displayName     = rawName && !rawName.includes('@') ? rawName : undefined
  const currentStreak   = profile?.current_streak  ?? 0
  const longestStreak   = profile?.longest_streak  ?? 0
  const totalSessions   = profile?.total_sessions  ?? 0

  const weekChartData = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return weekDays.map((day, i) => {
      const key = formatPeriodKey(day, 'daily')
      const s   = weekSummaries?.find(ws => ws.date === key)
      return {
        day:     labels[i] ?? '',
        minutes: s?.focus_minutes ?? 0,
        isToday: key === today,
      }
    })
  }, [weekDays, weekSummaries, today])

  function handleEditFromDetail() {
    if (!viewingSession) return
    setEditingSession(viewingSession)
    setViewingSession(null)
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] py-2 sm:py-4">

      <header className="mb-5 flex flex-col gap-1 sm:mb-6">
        {profileLoading ? (
          <>
            <Skeleton width={240} height={28} borderRadius={6} />
            <Skeleton width={300} height={16} borderRadius={4} />
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-primary sm:text-[26px]">
              {displayName ? `${greeting}, ${displayName}` : greeting}
            </h1>
            <p className="text-[13px] text-ink-secondary sm:text-[14px]">
              Start a focused session or pick up where you left off.
            </p>
          </>
        )}
      </header>

      {/* Welcome banner — shown only when the user has zero sessions ever */}
      {totalSessions === 0 && profile && (
        <div
          className="mb-5 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3.5 sm:px-5"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Target size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink-primary">Welcome to Depthly</p>
            <p className="mt-0.5 text-[13px] text-ink-secondary">
              Start your first focus session to begin tracking your productivity
            </p>
          </div>
        </div>
      )}

      {/* Two-column responsive grid. On mobile the two column wrappers below
          become `contents` so their children act as direct siblings here —
          that lets the order-* utilities below reorder sections across what
          are visually two columns on desktop (lg:) without touching the
          desktop layout, which keeps its original two-column DOM/box structure. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] lg:gap-5">

        {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">

          {/* Lightweight timer widget — full controls available at /timer */}
          <div
            className="order-3 rounded-2xl border border-depth-border bg-depth-surface lg:order-none"
            style={{ padding: '24px' }}
          >
            <TimerWidget />
          </div>

          {/* Today's stats row */}
          <section className="order-4 overflow-hidden rounded-xl border border-depth-border bg-depth-surface lg:order-none" aria-label="Today's progress">
            {profileLoading ? (
              <div className="grid grid-cols-3 divide-x divide-depth-border">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 px-2 py-4"
                  >
                    <Skeleton width={32} height={32} borderRadius="50%" />
                    <Skeleton width={48} height={20} borderRadius={4} />
                    <Skeleton width={56} height={10} borderRadius={4} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 divide-x divide-depth-border">
                <StatCard
                  icon={<IconChip color={STAT_COLORS.focus} icon={<Clock style={{ width: 16, height: 16, color: STAT_COLORS.focus }} />} />}
                  value={formatMinutesToHours(focusMinutes)}
                  label="Focus today"
                />

                <StatCard
                  icon={<IconChip color={STAT_COLORS.sessions} icon={<CheckCircle style={{ width: 16, height: 16, color: STAT_COLORS.sessions }} />} />}
                  value={sessionCount}
                  label="Sessions today"
                />

                {/* Daily Goal — a real ring once a goal exists; a neutral
                    target icon (not an empty/misleading 0% ring) as a
                    prompt when it doesn't. */}
                <StatCard
                  icon={
                    dailyGoalMins === null ? (
                      <IconChip color="#7A7890" icon={<Target style={{ width: 16, height: 16, color: '#7A7890' }} />} />
                    ) : (
                      <ProgressRing
                        progress={goalPct / 100}
                        size={32}
                        strokeWidth={3}
                        color={STAT_COLORS.goal}
                      />
                    )
                  }
                  value={dailyGoalMins === null ? '—' : `${goalPct}%`}
                  label={dailyGoalMins === null ? undefined : 'Daily goal'}
                >
                  {dailyGoalMins === null && (
                    <button
                      type="button"
                      onClick={() => setGoalDialogOpen(true)}
                      className="text-[11px] font-medium text-brand hover:underline"
                    >
                      Set a goal →
                    </button>
                  )}
                </StatCard>
              </div>
            )}
          </section>

          {/* Recent sessions */}
          <div className="order-5 rounded-xl border border-depth-border bg-depth-surface p-4 lg:order-none">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[14px] font-medium text-ink-primary">Recent Sessions</span>
              <Link to={PATHS.sessions} className="text-[12px] text-brand hover:underline">
                View all →
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-6 text-center">
                <p className="text-[13px] text-ink-secondary">
                  Your completed focus sessions will appear here.
                </p>
                <Link to={PATHS.timer} className="mt-2 text-[12px] font-medium text-brand hover:underline">
                  Start your first session →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentSessions.map(session => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onOpenDetail={() => setViewingSession(session)}
                    onEdit={() => setEditingSession(session)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────────── */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">

          {/* Momentum */}
          <section className="order-2 rounded-xl border border-depth-border bg-depth-surface p-5 lg:order-none" aria-labelledby="momentum-title">
            {profileLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton width={60} height={60} borderRadius="50%" />
                <div className="flex flex-col gap-2">
                  <Skeleton width={120} height={16} borderRadius={4} />
                  <Skeleton width={80} height={12} borderRadius={4} />
                </div>
              </div>
            ) : (
              <div>
                <p id="momentum-title" className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">Momentum</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-data text-[26px] font-semibold leading-none text-ink-primary">
                      {currentStreak} <span className="font-sans text-[13px] font-medium text-ink-secondary">day streak</span>
                    </p>
                    <p className="mt-2 text-[12px] text-ink-muted">
                      {currentStreak === 0 ? 'Complete a session today to begin.' : `Personal best: ${longestStreak} days`}
                    </p>
                  </div>
                  {currentStreak > 0 && <StreakBadge days={currentStreak} />}
                </div>
              </div>
            )}
          </section>

          {/* This Week mini chart */}
          <section className="order-6 rounded-xl border border-depth-border bg-depth-surface p-5 lg:order-none" aria-labelledby="week-title">
            <div className="mb-3 flex items-baseline justify-between">
              <p id="week-title" className="text-[13px] font-medium text-ink-primary">This week</p>
              <span className="text-[11px] text-ink-muted">Focus minutes</span>
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart
                data={weekChartData}
                barCategoryGap="20%"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#3D3B4E' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]} minPointSize={3}>
                  {weekChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isToday ? '#4B9EFF' : '#222228'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Quick links */}
          <div className="order-7 rounded-xl border border-depth-border bg-depth-surface p-5 lg:order-none">
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-ink-muted">
              Quick access
            </p>
            <div className="divide-y divide-depth-border">
              {QUICK_LINKS.map(({ label, description, icon: Icon, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="group flex min-h-14 items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-200 hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-depth-raised text-ink-secondary transition-colors duration-200 group-hover:text-brand">
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink-primary">{label}</p>
                    <p className="truncate text-[11px] text-ink-muted">{description}</p>
                  </div>
                  <ChevronRight size={15} className="text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink-secondary" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Session detail modal */}
      <SessionDetailModal
        open={!!viewingSession}
        onClose={() => setViewingSession(null)}
        session={viewingSession}
        onEdit={handleEditFromDetail}
      />

      {/* Edit session modal */}
      <SessionModal
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession ?? undefined}
      />

      {/* Quick-set goal dialog */}
      <GoalDialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} />

    </div>
  )
}
