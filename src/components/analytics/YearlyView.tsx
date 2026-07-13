import { useState } from 'react'
import {
  Lock, Clock, Calendar, Flame, BarChart2,
  CheckCircle2, Timer, TrendingUp, CalendarDays,
} from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { ProjectBreakdownCard, type ProjectEntry } from '@/components/analytics/ProjectBreakdownCard'
import { useDailySummariesRange, useSessionsForYear } from '@/hooks/useAnalytics'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import {
  getWeeksInYear,
  formatPeriodKey,
  formatMinutesToHours,
  getPeriodLabel,
} from '@/lib/utils/analytics'

interface YearlyViewProps {
  date: Date
}

const CELL  = 13
const GAP   = 3
const STEP  = CELL + GAP   // 16
const DAY_W = 32
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_ROWS = ['Mon','','Wed','','Fri','','']

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         18,
  flex:            1,
}

// ─── card header — matches DailyView's/MonthlyView's CardHeader exactly ────

interface CardHeaderProps {
  icon:  React.ReactNode
  title: string
}
function CardHeader({ icon, title }: CardHeaderProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E6F0' }}>{title}</span>
      </div>
      <div style={{ height: 1, backgroundColor: '#2E2E38', margin: '8px 0' }} />
    </>
  )
}

function SkeletonCard() {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 26, height: 26, borderRadius: 6 }} />
        <div className="bg-depth-raised animate-pulse rounded" style={{ height: 13, width: 90 }} />
      </div>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 1, margin: '8px 0' }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 11, width: 70, marginBottom: 8 }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 32, width: 100 }} />
    </div>
  )
}

interface StatCardProps {
  icon:      React.ReactNode
  title:     string
  label:     string
  value:     React.ReactNode
  valueSize?: number
}

