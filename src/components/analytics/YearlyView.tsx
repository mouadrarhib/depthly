import { useState } from 'react'
import { Lock } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useDailySummariesRange } from '@/hooks/useAnalytics'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import {
  getWeeksInYear,
  formatPeriodKey,
  formatMinutesToHours,
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
  padding:         24,
  flex:            1,
}

function SkeletonCard() {
  return (
    <div style={cardStyle}>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 40, width: '50%', marginBottom: 8 }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 14, width: '65%' }} />
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

export function YearlyView({ date }: YearlyViewProps) {
  const year  = date.getFullYear()
  const jan1  = formatPeriodKey(new Date(year, 0, 1), 'daily')
  const dec31 = formatPeriodKey(new Date(year, 11, 31), 'daily')

  const { data: summaries, isLoading } = useDailySummariesRange(jan1, dec31)
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

  // Monthly totals for sub-labels
  const monthlyTotals = new Array(12).fill(0) as number[]
  for (const [key, mins] of focusMap) {
    monthlyTotals[new Date(key).getMonth()] += mins
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16 }}>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div style={cardStyle}>
              <div className="font-data text-ink-primary"
                style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {formatMinutesToHours(totalMinutes)}
              </div>
              <div className="text-ink-muted" style={{ fontSize: 12, marginTop: 6 }}>
                total focus this year
              </div>
            </div>

            <div style={cardStyle}>
              <div className="font-data text-ink-primary"
                style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                {bestMonth}
              </div>
              <div className="text-ink-muted" style={{ fontSize: 12, marginTop: 6 }}>
                most productive month
              </div>
            </div>

            <div style={cardStyle}>
              <div className="font-data text-ink-primary"
                style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {longestStreak}
                <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>days</span>
              </div>
              <div className="text-ink-muted" style={{ fontSize: 12, marginTop: 6 }}>
                longest streak this year
              </div>
            </div>
          </>
        )}
      </div>

      {/* Heatmap */}
      {!isLoading && (
        <div style={{ position: 'relative' }}>
          <div style={{
            backgroundColor: '#141417',
            border:          '1px solid #2E2E38',
            borderRadius:    14,
            padding:         20,
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
