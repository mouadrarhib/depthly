import { Link } from 'react-router-dom'
import { Clock, BarChart2, Tag, Calendar } from 'lucide-react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

import { useDailySummary, useSessionsForDay, useDailySummariesRange } from '@/hooks/useAnalytics'
import { useGoals } from '@/hooks/useGoals'
import { useGoalCelebration } from '@/hooks/useGoalCelebration'
import { formatPeriodKey, formatMinutesToHours, getGoalProgress, getDaysInWeek } from '@/lib/utils/analytics'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { ConfettiBurst } from '@/components/ui/ConfettiBurst'
import { GoalHistoryRow } from '@/components/goals/GoalHistoryRow'
import { PATHS } from '@/routes/paths'

interface DailyViewProps {
  date: Date
}

interface ProjectEntry {
  name:    string
  color:   string
  minutes: number
}

interface HourSlot {
  hour:        number
  minutes:     number
  color:       string
  projectName: string
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h === 0)  return '12a'
  if (h < 12)   return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

// ─── card base style ─────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         20,
}

// ─── card header ─────────────────────────────────────────────────────────────

interface CardHeaderProps {
  icon:       React.ReactNode
  title:      string
  subtitle?:  string
}
function CardHeader({ icon, title, subtitle }: CardHeaderProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E6F0' }}>{title}</span>
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: '#7A7890', marginTop: 2 }}>{subtitle}</p>
      )}
      <div style={{ height: 1, backgroundColor: '#2E2E38', margin: '12px 0' }} />
    </>
  )
}

// ─── skeleton cards ───────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 26, height: 26, borderRadius: 6 }} />
        <div className="bg-depth-raised animate-pulse rounded" style={{ height: 13, width: 90 }} />
      </div>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 1, margin: '12px 0' }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 11, width: 70, marginBottom: 8 }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 44, width: 110 }} />
    </div>
  )
}

function ProjectCardSkeleton() {
  return (
    <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 26, height: 26, borderRadius: 6 }} />
        <div className="bg-depth-raised animate-pulse rounded" style={{ height: 13, width: 140 }} />
      </div>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 1, margin: '12px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 8 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 160, height: 160, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[85, 65, 75, 50].map((w, i) => (
            <div key={i} className="bg-depth-raised animate-pulse rounded" style={{ height: 14, width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineCardSkeleton() {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 26, height: 26, borderRadius: 6 }} />
        <div className="bg-depth-raised animate-pulse rounded" style={{ height: 13, width: 110 }} />
      </div>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 1, margin: '12px 0' }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 120 }} />
    </div>
  )
}

// ─── custom tooltip for timeline ─────────────────────────────────────────────

interface TimelineTooltipProps {
  active?:  boolean
  payload?: Array<{ value: number; payload: HourSlot }>
}

