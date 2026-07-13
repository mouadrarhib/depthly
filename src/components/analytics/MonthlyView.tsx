import { useState } from 'react'
import { Lock, Clock, BarChart2 } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import type { SessionProjectSliceWithDate } from '@/lib/supabase/queries/analytics'
import { useDailySummariesRange, useSessionsForWeek } from '@/hooks/useAnalytics'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import {
  getDaysInMonth,
  formatPeriodKey,
  formatMinutesToHours,
} from '@/lib/utils/analytics'

interface MonthlyViewProps {
  date: Date
}

interface DayProjectSlice {
  name:    string
  color:   string
  minutes: number
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         18,
  flex:            1,
}

// ─── card header — matches DailyView's CardHeader exactly ───────────────────

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

function getCellColor(minutes: number): string {
  if (minutes === 0) return '#1A1A1F'
  if (minutes < 30)  return 'rgba(75,158,255,0.18)'
  if (minutes < 60)  return 'rgba(75,158,255,0.35)'
  if (minutes < 120) return 'rgba(75,158,255,0.55)'
  if (minutes < 180) return 'rgba(75,158,255,0.75)'
  return '#4B9EFF'
}

// Monday-based column index (0=Mon … 6=Sun)
function mondayCol(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

const CELL_MAX = 44

export function MonthlyView({ date }: MonthlyViewProps) {
  const year  = date.getFullYear()
  const month = date.getMonth() + 1

  const days     = getDaysInMonth(year, month)
  const firstKey = formatPeriodKey(days[0], 'daily')
  const lastKey  = formatPeriodKey(days[days.length - 1], 'daily')

  const prevDate   = new Date(year, month - 2, 1)
  const prevYear   = prevDate.getFullYear()
  const prevMonth  = prevDate.getMonth() + 1
  const prevDays   = getDaysInMonth(prevYear, prevMonth)
  const prevFirst  = formatPeriodKey(prevDays[0], 'daily')
  const prevLast   = formatPeriodKey(prevDays[prevDays.length - 1], 'daily')

  const { data: summaries,     isLoading: loadingThis } = useDailySummariesRange(firstKey, lastKey)
  const { data: prevSummaries, isLoading: loadingPrev } = useDailySummariesRange(prevFirst, prevLast)
  // Despite the hook's name, fetchSessionsForWeek takes an arbitrary local-date
  // range — reused here for the month so calendar cells can show a per-project
  // breakdown on hover, same as WeeklyView's bar-chart tooltip.
  const { data: monthSessions, isLoading: loadingSessions } = useSessionsForWeek(firstKey, lastKey)

  const isLoading = loadingThis || loadingPrev || loadingSessions
  const todayKey  = formatPeriodKey(new Date(), 'daily')
  const { windowDays, isPro } = useAnalyticsWindow()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffKey   = formatPeriodKey(cutoff, 'daily')
  const showOverlay = !isPro && firstKey < cutoffKey

  const summaryMap = new Map((summaries ?? []).map(s => [s.date, s]))
  const prevMap    = new Map((prevSummaries ?? []).map(s => [s.date, s]))

  const thisMonthMinutes = days.reduce((sum, d) =>
    sum + (summaryMap.get(formatPeriodKey(d, 'daily'))?.focus_minutes ?? 0), 0)
  const prevMonthMinutes = prevDays.reduce((sum, d) =>
    sum + (prevMap.get(formatPeriodKey(d, 'daily'))?.focus_minutes ?? 0), 0)
  const thisMonthSessions = days.reduce((sum, d) =>
    sum + (summaryMap.get(formatPeriodKey(d, 'daily'))?.session_count ?? 0), 0)
  const prevMonthSessions = prevDays.reduce((sum, d) =>
    sum + (prevMap.get(formatPeriodKey(d, 'daily'))?.session_count ?? 0), 0)

  const leadingBlanks = mondayCol(days[0].getDay())

  // Group this month's sessions by local day so each calendar cell's tooltip
  // can list which project(s) were worked on that day.
  const sessionsByDay = new Map<string, SessionProjectSliceWithDate[]>()
  for (const s of monthSessions ?? []) {
    const dayKey = formatPeriodKey(new Date(s.started_at), 'daily')
    const list   = sessionsByDay.get(dayKey)
    if (list) list.push(s)
    else sessionsByDay.set(dayKey, [s])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div style={cardStyle}>
              <CardHeader
                icon={<Clock size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
                title="Focus Time"
              />
              <div style={{ color: '#7A7890', fontSize: 12 }}>Total Minutes this month</div>
              <div
                className="font-data"
                style={{ fontSize: 28, fontWeight: 600, color: '#E8E6F0', marginTop: 4, lineHeight: 1.1 }}
              >
                {formatMinutesToHours(thisMonthMinutes)}
              </div>

              {prevMonthMinutes > 0 && (() => {
                const trendColor = thisMonthMinutes > prevMonthMinutes ? '#3DD68C'
                                  : thisMonthMinutes < prevMonthMinutes ? '#7A7890'
                                  : '#7A7890'
                const trendArrow = thisMonthMinutes > prevMonthMinutes ? '↑' : thisMonthMinutes < prevMonthMinutes ? '↓' : '—'
                return (
                  <span style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    gap:             4,
                    marginTop:       8,
                    padding:         '2px 8px',
                    borderRadius:    20,
                    fontSize:        11,
                    fontWeight:      600,
                    backgroundColor: `${trendColor}26`,
                    color:           trendColor,
                  }}>
                    {trendArrow} {formatMinutesToHours(Math.abs(thisMonthMinutes - prevMonthMinutes))} vs last month
                  </span>
                )
              })()}
            </div>

            <div style={cardStyle}>
              <CardHeader
                icon={<BarChart2 size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
                title="Focus Sessions"
              />
              <div style={{ color: '#7A7890', fontSize: 12 }}>Total Sessions this month</div>
              <div
                className="font-data"
                style={{ fontSize: 28, fontWeight: 600, color: '#E8E6F0', marginTop: 4, lineHeight: 1.1 }}
              >
                {thisMonthSessions}
              </div>

              {prevMonthSessions > 0 && (() => {
                const trendColor = thisMonthSessions > prevMonthSessions ? '#3DD68C'
                                  : thisMonthSessions < prevMonthSessions ? '#7A7890'
                                  : '#7A7890'
                const trendArrow = thisMonthSessions > prevMonthSessions ? '↑' : thisMonthSessions < prevMonthSessions ? '↓' : '—'
                return (
                  <span style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    gap:             4,
                    marginTop:       8,
                    padding:         '2px 8px',
                    borderRadius:    20,
                    fontSize:        11,
                    fontWeight:      600,
                    backgroundColor: `${trendColor}26`,
                    color:           trendColor,
                  }}>
                    {trendArrow} {Math.abs(thisMonthSessions - prevMonthSessions)} vs last month
                  </span>
                )
              })()}
            </div>
          </>
        )}
      </div>

      {/* Calendar heatmap */}
      {!isLoading && (
        <div style={{ position: 'relative' }}>
        <div style={{
          backgroundColor: '#141417',
          border:          '1px solid #2E2E38',
          borderRadius:    14,
          padding:         18,
        }}>
          <div style={{ width: '100%' }}>
            {/* Day-of-week header */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap:                 7,
              marginBottom:        6,
            }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => (
                <div key={label} style={{ textAlign: 'center', fontSize: 11, color: '#7A7890', paddingBottom: 4 }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <TooltipProvider delayDuration={100}>
              <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap:                 7,
              }}>
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div
                    key={`blank-${i}`}
                    style={{ width: '100%', maxWidth: CELL_MAX, aspectRatio: '1 / 1', margin: '0 auto' }}
                  />
                ))}

                {days.map(d => {
                  const key        = formatPeriodKey(d, 'daily')
                  const isFuture   = key > todayKey
                  const isToday    = key === todayKey
                  const minutes    = isFuture ? 0 : (summaryMap.get(key)?.focus_minutes ?? 0)
                  const dayNum     = d.getDate()
                  const monthLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const numColor   = minutes >= 60 ? '#E8E6F0' : '#7A7890'

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

                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <div style={{
                          width:           '100%',
                          maxWidth:        CELL_MAX,
                          aspectRatio:     '1 / 1',
                          margin:          '0 auto',
                          borderRadius:    '50%',
                          backgroundColor: getCellColor(minutes),
                          opacity:         isFuture ? 0.55 : 1,
                          display:         'flex',
                          alignItems:      'center',
                          justifyContent:  'center',
                          cursor:          'pointer',
                          boxSizing:       'border-box',
                          boxShadow:       isToday
                            ? '0 0 0 2px #4B9EFF, 0 0 0 4px #141417'
                            : 'none',
                        }}>
                          <span style={{ fontSize: 11, color: isFuture ? '#5A5868' : numColor, lineHeight: 1 }}>
                            {dayNum}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div style={{ minWidth: 140 }}>
                          <div className="font-data" style={{ fontSize: 12, color: '#E8E6F0' }}>
                            {monthLabel}{minutes > 0 && ` — ${formatMinutesToHours(minutes)}`}
                          </div>
                          {minutes === 0 && (
                            <div style={{ fontSize: 12, color: '#7A7890', marginTop: 2 }}>No sessions</div>
                          )}
                          {dayProjects.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6, paddingTop: 6, borderTop: '1px solid #2E2E38' }}>
                              {dayProjects.map(p => (
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
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>

            {/* Intensity legend */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            8,
              marginTop:      14,
            }}>
              <span style={{ fontSize: 11, color: '#7A7890' }}>Less</span>
              {['#1A1A1F', 'rgba(75,158,255,0.18)', 'rgba(75,158,255,0.35)', 'rgba(75,158,255,0.55)', '#4B9EFF'].map((color, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }} />
              ))}
              <span style={{ fontSize: 11, color: '#7A7890' }}>More</span>
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

    </div>
  )
}
