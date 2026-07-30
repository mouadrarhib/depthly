import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { BarChart2, CheckCircle, Clock, FolderOpen, History, Target, Trophy } from 'lucide-react'

import { TimerWidget } from '@/components/home/TimerWidget'
import { SessionRow } from '@/components/sessions/SessionRow'
import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { SessionModal } from '@/components/sessions/SessionModal'
import { GoalDialog } from '@/components/goals/GoalDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProfile, useDailySummary, useDailySummariesRange } from '@/hooks/useAnalytics'
import { useGoals } from '@/hooks/useGoals'
import { useSessionsPaginated, useDeleteSession } from '@/hooks/useSessions'
import {
  formatMinutesToHours,
  formatPeriodKey,
  getDaysInWeek,
} from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

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
  accent?:   string
  icon:      React.ReactNode
  value:     React.ReactNode
  label?:    string
  children?: React.ReactNode
}

function StatCard({ accent, icon, value, label, children }: StatCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl border border-depth-border bg-depth-surface"
      style={{
        padding:   '14px 8px',
        borderTop: accent ? `2px solid ${accent}` : undefined,
      }}
    >
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
  { label: 'Analytics',   icon: <BarChart2  size={24} style={{ color: '#4B9EFF' }} />, path: PATHS.analytics   },
  { label: 'Leaderboard', icon: <Trophy     size={24} style={{ color: '#F5A623' }} />, path: PATHS.leaderboard },
  { label: 'Projects',    icon: <FolderOpen size={24} style={{ color: '#3DD68C' }} />, path: PATHS.projects    },
  { label: 'Sessions',    icon: <History    size={24} style={{ color: '#A78BFA' }} />, path: PATHS.sessions    },
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
  const [deletingSession, setDeletingSession] = useState<SessionWithRelations | null>(null)
  const [viewingSession,  setViewingSession]  = useState<SessionWithRelations | null>(null)
  const [goalDialogOpen,  setGoalDialogOpen]  = useState(false)
  const deleteSession = useDeleteSession()

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

  function handleDeleteConfirm() {
    if (!deletingSession) return
    deleteSession.mutate(deletingSession.id, {
      onSuccess: () => setDeletingSession(null),
    })
  }

  function handleEditFromDetail() {
    if (!viewingSession) return
    setEditingSession(viewingSession)
    setViewingSession(null)
  }

  function handleDeleteFromDetail() {
    if (!viewingSession) return
    setDeletingSession(viewingSession)
    setViewingSession(null)
  }

  return (
    <div className="px-4 py-5 sm:px-6">

      {/* Welcome banner — shown only when the user has zero sessions ever */}
      {totalSessions === 0 && profile && (
        <div
          className="mb-5 flex items-center gap-3 rounded-xl border border-brand/20 px-5 py-4"
          style={{ background: 'rgba(75,158,255,0.06)' }}
        >
          <span style={{ fontSize: 22 }}>🎯</span>
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
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-5">

        {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
        <div className="contents lg:flex lg:flex-col lg:gap-3">

          {/* Lightweight timer widget — full controls available at /timer */}
          <div
            className="order-3 rounded-2xl border border-depth-border bg-depth-surface lg:order-none"
            style={{ padding: '24px' }}
          >
            <TimerWidget />
          </div>

          {/* Today's stats row */}
          <div className="order-4 grid grid-cols-3 gap-2.5 sm:gap-3 lg:order-none">
            {profileLoading ? (
              /* Skeleton stat cards */
              <>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 rounded-xl border border-depth-border bg-depth-surface"
                    style={{ padding: '14px 8px' }}
                  >
                    <Skeleton width={32} height={32} borderRadius="50%" />
                    <Skeleton width={48} height={20} borderRadius={4} />
                    <Skeleton width={56} height={10} borderRadius={4} />
                  </div>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  accent={STAT_COLORS.focus}
                  icon={<IconChip color={STAT_COLORS.focus} icon={<Clock style={{ width: 16, height: 16, color: STAT_COLORS.focus }} />} />}
                  value={formatMinutesToHours(focusMinutes)}
                  label="Focus today"
                />

                <StatCard
                  accent={STAT_COLORS.sessions}
                  icon={<IconChip color={STAT_COLORS.sessions} icon={<CheckCircle style={{ width: 16, height: 16, color: STAT_COLORS.sessions }} />} />}
                  value={sessionCount}
                  label="Sessions today"
                />

                {/* Daily Goal — a real ring once a goal exists; a neutral
                    target icon (not an empty/misleading 0% ring) as a
                    prompt when it doesn't. */}
                <StatCard
                  accent={dailyGoalMins === null ? undefined : STAT_COLORS.goal}
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
              </>
            )}
          </div>

          {/* Recent sessions */}
          <div className="order-5 rounded-xl border border-depth-border bg-depth-surface p-4 lg:order-none">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[14px] font-medium text-ink-primary">Recent Sessions</span>
              <Link to={PATHS.sessions} className="text-[12px] text-brand hover:underline">
                View all →
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <p className="py-5 text-center text-[13px] text-ink-secondary">
                No sessions yet — start the timer to record your first session
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentSessions.map(session => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onOpenDetail={() => setViewingSession(session)}
                    onEdit={() => setEditingSession(session)}
                    onDelete={() => setDeletingSession(session)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────────── */}
        <div className="contents lg:flex lg:flex-col lg:gap-3">

          {/* Greeting */}
          <div
            className="order-1 rounded-xl border border-depth-border bg-depth-surface lg:order-none"
            style={{ padding: '16px 20px' }}
          >
            {profileLoading ? (
              <Skeleton width={200} height={28} borderRadius={6} />
            ) : (
              <p className="text-[18px] font-medium text-ink-primary">
                {displayName ? `${greeting}, ${displayName} 👋` : `${greeting} 👋`}
              </p>
            )}
          </div>

          {/* Streak */}
          <div
            className="order-2 rounded-xl border border-depth-border bg-depth-surface lg:order-none"
            style={{ padding: '16px 20px' }}
          >
            {profileLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton width={60} height={60} borderRadius="50%" />
                <div className="flex flex-col gap-2">
                  <Skeleton width={120} height={16} borderRadius={4} />
                  <Skeleton width={80} height={12} borderRadius={4} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Flame icon — inline style as required for streak color */}
                <span style={{ fontSize: 28, lineHeight: 1, color: '#C8FF64' }}>🔥</span>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="font-data font-bold"
                      style={{ fontSize: 36, lineHeight: 1, color: '#C8FF64' }}
                    >
                      {currentStreak}
                    </span>
                    <span className="text-[14px] text-ink-secondary">day streak</span>
                  </div>
                  {currentStreak === 0 ? (
                    <p className="mt-1 text-[13px] text-ink-muted">
                      Start your streak today
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px] text-ink-muted">
                      Longest: {longestStreak} days
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* This Week mini chart */}
          <div className="order-6 rounded-xl border border-depth-border bg-depth-surface p-5 lg:order-none">
            <p className="mb-3 text-[13px] font-medium text-ink-primary">This Week</p>
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
          </div>

          {/* Quick links */}
          <div className="order-7 rounded-xl border border-depth-border bg-depth-surface p-5 lg:order-none">
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-ink-muted">
              Quick access
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LINKS.map(({ label, icon, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex flex-col gap-[10px] rounded-[10px] border border-depth-border bg-depth-raised p-4 transition-colors hover:border-brand/20 hover:bg-[#1C1C22]"
                >
                  {icon}
                  <span className="text-[13px] font-medium text-ink-primary">{label}</span>
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
        onDelete={handleDeleteFromDetail}
      />

      {/* Edit session modal */}
      <SessionModal
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession ?? undefined}
      />

      {/* Delete session confirm */}
      <ConfirmDialog
        open={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete session?"
        description="This session will be permanently deleted."
        confirmLabel="Delete"
        isLoading={deleteSession.isPending}
        variant="danger"
      />

      {/* Quick-set goal dialog */}
      <GoalDialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} />

    </div>
  )
}
