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
  pct:     number
}

interface HourSlot {
  hour:        number
  minutes:     number
  color:       string
  projectName: string
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
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
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 26, height: 26, borderRadius: 6 }} />
        <div className="bg-depth-raised animate-pulse rounded" style={{ height: 13, width: 140 }} />
      </div>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 11, width: 220, marginTop: 6 }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 1, margin: '12px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="bg-depth-raised animate-pulse" style={{ width: 96, height: 96, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[85, 65, 75].map((w, i) => (
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
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 140 }} />
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

// ─── custom tooltip for project donut ────────────────────────────────────────

interface ProjectTooltipProps {
  active?:  boolean
  payload?: Array<{ payload: ProjectEntry }>
}

function ProjectTooltip({ active, payload }: ProjectTooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  return (
    <div style={{
      backgroundColor: '#141417',
      border:          '1px solid #2E2E38',
      borderRadius:    8,
      padding:         '8px 12px',
    }}>
      <span style={{ fontSize: 13, color: '#E8E6F0' }}>
        {entry.name}: {formatMinutesToHours(entry.minutes)} ({entry.pct}%)
      </span>
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
  const projectMap = new Map<string, Omit<ProjectEntry, 'pct'>>()
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

  const pieData: ProjectEntry[] = [...projectMap.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .map((p) => ({ ...p, pct: focusMinutes > 0 ? Math.round((p.minutes / focusMinutes) * 100) : 0 }))
  const hasSessions = pieData.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/*
        Two independent flex columns, not a row-synchronized grid. Every
        card hugs its own content EXCEPT Daily Goal (left) and Focus Time
        by Project (right), which carry flex: 1 so they absorb whatever
        leftover height the shorter column has versus the taller one —
        that's what stretches the parent row to sm:items-stretch for.
        Daily Timeline stays fixed/content-sized on purpose: Focus Time
        by Project is meant to end up the bigger of the two right-column
        cards, not Daily Timeline. Don't add grow/stretch to Focus Time,
        Focus Sessions, or Daily Timeline.
      */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">

        {/* Left column: Focus Time, Focus Sessions, Daily Goal */}
        <div className="flex flex-col gap-4 sm:flex-1">

        {isLoading ? <StatCardSkeleton /> : (
          <div style={card}>
            <CardHeader
              icon={<Clock size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
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
        )}

        {isLoading ? <StatCardSkeleton /> : (
          <div style={card}>
            <CardHeader
              icon={<BarChart2 size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
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
        )}

        {isLoading ? <StatCardSkeleton /> : (
          (() => {
            const dailyGoal = goals?.daily_goal_minutes ?? null
            if (dailyGoal === null) {
              return (
                <div style={{ ...card, flex: '1 1 auto' }}>
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
              <div style={{ ...card, flex: '1 1 auto' }}>
                <CardHeader
                  icon={<BarChart2 size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
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
          })()
        )}

        </div>

        {/* Right column: Focus Time by Project, Daily Timeline — sized to
            60% width vs the left column's 40%, matching the previous
            1fr/2fr proportions, but with no height coupling to the left
            column whatsoever. */}
        <div className="flex flex-col gap-4 sm:flex-[2]">

        {isLoading ? <ProjectCardSkeleton /> : (
          <div style={{ ...card, flex: '1 1 auto' }}>
            <CardHeader
              icon={<Tag size={16} style={{ color: '#4B9EFF', flexShrink: 0 }} />}
              title="Focus Time by Project"
              subtitle="See how you spent your focus time across different projects"
            />

            {hasSessions ? (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
                {/* Donut — 176px, a Kairu-style ring: no center label, big
                    enough to be the visual anchor of the card. Hover
                    tooltip replaces the old static center text. */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <PieChart width={176} height={176}>
                    <Pie
                      data={pieData}
                      cx={88}
                      cy={88}
                      innerRadius={55}
                      outerRadius={85}
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
                    <RechartsTooltip content={<ProjectTooltip />} cursor={false} />
                  </PieChart>
                </div>

                {/* Legend — loose, table-like row: bold name on the left,
                    then time and percent as their own evenly-spaced
                    columns (justify-content: space-between across three
                    items, not two) instead of a cramped inline cluster. */}
                <div
                  style={{
                    flex:       '0 1 auto',
                    minWidth:   200,
                    maxWidth:   260,
                    display:    'flex',
                    flexDirection: 'column',
                    gap:        4,
                    ...(pieData.length > 5
                      ? { maxHeight: 200, overflowY: 'auto' }
                      : {}),
                  }}
                >
                  {pieData.map((entry) => (
                    <div
                      key={entry.name}
                      className="hover:bg-white/[0.03] rounded-md transition-colors"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '6px 8px' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%',
                          backgroundColor: entry.color, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E6F0', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name}
                        </span>
                      </span>
                      <span className="font-data" style={{ fontSize: 13, color: '#7A7890', flexShrink: 0 }}>
                        {formatMinutesToHours(entry.minutes)}
                      </span>
                      <span style={{ fontSize: 12, color: '#3D3B4E', flexShrink: 0, minWidth: 30, textAlign: 'right' }}>
                        {entry.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
                <Tag size={28} style={{ color: '#3D3B4E' }} />
                <p style={{ fontSize: 13, color: '#7A7890', marginTop: 10 }}>
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

        {isLoading ? <TimelineCardSkeleton /> : (
          <div style={card}>
            <CardHeader
              icon={<Calendar size={16} style={{ color: '#4B9EFF', flexShrink: 0 }} />}
              title="Daily Timeline"
            />

            {hasSessions ? (
              <>
                <div style={{ position: 'relative' }}>
                  {/* Faint hour gridlines so the timeline reads as a full
                      24-hour scale even when only one hour has data. */}
                  <div
                    aria-hidden
                    style={{
                      position:       'absolute',
                      inset:          0,
                      pointerEvents:  'none',
                      backgroundImage:
                        'repeating-linear-gradient(to right, rgba(122,120,144,0.14) 0, rgba(122,120,144,0.14) 1px, transparent 1px, transparent calc(100% / 24))',
                    }}
                  />
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={hourSlots} barCategoryGap="20%">
                      <XAxis
                        dataKey="hour"
                        tickFormatter={formatHour}
                        interval={2}
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
                </div>

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
    </div>
  )
}
