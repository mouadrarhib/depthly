import { useState } from 'react'
import { Lock } from 'lucide-react'
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
  LabelList,
} from 'recharts'

import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { ProjectBreakdownCard, type ProjectEntry } from '@/components/analytics/ProjectBreakdownCard'
import type { SessionProjectSliceWithDate } from '@/lib/supabase/queries/analytics'
import { useDailySummariesRange, useSessionsForWeek } from '@/hooks/useAnalytics'
import { useGoals } from '@/hooks/useGoals'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import {
  getDaysInWeek,
  formatPeriodKey,
  navigatePeriod,
  formatMinutesToHours,
  getGoalProgress,
} from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'

interface WeeklyViewProps {
  date: Date
}

interface DayProjectSlice {
  name:    string
  color:   string
  minutes: number
}

interface DayEntry {
  day:           string
  date:          string
  dateObj:       Date
  focus_minutes: number
  session_count: number
  isToday:       boolean
  isFuture:      boolean
  projects:      DayProjectSlice[]
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── card style ───────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         14,
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 16, width: '60%', margin: '0 auto 16px' }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 1, marginBottom: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div className="bg-depth-raised animate-pulse rounded" style={{ height: 12, width: '60%' }} />
            <div className="bg-depth-raised animate-pulse rounded" style={{ height: 32, width: '70%' }} />
            <div className="bg-depth-raised animate-pulse rounded" style={{ height: 12, width: '80%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartCardSkeleton() {
  return (
    <div style={card}>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 130 }} />
    </div>
  )
}

// ─── tooltip ─────────────────────────────────────────────────────────────────

interface TooltipPayload {
  value:   number
  payload: DayEntry
}

