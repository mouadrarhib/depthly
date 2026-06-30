import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useDailySummariesRange } from '@/hooks/useAnalytics'
import {
  getDaysInMonth,
  formatPeriodKey,
  formatMinutesToHours,
} from '@/lib/utils/analytics'

interface MonthlyViewProps {
  date: Date
}

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

const CELL_MAX = 64

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

  const isLoading = loadingThis || loadingPrev
  const todayKey  = formatPeriodKey(new Date(), 'daily')

  const summaryMap = new Map((summaries ?? []).map(s => [s.date, s]))
  const prevMap    = new Map((prevSummaries ?? []).map(s => [s.date, s]))

  const thisMonthMinutes = days.reduce((sum, d) =>
    sum + (summaryMap.get(formatPeriodKey(d, 'daily'))?.focus_minutes ?? 0), 0)
  const prevMonthMinutes = prevDays.reduce((sum, d) =>
    sum + (prevMap.get(formatPeriodKey(d, 'daily'))?.focus_minutes ?? 0), 0)
  const thisMonthSessions = days.reduce((sum, d) =>
    sum + (summaryMap.get(formatPeriodKey(d, 'daily'))?.session_count ?? 0), 0)

  const leadingBlanks = mondayCol(days[0].getDay())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16 }}>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div style={cardStyle}>
              <div className="font-data text-ink-primary"
                style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {formatMinutesToHours(thisMonthMinutes)}
              </div>
              <div className="text-ink-muted" style={{ fontSize: 12, marginTop: 6 }}>
                total focus this month
              </div>
              {prevMonthMinutes > 0 && (
                <div style={{
                  marginTop:  6,
                  fontSize:   13,
                  color:      thisMonthMinutes > prevMonthMinutes ? '#3DD68C'
                            : thisMonthMinutes < prevMonthMinutes ? '#F25C5C'
                            : '#7A7890',
                }}>
                  {thisMonthMinutes > prevMonthMinutes ? '↑' : thisMonthMinutes < prevMonthMinutes ? '↓' : '—'}
                  {' '}{formatMinutesToHours(Math.abs(thisMonthMinutes - prevMonthMinutes))} vs last month
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div className="font-data text-ink-primary"
                style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {thisMonthSessions}
              </div>
              <div className="text-ink-muted" style={{ fontSize: 12, marginTop: 6 }}>
                sessions this month
              </div>
            </div>
          </>
        )}
      </div>

      {/* Calendar heatmap */}
      {!isLoading && (
        <div style={{
          backgroundColor: '#141417',
          border:          '1px solid #2E2E38',
          borderRadius:    14,
          padding:         24,
        }}>
          <div style={{ width: '100%' }}>
            {/* Day-of-week header */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap:                 12,
              marginBottom:        8,
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
                gap:                 12,
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
                  const tipText    = minutes > 0
                    ? `${monthLabel} — ${formatMinutesToHours(minutes)}`
                    : `${monthLabel} — No sessions`
                  const numColor   = minutes >= 60 ? '#E8E6F0' : '#7A7890'

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
                          opacity:         isFuture ? 0.35 : 1,
                          display:         'flex',
                          alignItems:      'center',
                          justifyContent:  'center',
                          cursor:          'default',
                          boxSizing:       'border-box',
                          boxShadow:       isToday
                            ? '0 0 0 2px #4B9EFF, 0 0 0 4px #141417'
                            : 'none',
                        }}>
                          <span style={{ fontSize: 14, color: isFuture ? '#3D3B4E' : numColor, lineHeight: 1 }}>
                            {dayNum}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span className="font-data" style={{ fontSize: 12 }}>{tipText}</span>
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
              marginTop:      24,
            }}>
              <span style={{ fontSize: 11, color: '#7A7890' }}>Less</span>
              {['#1A1A1F', 'rgba(75,158,255,0.18)', 'rgba(75,158,255,0.35)', 'rgba(75,158,255,0.55)', '#4B9EFF'].map((color, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: color }} />
              ))}
              <span style={{ fontSize: 11, color: '#7A7890' }}>More</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
