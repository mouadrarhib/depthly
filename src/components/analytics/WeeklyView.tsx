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
  PieChart,
  Pie,
} from 'recharts'

import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useDailySummariesRange } from '@/hooks/useAnalytics'
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

interface DayEntry {
  day:           string
  date:          string
  dateObj:       Date
  focus_minutes: number
  session_count: number
  isToday:       boolean
  isFuture:      boolean
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── card style ───────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         24,
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 16, width: '60%', margin: '0 auto 16px' }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 1, marginBottom: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="bg-depth-raised animate-pulse rounded" style={{ height: 12, width: 70 }} />
            <div className="bg-depth-raised animate-pulse rounded" style={{ height: 40, width: 100 }} />
            <div className="bg-depth-raised animate-pulse rounded" style={{ height: 12, width: 120 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectCardSkeleton() {
  return (
    <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingTop: 8 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 160, height: 160, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} className="bg-depth-raised animate-pulse rounded" style={{ height: 14, width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChartCardSkeleton() {
  return (
    <div style={card}>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 220 }} />
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
  const { data: goals } = useGoals()

  const isLoading = loadingThis || loadingPrev
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

  // Comparison color for "Previous week" line
  const compColor =
    thisWeekMinutes > prevWeekMinutes ? '#4B9EFF' :
    thisWeekMinutes < prevWeekMinutes ? '#F25C5C' :
    '#7A7890'

  // Build 7-entry chart data
  const chartData: DayEntry[] = days.map((d, i) => {
    const key      = formatPeriodKey(d, 'daily')
    const isFuture = key > todayKey
    return {
      day:           DAY_LABELS[i],
      date:          d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dateObj:       d,
      focus_minutes: isFuture ? 0 : (summaryMap.get(key)?.focus_minutes ?? 0),
      session_count: isFuture ? 0 : (summaryMap.get(key)?.session_count ?? 0),
      isToday:       key === todayKey,
      isFuture,
    }
  })

  // Donut data: single-slice when data exists, gray ring when no data
  const donutData = thisWeekMinutes > 0
    ? [{ name: 'Focus', minutes: thisWeekMinutes, color: '#4B9EFF' }]
    : [{ name: 'Empty', minutes: 1,               color: '#222228' }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative' }}>

      {/* ── Top two-column grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">

        {/* Left: Weekly Summary */}
        {isLoading ? <SummaryCardSkeleton /> : (
          <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E6F0', textAlign: 'center' }}>
              Weekly Summary
            </div>
            <div style={{ height: 1, backgroundColor: '#2E2E38', margin: '16px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Focus Time stat */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#7A7890' }}>Focus Time</div>
                <div
                  className="font-data"
                  style={{ fontSize: 36, fontWeight: 600, color: '#E8E6F0', lineHeight: 1.1, marginTop: 4 }}
                >
                  {formatMinutesToHours(thisWeekMinutes)}
                </div>
                <div style={{ fontSize: 12, color: compColor, marginTop: 6 }}>
                  Previous week: {formatMinutesToHours(prevWeekMinutes)}
                </div>
              </div>

              {/* Sessions stat */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#7A7890' }}>Sessions</div>
                <div
                  className="font-data"
                  style={{ fontSize: 36, fontWeight: 700, color: '#E8E6F0', lineHeight: 1.1, marginTop: 4 }}
                >
                  {thisWeekSessions}
                </div>
              </div>

              {/* Weekly Goal stat */}
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
                    <div style={{ fontSize: 12, color: fillColor, marginTop: 6 }}>
                      {goal.isComplete ? 'Goal reached! 🎉' : `${goal.percentage}% complete`}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Right: Focus by Project */}
        {isLoading ? <ProjectCardSkeleton /> : (
          <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
            {thisWeekMinutes > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                {/* Donut */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <PieChart width={160} height={160}>
                    <Pie
                      data={donutData}
                      cx={80}
                      cy={80}
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="minutes"
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  {/* Center label */}
                  <div style={{
                    position:      'absolute', inset: 0,
                    display:       'flex', flexDirection: 'column',
                    alignItems:    'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <span className="font-data" style={{ fontSize: 15, fontWeight: 600, color: '#E8E6F0', lineHeight: 1 }}>
                      {formatMinutesToHours(thisWeekMinutes)}
                    </span>
                    <span style={{ fontSize: 10, color: '#7A7890', marginTop: 3 }}>this week</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4B9EFF', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#E8E6F0', flex: 1 }}>Focus</span>
                    <span className="font-data" style={{ fontSize: 13, color: '#7A7890' }}>
                      {formatMinutesToHours(thisWeekMinutes)}
                    </span>
                    <span style={{ fontSize: 12, color: '#3D3B4E', minWidth: 32, textAlign: 'right' }}>100%</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#3D3B4E', marginTop: 12 }}>
                    Project breakdown available in the daily view
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                <PieChart width={120} height={120}>
                  <Pie
                    data={[{ name: 'Empty', minutes: 1 }]}
                    cx={60} cy={60}
                    innerRadius={38} outerRadius={55}
                    dataKey="minutes"
                    stroke="none"
                  >
                    <Cell fill="#222228" />
                  </Pie>
                </PieChart>
                <p style={{ fontSize: 12, color: '#7A7890', marginTop: 12, textAlign: 'center' }}>
                  No data — start the timer to begin tracking your projects
                </p>
                <Link
                  to={PATHS.timer}
                  style={{ fontSize: 13, color: '#4B9EFF', marginTop: 8, textDecoration: 'none' }}
                >
                  Go to Timer →
                </Link>
              </div>
            )}
          </div>
        )}
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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              barCategoryGap="28%"
              margin={{ top: 28, right: 8, bottom: 0, left: 8 }}
            >
              <CartesianGrid vertical={false} stroke="#2E2E38" strokeDasharray="0" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                height={44}
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
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