function StatCard({ icon, title, label, value, valueSize = 28 }: StatCardProps) {
  return (
    <div style={cardStyle}>
      <CardHeader icon={icon} title={title} />
      <div style={{ color: '#7A7890', fontSize: 12 }}>{label}</div>
      <div
        className="font-data"
        style={{ fontSize: valueSize, fontWeight: 600, color: '#E8E6F0', marginTop: 4, lineHeight: 1.1, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
    </div>
  )
}

function cellColor(minutes: number): string {
  if (minutes <= 0)  return '#222228'
  if (minutes < 60)  return 'rgba(75,158,255,0.20)'
  if (minutes < 120) return 'rgba(75,158,255,0.45)'
  if (minutes < 240) return 'rgba(75,158,255,0.70)'
  return '#4B9EFF'
}

const LEGEND_COLORS = [
  '#222228',
  'rgba(75,158,255,0.20)',
  'rgba(75,158,255,0.45)',
  'rgba(75,158,255,0.70)',
  '#4B9EFF',
]

function computeLongestStreak(summaries: Array<{ date: string; focus_minutes: number }>): number {
  const active = summaries.filter(s => s.focus_minutes > 0).map(s => s.date).sort()
  if (!active.length) return 0
  let longest = 1, current = 1
  for (let i = 1; i < active.length; i++) {
    const diff = Math.round(
      (new Date(active[i]).getTime() - new Date(active[i - 1]).getTime()) / 86_400_000
    )
    current = diff === 1 ? current + 1 : 1
    if (current > longest) longest = current
  }
  return longest
}

function getMostProductiveMonth(summaries: Array<{ date: string; focus_minutes: number }>): string {
  const totals = new Array(12).fill(0) as number[]
  for (const s of summaries) totals[new Date(s.date).getMonth()] += s.focus_minutes
  const max = Math.max(...totals)
  if (max === 0) return '—'
  const idx  = totals.indexOf(max)
  const name = new Date(2000, idx, 1).toLocaleDateString('en-US', { month: 'long' })
  return `${name} — ${formatMinutesToHours(max)}`
}

function getBestDay(summaries: Array<{ date: string; focus_minutes: number }>): string {
  let best: { date: string; focus_minutes: number } | null = null
  for (const s of summaries) {
    if (s.focus_minutes > 0 && (!best || s.focus_minutes > best.focus_minutes)) best = s
  }
  if (!best) return '—'
  const label = new Date(best.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${label} — ${formatMinutesToHours(best.focus_minutes)}`
}

export function YearlyView({ date }: YearlyViewProps) {
  const year  = date.getFullYear()
  const jan1  = formatPeriodKey(new Date(year, 0, 1), 'daily')
  const dec31 = formatPeriodKey(new Date(year, 11, 31), 'daily')

  const { data: summaries, isLoading: loadingSummaries } = useDailySummariesRange(jan1, dec31)
  const { data: yearSessions, isLoading: loadingSessions } = useSessionsForYear(year)
  const isLoading = loadingSummaries || loadingSessions
  const { windowDays, isPro } = useAnalyticsWindow()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffKey   = formatPeriodKey(cutoff, 'daily')
  const showOverlay = !isPro && jan1 < cutoffKey

  const todayKey = formatPeriodKey(new Date(), 'daily')

  const focusMap = new Map<string, number>(
    (summaries ?? []).map(s => [s.date, s.focus_minutes])
  )

  // Build weeks array
  const weeks = [...getWeeksInYear(year)]
  const lastMonday = weeks[weeks.length - 1]
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  if (lastSunday < new Date(year, 11, 31)) {
    const extra = new Date(lastMonday)
    extra.setDate(lastMonday.getDate() + 7)
    weeks.push(extra)
  }

  const allSummaries  = summaries ?? []
  const totalMinutes  = allSummaries.reduce((s, r) => s + r.focus_minutes, 0)
  const longestStreak = computeLongestStreak(allSummaries)
  const bestMonth     = getMostProductiveMonth(allSummaries)
  const bestDay       = getBestDay(allSummaries)

  const totalSessions = allSummaries.reduce((s, r) => s + r.session_count, 0)
  const focusDays      = allSummaries.filter(s => s.focus_minutes > 0).length
  const avgSessionMins = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0

  // Project breakdown — aggregated across the full year from raw sessions
  const projectMap = new Map<string, Omit<ProjectEntry, 'pct'>>()
  for (const s of yearSessions ?? []) {
    const pid   = s.project_id ?? '__none__'
    const name  = s.projects?.name  ?? 'No project'
    const color = s.projects?.color ?? '#7A7890'
    const cur   = projectMap.get(pid)
    if (cur) cur.minutes += s.duration_mins
    else projectMap.set(pid, { name, color, minutes: s.duration_mins })
  }
  const projectPieData: ProjectEntry[] = [...projectMap.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .map(p => ({ ...p, pct: totalMinutes > 0 ? Math.round((p.minutes / totalMinutes) * 100) : 0 }))

  // Monthly totals for sub-labels
  const monthlyTotals = new Array(12).fill(0) as number[]
  for (const [key, mins] of focusMap) {
    monthlyTotals[new Date(key).getMonth()] += mins
  }

  // Best single week — sum focus minutes across each real (calendar-accurate) week
  let bestWeekMinutes = 0
  let bestWeekMonday: Date | null = null
  for (const monday of weeks) {
    let sum = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + d)
      if (day.getFullYear() !== year) continue
      sum += focusMap.get(formatPeriodKey(day, 'daily')) ?? 0
    }
    if (sum > bestWeekMinutes) {
      bestWeekMinutes = sum
      bestWeekMonday  = monday
    }
  }
  const bestWeek = bestWeekMonday
    ? `${getPeriodLabel(bestWeekMonday, 'weekly')} — ${formatMinutesToHours(bestWeekMinutes)}`
    : '—'

  // Month label positions
  const monthLabels: Array<{ label: string; col: number; monthIdx: number }> = []
  let seenMonth = -1
  weeks.forEach((monday, col) => {
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + d)
      if (day.getFullYear() === year) {
        const m = day.getMonth()
        if (m !== seenMonth) {
          seenMonth = m
          monthLabels.push({ label: MONTHS[m], col, monthIdx: m })
        }
        break
      }
    }
  })

  const gridWidth = weeks.length * STEP - GAP

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              icon={<Clock size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Focus Time"
              valueSize={28}
              value={formatMinutesToHours(totalMinutes)}
              label="total focus this year"
            />
            <StatCard
              icon={<Calendar size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Best Month"
              valueSize={16}
              value={bestMonth}
              label="most productive month"
            />
            <StatCard
              icon={<Flame size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Longest Streak"
              valueSize={28}
              value={<>{longestStreak}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>days</span></>}
              label="longest streak this year"
            />
            <StatCard
              icon={<BarChart2 size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Focus Sessions"
              valueSize={28}
              value={totalSessions}
              label="total sessions this year"
            />
            <StatCard
              icon={<CheckCircle2 size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Focus Days"
              valueSize={28}
              value={focusDays}
              label="focus days this year"
            />
            <StatCard
              icon={<Timer size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Avg Session"
              valueSize={28}
              value={formatMinutesToHours(avgSessionMins)}
              label="avg session length"
            />
            <StatCard
              icon={<TrendingUp size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Best Day"
              valueSize={16}
              value={bestDay}
              label="best single day"
            />
            <StatCard
              icon={<CalendarDays size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Best Week"
              valueSize={16}
              value={bestWeek}
              label="best single week"
            />
          </>
        )}
      </div>

      {/* Focus Time by Project */}
      {!isLoading && (
        <ProjectBreakdownCard
          pieData={projectPieData}
          isLoading={false}
          title="Focus Time by Project"
          subtitle="See how you spent your focus time across different projects this year"
          emptyText="No focus sessions logged this year."
        />
      )}

      {/* Heatmap */}
      {!isLoading && (
        <div style={{ position: 'relative' }}>
          <div style={{
            backgroundColor: '#141417',
            border:          '1px solid #2E2E38',
            borderRadius:    14,
            padding:         18,
            overflowX:       'auto',
          }}>
          <div style={{ width: DAY_W + GAP + gridWidth, minWidth: DAY_W + GAP + gridWidth }}>

            {/* Month labels above */}
            <div style={{ paddingLeft: DAY_W + GAP, position: 'relative', height: 28, marginBottom: 4 }}>
              {monthLabels.map(({ label, col, monthIdx }) => {
                const hrs = monthlyTotals[monthIdx]
                return (
                  <span key={label} style={{ position: 'absolute', left: col * STEP }}>
                    <span className="text-ink-muted" style={{ display: 'block', fontSize: 11, lineHeight: 1 }}>{label}</span>
                    {hrs > 0 && (
                      <span className="font-data text-ink-muted" style={{ display: 'block', fontSize: 10, lineHeight: 1, marginTop: 2 }}>
                        {formatMinutesToHours(hrs)}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>

            {/* Day labels + grid */}
            <div style={{ display: 'flex', gap: GAP }}>

              {/* Day labels */}
              <div style={{
                width:            DAY_W,
                display:          'grid',
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gap:              GAP,
                flexShrink:       0,
              }}>
                {DAY_ROWS.map((label, i) => (
                  <div key={i} className="text-ink-muted"
                    style={{ fontSize: 11, lineHeight: `${CELL}px`, textAlign: 'right', paddingRight: 4 }}>
                    {label}
                  </div>
                ))}
              </div>

              {/* Heatmap cells */}
              <TooltipProvider delayDuration={80}>
                <div style={{
                  display:          'grid',
                  gridTemplateRows: `repeat(7, ${CELL}px)`,
                  gridAutoFlow:     'column',
                  gap:              GAP,
                }}>
                  {weeks.flatMap((monday, colIdx) =>
                    Array.from({ length: 7 }, (_, rowIdx) => {
                      const cellDate = new Date(monday)
                      cellDate.setDate(monday.getDate() + rowIdx)
                      const key      = formatPeriodKey(cellDate, 'daily')
                      const inYear   = cellDate.getFullYear() === year
                      const isFuture = key > todayKey
                      const isToday  = key === todayKey
                      const minutes  = inYear && !isFuture ? (focusMap.get(key) ?? 0) : 0
                      const label    = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      const tipText  = !inYear
                        ? ''
                        : minutes > 0
                        ? `${label} — ${formatMinutesToHours(minutes)}`
                        : `${label} — No sessions`

                      const cell = (
                        <div
                          key={`${colIdx}-${rowIdx}`}
                          style={{
                            width:           CELL,
                            height:          CELL,
                            borderRadius:    '50%',
                            backgroundColor: !inYear ? 'transparent' : cellColor(minutes),
                            opacity:         isFuture ? 0.3 : 1,
                            boxSizing:       'border-box',
                            outline:         isToday ? '2px solid rgba(75,158,255,0.5)' : 'none',
                            outlineOffset:   '1px',
                          }}
                        />
                      )

                      if (!inYear || !tipText) return cell

                      return (
                        <Tooltip key={`${colIdx}-${rowIdx}`}>
                          <TooltipTrigger asChild>{cell}</TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="font-data" style={{ fontSize: 12 }}>{tipText}</span>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })
                  )}
                </div>
              </TooltipProvider>
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 12, justifyContent: 'flex-end',
            }}>
              <span className="text-ink-muted" style={{ fontSize: 11 }}>Less</span>
              {LEGEND_COLORS.map((color, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
              ))}
              <span className="text-ink-muted" style={{ fontSize: 11 }}>More</span>
            </div>
          </div>
          </div>
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
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="analytics" />

      {/* Year summary */}
      {!isLoading && (
        <div className="text-ink-secondary" style={{ textAlign: 'center', fontSize: 13 }}>
          {totalMinutes > 0
            ? `${formatMinutesToHours(totalMinutes)} logged in ${year}`
            : `No sessions logged in ${year}`}
        </div>
      )}
    </div>
  )
}
