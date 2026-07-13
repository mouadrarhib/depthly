import { useState } from 'react'
import {
  Lock, Clock, Calendar, Flame, BarChart2,
  CheckCircle2, Timer, TrendingUp, CalendarDays,
} from 'lucide-react'

import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { ProjectBreakdownCard, type ProjectEntry } from '@/components/analytics/ProjectBreakdownCard'
import type { SessionProjectSliceWithDate } from '@/lib/supabase/queries/analytics'
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

interface DayProjectSlice {
  name:    string
  color:   string
  minutes: number
}

interface HoveredDay {
  label:    string
  minutes:  number
  projects: DayProjectSlice[]
}

const CELL  = 15
const GAP   = 4
const STEP  = CELL + GAP   // 19
const MONTH_GAP = 8   // extra spacing inserted between month groups, on top of GAP
const DAY_W = 32
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_ROWS = ['Mon','','Wed','','Fri','','']

// Monday-based column index (0=Mon … 6=Sun) — used to lay out each month's
// days into its own self-contained set of week-columns (see monthColumns
// below), so a week-column never mixes days from two different months.
function mondayCol(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

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

const FUTURE_COLOR = '#1A1A1F'

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
  // Fixed details panel instead of a per-cell floating tooltip — a
  // Radix tooltip has to re-anchor its (much wider) popup every time the
  // mouse crosses into a new ~19-27px-wide column, which reads as janky
  // during fast horizontal sweeps. A stable panel just swaps its text.
  const [hoveredDay, setHoveredDay] = useState<HoveredDay | null>(null)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffKey   = formatPeriodKey(cutoff, 'daily')
  const showOverlay = !isPro && jan1 < cutoffKey

  const todayKey = formatPeriodKey(new Date(), 'daily')

  const focusMap = new Map<string, number>(
    (summaries ?? []).map(s => [s.date, s.focus_minutes])
  )

  // Group this year's sessions by local day so each heatmap cell's tooltip
  // can list which project(s) were worked on that day — same as
  // WeeklyView/MonthlyView.
  const sessionsByDay = new Map<string, SessionProjectSliceWithDate[]>()
  for (const s of yearSessions ?? []) {
    const dayKey = formatPeriodKey(new Date(s.started_at), 'daily')
    const list   = sessionsByDay.get(dayKey)
    if (list) list.push(s)
    else sessionsByDay.set(dayKey, [s])
  }

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

  // Month-anchored week-columns for the heatmap — each month gets its own
  // self-contained set of Monday-Sunday columns (leading/trailing slots
  // null-padded), so a week-column never mixes days from two different
  // months the way a single continuous year-long week strip would.
  const monthColumns: Array<{ monthIdx: number; days: Array<Date | null> }> = []
  for (let m = 0; m < 12; m++) {
    const daysInMonth   = new Date(year, m + 1, 0).getDate()
    const leadingBlanks = mondayCol(new Date(year, m, 1).getDay())
    const numCols       = Math.ceil((leadingBlanks + daysInMonth) / 7)
    const cols: Array<{ monthIdx: number; days: Array<Date | null> }> = Array.from(
      { length: numCols },
      () => ({ monthIdx: m, days: new Array<Date | null>(7).fill(null) })
    )
    for (let d = 1; d <= daysInMonth; d++) {
      const cellIdx = leadingBlanks + d - 1
      cols[Math.floor(cellIdx / 7)].days[cellIdx % 7] = new Date(year, m, d)
    }
    monthColumns.push(...cols)
  }

  // Month label positions — first week-column belonging to each month, plus
  // how many columns it spans, so the label can be centered over the whole
  // group of columns rather than just anchored to the first one.
  const monthLabels: Array<{ label: string; col: number; monthIdx: number; numCols: number }> = []
  monthColumns.forEach(({ monthIdx }, col) => {
    const last = monthLabels[monthLabels.length - 1]
    if (!last || last.monthIdx !== monthIdx) {
      monthLabels.push({ label: MONTHS[monthIdx], col, monthIdx, numCols: 1 })
    } else {
      last.numCols += 1
    }
  })

  // Per-week x offset, adding MONTH_GAP on top of the regular column gap
  // whenever a week-column belongs to a new month — the same offsets drive
  // both the month labels and the heatmap cells below, so the two stay
  // aligned.
  const weekOffsets: number[] = []
  let extraGap = 0
  monthColumns.forEach(({ monthIdx }, col) => {
    if (col > 0 && monthColumns[col - 1].monthIdx !== monthIdx) extraGap += MONTH_GAP
    weekOffsets.push(col * STEP + extraGap)
  })

  // +STEP (not +CELL) since each cell's hoverable hit area is a full
  // STEP×STEP tile (see the heatmap cell render below), wider than the
  // visible CELL-sized dot it contains.
  const gridWidth = weekOffsets[weekOffsets.length - 1] + STEP

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
          }}>
          {/* Hovered-day details — a fixed-height, normal-width panel (not
              a per-cell floating tooltip), so it never has to reposition
              itself as the mouse moves between columns. Height is locked
              (not just a minimum) and the project row never wraps, so
              hovering a day with more projects can't grow the panel and
              push the grid/legend below it down — it scrolls internally
              instead. Always visible, outside the horizontally-scrolling
              region below. */}
          <div style={{ height: 50, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #2E2E38', overflow: 'hidden' }}>
            {hoveredDay ? (
              <>
                <div className="font-data" style={{ fontSize: 13, color: '#E8E6F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hoveredDay.label}{hoveredDay.minutes > 0 && ` — ${formatMinutesToHours(hoveredDay.minutes)}`}
                </div>
                {hoveredDay.minutes === 0 ? (
                  <div style={{ fontSize: 12, color: '#7A7890', marginTop: 2 }}>No sessions</div>
                ) : hoveredDay.projects.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 16, marginTop: 6, overflowX: 'auto' }}>
                    {hoveredDay.projects.map(p => (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#7A7890', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span className="font-data" style={{ fontSize: 12, color: '#E8E6F0', whiteSpace: 'nowrap' }}>
                          {formatMinutesToHours(p.minutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#7A7890', lineHeight: '26px' }}>Hover a day to see details</div>
            )}
          </div>

          {/* Only the month labels + grid scroll horizontally — the legend
              below is a normal-width sibling so it stays centered and
              visible without needing to scroll to see it. */}
          <div style={{ overflowX: 'auto' }}>
          <div style={{ width: DAY_W + GAP + gridWidth, minWidth: DAY_W + GAP + gridWidth }}>

            {/* Month labels above — absolutely positioned children ignore
                the container's own padding (the CSS containing-block edge
                for position:absolute is the padding *edge*, not inside the
                padding), so DAY_W + GAP is baked directly into each label's
                left offset instead of relying on paddingLeft here. */}
            <div style={{ position: 'relative', height: 28, marginBottom: 10 }}>
              {monthLabels.map(({ label, col, monthIdx, numCols }) => {
                const hrs      = monthlyTotals[monthIdx]
                const spanWidth = numCols * STEP - GAP
                return (
                  <span
                    key={label}
                    style={{
                      position:  'absolute',
                      left:      DAY_W + GAP + weekOffsets[col],
                      width:     spanWidth,
                      textAlign: 'center',
                    }}
                  >
                    <span className="text-ink-primary" style={{ display: 'block', fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{label}</span>
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

              {/* Heatmap cells — absolutely positioned via weekOffsets so
                  month-boundary weeks can carry an extra MONTH_GAP without
                  breaking uniform column spacing. Hover state feeds the
                  fixed details panel above (see hoveredDay) instead of a
                  per-cell floating tooltip. */}
              <div
                style={{ position: 'relative', width: gridWidth, height: 7 * STEP }}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {monthColumns.flatMap(({ days }, colIdx) =>
                  days.map((cellDate, rowIdx) => {
                    if (!cellDate) {
                      return (
                        <div
                          key={`${colIdx}-${rowIdx}`}
                          style={{
                            position:        'absolute',
                            left:            weekOffsets[colIdx],
                            top:             rowIdx * STEP,
                            width:           CELL,
                            height:          CELL,
                            borderRadius:    '50%',
                            backgroundColor: 'transparent',
                          }}
                        />
                      )
                    }

                    const key      = formatPeriodKey(cellDate, 'daily')
                    const isFuture = key > todayKey
                    const isToday  = key === todayKey
                    const minutes  = !isFuture ? (focusMap.get(key) ?? 0) : 0
                    const label    = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                    const dayProjectMap = new Map<string, DayProjectSlice>()
                    if (!isFuture) {
                      for (const s of sessionsByDay.get(key) ?? []) {
                        const pid   = s.project_id ?? '__none__'
                        const name  = s.projects?.name  ?? 'No project'
                        const color = s.projects?.color ?? '#7A7890'
                        const cur   = dayProjectMap.get(pid)
                        if (cur) cur.minutes += s.duration_mins
                        else dayProjectMap.set(pid, { name, color, minutes: s.duration_mins })
                      }
                    }
                    const dayProjects = [...dayProjectMap.values()].sort((a, b) => b.minutes - a.minutes)

                    // Hit-tile width normally equals STEP, but at the last
                    // column of a month it's widened to reach the next
                    // column's start — absorbing the MONTH_GAP dead zone
                    // into this tile so hovering across a month boundary
                    // (e.g. Dec 31 → Jan 1) stays smooth horizontally too,
                    // not just within a single month. paddingLeft keeps
                    // the visible dot at its normal centered-in-STEP
                    // position regardless of the extra width.
                    const nextOffset = weekOffsets[colIdx + 1] ?? weekOffsets[colIdx] + STEP
                    const tileWidth  = nextOffset - weekOffsets[colIdx]

                    return (
                      <div
                        key={`${colIdx}-${rowIdx}`}
                        onMouseEnter={() => setHoveredDay({ label, minutes, projects: dayProjects })}
                        style={{
                          position:       'absolute',
                          left:           weekOffsets[colIdx],
                          top:            rowIdx * STEP,
                          width:          tileWidth,
                          height:         STEP,
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'flex-start',
                          paddingLeft:    (STEP - CELL) / 2,
                        }}
                      >
                        <div
                          style={{
                            width:           CELL,
                            height:          CELL,
                            flexShrink:      0,
                            borderRadius:    '50%',
                            backgroundColor: isFuture ? FUTURE_COLOR : cellColor(minutes),
                            opacity:         1,
                            boxSizing:       'border-box',
                            outline:         isToday ? '2px solid rgba(75,158,255,0.5)' : 'none',
                            outlineOffset:   '1px',
                            cursor:          'pointer',
                          }}
                        />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
          </div>
          {/* Legend — outside the horizontally-scrolling region above, so
              it's always visible and centered without needing to scroll. */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 12,
          }}>
            <span className="text-ink-muted" style={{ fontSize: 11 }}>Less</span>
            {LEGEND_COLORS.map((color, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
            ))}
            <span className="text-ink-muted" style={{ fontSize: 11 }}>More</span>
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