interface ChartTooltipProps {
  active?:  boolean
  payload?: TooltipPayload[]
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const entry    = payload[0].payload
  const dayName  = entry.dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr  = entry.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const sess     = entry.session_count
  return (
    <div style={{
      backgroundColor: '#141417',
      border:          '1px solid #2E2E38',
      borderRadius:    8,
      padding:         '10px 14px',
    }}>
      <div style={{ fontSize: 13, color: '#E8E6F0', fontWeight: 500, marginBottom: 4 }}>
        {dayName}, {dateStr}
      </div>
      <div className="font-data" style={{ fontSize: 16, color: '#4B9EFF' }}>
        {formatMinutesToHours(entry.focus_minutes)}
      </div>
      <div style={{ fontSize: 12, color: '#7A7890', marginTop: 2 }}>
        {sess} session{sess !== 1 ? 's' : ''}
      </div>
      {entry.projects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8, paddingTop: 8, borderTop: '1px solid #2E2E38' }}>
          {entry.projects.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#7A7890', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span className="font-data" style={{ fontSize: 11, color: '#E8E6F0', flexShrink: 0 }}>
                {formatMinutesToHours(p.minutes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d    = new Date(date)
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── main component ───────────────────────────────────────────────────────────

export function WeeklyView({ date }: WeeklyViewProps) {
  const monday     = getMonday(date)
  const days       = getDaysInWeek(monday)
  const mondayKey  = formatPeriodKey(days[0], 'daily')
  const sundayKey  = formatPeriodKey(days[6], 'daily')

  const prevMonday = getMonday(navigatePeriod(monday, 'weekly', 'prev'))
  const prevDays   = getDaysInWeek(prevMonday)
  const prevMonKey = formatPeriodKey(prevDays[0], 'daily')
  const prevSunKey = formatPeriodKey(prevDays[6], 'daily')

  const { data: summaries,     isLoading: loadingThis } = useDailySummariesRange(mondayKey, sundayKey)
  const { data: prevSummaries, isLoading: loadingPrev } = useDailySummariesRange(prevMonKey, prevSunKey)
  const { data: weekSessions,  isLoading: loadingWeekSessions } = useSessionsForWeek(mondayKey, sundayKey)
  const { data: goals } = useGoals()

  const isLoading = loadingThis || loadingPrev || loadingWeekSessions
  const todayKey  = formatPeriodKey(new Date(), 'daily')
  const { windowDays, isPro } = useAnalyticsWindow()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffKey   = formatPeriodKey(cutoff, 'daily')
  const showOverlay = !isPro && mondayKey < cutoffKey

  const summaryMap = new Map((summaries ?? []).map(s => [s.date, s]))
  const prevMap    = new Map((prevSummaries ?? []).map(s => [s.date, s]))

  const thisWeekMinutes = days.reduce((sum, d) =>
    sum + (summaryMap.get(formatPeriodKey(d, 'daily'))?.focus_minutes ?? 0), 0)
  const prevWeekMinutes = prevDays.reduce((sum, d) =>
    sum + (prevMap.get(formatPeriodKey(d, 'daily'))?.focus_minutes ?? 0), 0)
  const thisWeekSessions = days.reduce((sum, d) =>
    sum + (summaryMap.get(formatPeriodKey(d, 'daily'))?.session_count ?? 0), 0)

  // Group this week's sessions by local day so each bar's tooltip can list
  // which project(s) were worked on that day.
  const sessionsByDay = new Map<string, SessionProjectSliceWithDate[]>()
  for (const s of weekSessions ?? []) {
    const dayKey = formatPeriodKey(new Date(s.started_at), 'daily')
    const list   = sessionsByDay.get(dayKey)
    if (list) list.push(s)
    else sessionsByDay.set(dayKey, [s])
  }

  // Build 7-entry chart data
  const chartData: DayEntry[] = days.map((d, i) => {
    const key      = formatPeriodKey(d, 'daily')
    const isFuture = key > todayKey

    const dayProjectMap = new Map<string, DayProjectSlice>()
    for (const s of sessionsByDay.get(key) ?? []) {
      const pid   = s.project_id ?? '__none__'
      const name  = s.projects?.name  ?? 'No project'
      const color = s.projects?.color ?? '#7A7890'
      const cur   = dayProjectMap.get(pid)
      if (cur) cur.minutes += s.duration_mins
      else dayProjectMap.set(pid, { name, color, minutes: s.duration_mins })
    }
    const dayProjects = [...dayProjectMap.values()].sort((a, b) => b.minutes - a.minutes)

    return {
      day:           DAY_LABELS[i],
      date:          d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dateObj:       d,
      focus_minutes: isFuture ? 0 : (summaryMap.get(key)?.focus_minutes ?? 0),
      session_count: isFuture ? 0 : (summaryMap.get(key)?.session_count ?? 0),
      isToday:       key === todayKey,
      isFuture,
      projects:      isFuture ? [] : dayProjects,
    }
  })

  // Focus Time by Project — aggregated across this week's focus sessions
  const projectMap = new Map<string, Omit<ProjectEntry, 'pct'>>()
  for (const s of weekSessions ?? []) {
    const pid   = s.project_id ?? '__none__'
    const name  = s.projects?.name  ?? 'No project'
    const color = s.projects?.color ?? '#7A7890'
    const cur   = projectMap.get(pid)
    if (cur) cur.minutes += s.duration_mins
    else projectMap.set(pid, { name, color, minutes: s.duration_mins })
  }
  const totalProjectMinutes = [...projectMap.values()].reduce((s, p) => s + p.minutes, 0)
  const weekProjectPieData: ProjectEntry[] = [...projectMap.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .map(p => ({ ...p, pct: totalProjectMinutes > 0 ? Math.round((p.minutes / totalProjectMinutes) * 100) : 0 }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Top two-column grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr] sm:items-stretch">

        {/* Left: Weekly Summary */}
        {isLoading ? <SummaryCardSkeleton /> : (
          <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E6F0', textAlign: 'center' }}>
              Weekly Summary
            </div>
            <div style={{ height: 1, backgroundColor: '#2E2E38', margin: '16px 0' }} />

            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
              {/* Focus Time stat */}
              <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#7A7890' }}>Focus Time</div>
                <div
                  className="font-data"
                  style={{ fontSize: 28, fontWeight: 600, color: '#E8E6F0', lineHeight: 1.1, marginTop: 4 }}
                >
                  {formatMinutesToHours(thisWeekMinutes)}
                </div>
                <div style={{ fontSize: 11, color: '#7A7890', marginTop: 6 }}>
                  Prev: {formatMinutesToHours(prevWeekMinutes)}
                </div>
              </div>

              {/* Sessions stat */}
              <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#7A7890' }}>Sessions</div>
                <div
                  className="font-data"
                  style={{ fontSize: 28, fontWeight: 700, color: '#E8E6F0', lineHeight: 1.1, marginTop: 4 }}
                >
                  {thisWeekSessions}
                </div>
              </div>
            </div>

            {/* Weekly Goal stat — full width, below Focus Time / Sessions */}
            {goals?.weekly_goal_minutes != null && (() => {
              const goal      = getGoalProgress(thisWeekMinutes, goals.weekly_goal_minutes)
              const fillColor = goal.isComplete ? '#3DD68C' : '#4B9EFF'
              return (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#7A7890', marginBottom: 8 }}>Weekly Goal</div>
                  <div style={{ height: 8, borderRadius: 999, backgroundColor: '#222228', overflow: 'hidden' }}>
                    <div
                      style={{
                        height:          '100%',
                        borderRadius:    999,
                        backgroundColor: fillColor,
                        width:           `${goal.percentage}%`,
                        transition:      'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: fillColor, marginTop: 6 }}>
                    {goal.isComplete ? 'Goal reached! 🎉' : `${goal.percentage}% complete`}
                  </div>
                </div>
              )
            })()}
            </div>
          </div>
        )}

        {/* Right: Focus by Project */}
        <ProjectBreakdownCard
          pieData={weekProjectPieData}
          isLoading={isLoading}
          title="Focus Time by Project"
          subtitle="See how you've spent your focus time this week"
          emptyText="No focus sessions this week."
          style={{ height: '100%' }}
        />
      </div>

      {/* ── No-sessions notice for the current week ── */}
      {!isLoading && thisWeekMinutes === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <p style={{ fontSize: 13, color: '#7A7890' }}>No sessions this week yet</p>
          <Link
            to={PATHS.timer}
            style={{ fontSize: 13, color: '#4B9EFF', marginTop: 6, display: 'block', textDecoration: 'none' }}
          >
            Start tracking →
          </Link>
        </div>
      )}

      {/* ── Bottom: Bar chart ── */}
      {isLoading ? <ChartCardSkeleton /> : (
        <div style={card}>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={chartData}
              barCategoryGap="28%"
              margin={{ top: 20, right: 8, bottom: 0, left: 8 }}
            >
              <CartesianGrid vertical={false} stroke="#2E2E38" strokeDasharray="0" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                height={36}
                tick={(props: any) => {
                  const { x, y, index } = props
                  const entry    = chartData[index]
                  const dayColor = entry.isToday ? '#4B9EFF' : '#7A7890'
                  return (
                    <text x={x} y={y + 4} textAnchor="middle" fontFamily="Inter, sans-serif">
                      <tspan x={x} dy="0"  fill={dayColor}  fontSize={12}>{entry.day}</tspan>
                      <tspan x={x} dy="16" fill="#7A7890"   fontSize={11}>{entry.date}</tspan>
                    </text>
                  )
                }}
              />
              <YAxis hide />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="focus_minutes" radius={[6, 6, 0, 0]} maxBarSize={48}>
                <LabelList
                  dataKey="focus_minutes"
                  position="top"
                  formatter={(val: unknown) => typeof val === 'number' && val > 0 ? formatMinutesToHours(val) : ''}
                  style={{ fill: '#7A7890', fontSize: 11 }}
                />
                {chartData.map((entry, i) => {
                  const hasData = entry.focus_minutes > 0 && !entry.isFuture
                  const fill    = hasData ? '#4B9EFF' : '#222228'
                  const style   = hasData && entry.isToday
                    ? { filter: 'drop-shadow(0 0 6px rgba(75,158,255,0.6))' }
                    : undefined
                  return <Cell key={i} fill={fill} style={style} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4B9EFF', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: '#7A7890' }}>Focus</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#222228', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: '#7A7890' }}>Untagged</span>
            </div>
          </div>
        </div>
      )}

      {showOverlay && (
        <>
          <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', pointerEvents: 'none', zIndex: 1, borderRadius: 14 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 2 }}>
            <Lock size={20} color="#7A7890" />
            <span style={{ fontSize: 14, color: '#E8E6F0', fontWeight: 500 }}>Unlock full history</span>
            <button
              onClick={() => setUpgradeOpen(true)}
              style={{ background: '#4B9EFF', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Upgrade to Pro
            </button>
          </div>
        </>
      )}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="analytics" />
    </div>
  )
}