function TimelineTooltip({ active, payload }: TimelineTooltipProps) {
  if (!active || !payload?.length || payload[0].value === 0) return null
  const slot = payload[0].payload
  return (
    <div style={{
      backgroundColor: '#141417',
      border:          '1px solid #2E2E38',
      borderRadius:    8,
      padding:         '8px 12px',
    }}>
      <div style={{ fontSize: 12, color: '#7A7890' }}>{formatHour(slot.hour)}</div>
      {slot.projectName && (
        <div style={{ fontSize: 13, color: '#E8E6F0', marginTop: 2 }}>{slot.projectName}</div>
      )}
      <div className="font-data" style={{ fontSize: 13, color: '#E8E6F0', marginTop: 2 }}>
        {formatMinutesToHours(slot.minutes)}
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function DailyView({ date }: DailyViewProps) {
  const dateKey = formatPeriodKey(date, 'daily')

  const { data: summary,  isLoading: loadingSummary  } = useDailySummary(dateKey)
  const { data: sessions, isLoading: loadingSessions } = useSessionsForDay(dateKey)
  const { data: goals } = useGoals()

  const weekDays    = getDaysInWeek(date)
  const mondayKey   = formatPeriodKey(weekDays[0], 'daily')
  const sundayKey   = formatPeriodKey(weekDays[6], 'daily')
  const { data: weekSummaries } = useDailySummariesRange(mondayKey, sundayKey)

  const isLoading = loadingSummary || loadingSessions

  const focusMinutes = summary?.focus_minutes ?? 0
  const sessionCount = summary?.session_count ?? 0

  const { shouldCelebrate } = useGoalCelebration(focusMinutes, goals?.daily_goal_minutes ?? null)

  // Build project totals and hour slots from sessions
  const projectMap = new Map<string, ProjectEntry>()
  const hourSlots: HourSlot[] = Array.from({ length: 24 }, (_, hour) => ({
    hour, minutes: 0, color: '#222228', projectName: '',
  }))

  for (const s of sessions ?? []) {
    // project totals
    const pid   = s.project_id ?? '__none__'
    const name  = s.projects?.name  ?? 'No project'
    const color = s.projects?.color ?? '#7A7890'
    const cur   = projectMap.get(pid)
    if (cur) cur.minutes += s.duration_mins
    else projectMap.set(pid, { name, color, minutes: s.duration_mins })

    // hour slots
    const h = new Date(s.started_at).getHours()
    hourSlots[h].minutes += s.duration_mins
    if (hourSlots[h].color === '#222228' && s.projects) {
      hourSlots[h].color       = s.projects.color
      hourSlots[h].projectName = s.projects.name
    }
  }

  const pieData     = [...projectMap.values()].sort((a, b) => b.minutes - a.minutes)
  const hasSessions = pieData.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Top two-column grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">

        {/* Left: two stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Card 1: Focus Time */}
              <div style={card}>
                <CardHeader
                  icon={<Clock size={16} style={{ color: '#4B9EFF', flexShrink: 0 }} />}
                  title="Focus Time"
                />
                <div style={{ color: '#7A7890', fontSize: 12 }}>Total Minutes</div>
                <div
                  className="font-data"
                  style={{ fontSize: 40, fontWeight: 600, color: '#E8E6F0', marginTop: 4, lineHeight: 1.1 }}
                >
                  {formatMinutesToHours(focusMinutes)}
                </div>
              </div>

              {/* Card 2: Sessions */}
              <div style={card}>
                <CardHeader
                  icon={<BarChart2 size={16} style={{ color: '#3DD68C', flexShrink: 0 }} />}
                  title="Focus Sessions"
                />
                <div style={{ color: '#7A7890', fontSize: 12 }}>Total Sessions</div>
                <div
                  className="font-data"
                  style={{ fontSize: 40, fontWeight: 600, color: '#E8E6F0', marginTop: 4, lineHeight: 1.1 }}
                >
                  {sessionCount}
                </div>
              </div>

              {/* Card 3: Daily Goal */}
              {(() => {
                const dailyGoal = goals?.daily_goal_minutes ?? null
                if (dailyGoal === null) {
                  return (
                    <div style={card}>
                      <CardHeader
                        icon={<BarChart2 size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
                        title="Daily Goal"
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 8 }}>
                        <span style={{ fontSize: 13, color: '#7A7890' }}>No goal set</span>
                        <Link
                          to={PATHS.settings}
                          style={{ fontSize: 13, color: '#4B9EFF', textDecoration: 'none' }}
                        >
                          Set goal →
                        </Link>
                      </div>
                    </div>
                  )
                }
                const goal = getGoalProgress(focusMinutes, dailyGoal)
                const ringColor = goal.isComplete ? '#3DD68C' : '#4B9EFF'
                return (
                  <div style={card}>
                    <CardHeader
                      icon={<BarChart2 size={16} style={{ color: ringColor, flexShrink: 0 }} />}
                      title="Daily Goal"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ position: 'relative' }}>
                        <ProgressRing
                          progress={goal.percentage / 100}
                          size={64}
                          strokeWidth={5}
                          color={ringColor}
                        >
                          <span
                            className="font-data"
                            style={{ fontSize: 16, fontWeight: 600, color: '#E8E6F0' }}
                          >
                            {goal.percentage}%
                          </span>
                        </ProgressRing>
                        <ConfettiBurst trigger={shouldCelebrate} />
                      </div>
                      {goal.isComplete ? (
                        <span style={{ fontSize: 11, color: '#3DD68C' }}>Goal reached! 🎉</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#3D3B4E' }}>{goal.remaining} min to go</span>
                      )}
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <div style={{
                        fontSize:      11,
                        color:         '#3D3B4E',
                        textAlign:     'center',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom:  8,
                      }}>
                        This week
                      </div>
                      <GoalHistoryRow weekDays={weekDays} summaries={weekSummaries ?? []} />
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </div>

        {/* Right: Focus by Project */}
        {isLoading ? <ProjectCardSkeleton /> : (
          <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
            <CardHeader
              icon={<Tag size={16} style={{ color: '#4B9EFF', flexShrink: 0 }} />}
              title="Focus Time by Project"
              subtitle="See how you spent your focus time across different projects"
            />

            {hasSessions ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                {/* Donut */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <PieChart width={180} height={180}>
                    <Pie
                      data={pieData}
                      cx={90}
                      cy={90}
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="minutes"
                      startAngle={90}
                      endAngle={-270}
                      stroke="#141417"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  {/* Center total */}
                  <div style={{
                    position:      'absolute', inset: 0,
                    display:       'flex', flexDirection: 'column',
                    alignItems:    'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <span className="font-data" style={{ fontSize: 16, fontWeight: 600, color: '#E8E6F0', lineHeight: 1 }}>
                      {formatMinutesToHours(focusMinutes)}
                    </span>
                    <span style={{ fontSize: 10, color: '#7A7890', marginTop: 3 }}>total</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pieData.map((entry) => {
                    const pct = focusMinutes > 0
                      ? Math.round((entry.minutes / focusMinutes) * 100)
                      : 0
                    return (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%',
                          backgroundColor: entry.color, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, color: '#E8E6F0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name}
                        </span>
                        <span className="font-data" style={{ fontSize: 13, color: '#7A7890', flexShrink: 0 }}>
                          {formatMinutesToHours(entry.minutes)}
                        </span>
                        <span style={{ fontSize: 12, color: '#3D3B4E', flexShrink: 0, minWidth: 30, textAlign: 'right' }}>
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                <Tag size={32} style={{ color: '#3D3B4E' }} />
                <p style={{ fontSize: 13, color: '#7A7890', marginTop: 12 }}>
                  No focus sessions for this day.
                </p>
                <Link
                  to={PATHS.timer}
                  style={{ fontSize: 13, color: '#4B9EFF', marginTop: 8, textDecoration: 'none' }}
                >
                  Start the timer →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── No-sessions notice for the selected day ── */}
      {!isLoading && focusMinutes === 0 && sessionCount === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 13, color: '#7A7890' }}>No sessions on this day</p>
          {dateKey === formatPeriodKey(new Date(), 'daily') && (
            <Link
              to={PATHS.timer}
              style={{ fontSize: 13, color: '#4B9EFF', marginTop: 6, display: 'block', textDecoration: 'none' }}
            >
              Start a session →
            </Link>
          )}
        </div>
      )}

      {/* ── Daily Timeline ── */}
      {isLoading ? <TimelineCardSkeleton /> : (
        <div style={card}>
          <CardHeader
            icon={<Calendar size={16} style={{ color: '#4B9EFF', flexShrink: 0 }} />}
            title="Daily Timeline"
          />

          {hasSessions ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={hourSlots} barCategoryGap="20%">
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHour}
                    interval={1}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#3D3B4E' }}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    content={<TimelineTooltip />}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {hourSlots.map((slot, i) => (
                      <Cell key={i} fill={slot.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Project legend */}
              {pieData.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 12 }}>
                  {pieData.map((entry) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: entry.color, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12, color: '#7A7890' }}>{entry.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: '#7A7890' }}>
              No sessions recorded for this day
            </div>
          )}
        </div>
      )}
    </div>
  )
}
