import { CalendarDays, Clock, Target } from 'lucide-react'
import { Cell, Pie, PieChart } from 'recharts'

import { formatMinutesToHours } from '@/lib/utils/analytics'

// Same intensity scale as the real analytics heatmap (MonthlyView).
function cellColor(minutes: number): string {
  if (minutes === 0) return '#1A1A1F'
  if (minutes < 30) return 'rgba(75,158,255,0.18)'
  if (minutes < 60) return 'rgba(75,158,255,0.35)'
  if (minutes < 120) return 'rgba(75,158,255,0.55)'
  if (minutes < 180) return 'rgba(75,158,255,0.75)'
  return '#4B9EFF'
}

// Illustrative month — 28 days of fake focus minutes.
const DAYS: number[] = [
  45, 0, 130, 90, 200, 20, 0, 60, 150, 40, 0, 110, 190, 75, 0, 35, 220, 130, 55, 0, 95, 160, 70, 0,
  140, 45, 185, 120,
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Illustrative per-project split — colors pulled from the real project color
// picker's PRESET_COLORS (ProjectModal.tsx), skipping the streak green
// (#C8FF64), which is reserved for StreakBadge.
const PROJECTS: { name: string; minutes: number; color: string }[] = [
  { name: 'Client Work', minutes: 140, color: '#4B9EFF' },
  { name: 'Side Project', minutes: 95, color: '#F5A623' },
  { name: 'Deep Work', minutes: 60, color: '#A78BFA' },
  { name: 'Learning', minutes: 35, color: '#3DD68C' },
]

function StatCard({
  Icon,
  label,
  value,
  countup,
  suffix,
}: {
  Icon: typeof Clock
  label: string
  value: string
  countup?: number
  suffix?: string
}) {
  return (
    <div
      className="flex flex-1 flex-col gap-2 p-[18px_20px] md:gap-1.5 md:p-[clamp(12px,1.7vh,18px)_clamp(14px,1.8vh,20px)]"
      style={{
        backgroundColor: '#141417',
        border: '1px solid #2E2E38',
        borderRadius: 14,
      }}
    >
      <span className="flex items-center gap-2" style={{ fontSize: 12, color: '#7A7890' }}>
        <Icon size={14} style={{ color: '#4B9EFF' }} strokeWidth={1.75} />
        {label}
      </span>
      <span
        className="font-data text-[26px] md:text-[clamp(22px,3vh,26px)]"
        style={{
          fontWeight: 600,
          color: '#E8E6F0',
          letterSpacing: '-0.02em',
        }}
        {...(countup !== undefined ? { 'data-countup': countup, 'data-suffix': suffix ?? '' } : {})}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Static illustrative analytics panel — two stat cards and a mini calendar
 * heatmap (app's real blue intensity scale), plus a compact per-project
 * donut using the same recharts PieChart/Pie/Cell approach as the real
 * ProjectBreakdownCard, just scaled down and without the hover tooltip.
 */
export function AnalyticsMockup() {
  return (
    <div
      data-analytics-preview
      className="mx-auto flex w-full max-w-[460px] flex-col gap-4 md:max-w-[min(460px,calc((100dvh-220px)*0.71))] md:gap-[clamp(8px,1.4vh,14px)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row md:gap-[clamp(8px,1.4vh,14px)]">
        <StatCard Icon={Clock} label="Today's focus" value="2h 30m" />
        <StatCard Icon={CalendarDays} label="Sessions" value="4" countup={4} />
      </div>

      <div className="rounded-[14px] border border-depth-border bg-depth-surface p-[18px] md:p-[clamp(12px,1.7vh,16px)]">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[12px] text-ink-secondary">
            <Target size={14} className="text-brand" /> Daily goal
          </span>
          <span className="font-data text-[12px] text-ink-primary">
            2h 30m / 3h <span className="text-brand">· 83%</span>
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-depth-raised md:mt-[clamp(8px,1.3vh,12px)]">
          <div className="h-full w-[83%] rounded-full bg-brand" />
        </div>
        <p className="font-data mt-2 text-right text-[10px] text-ink-muted md:mt-1.5">30m to go</p>
      </div>

      <div
        data-heatmap
        className="p-5 md:p-[clamp(12px,1.8vh,20px)]"
        style={{
          backgroundColor: '#141417',
          border: '1px solid #2E2E38',
          borderRadius: 14,
        }}
      >
        <div className="mb-[14px] flex items-center justify-between md:mb-[clamp(9px,1.5vh,14px)]">
          <span style={{ fontSize: 13, fontWeight: 500, color: '#E8E6F0' }}>July 2026</span>
          <span className="font-data" style={{ fontSize: 11, color: '#7A7890' }}>
            18h 40m
          </span>
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-2 md:gap-[clamp(5px,0.8vh,8px)]">
          {WEEKDAYS.map((d) => (
            <span key={d} style={{ fontSize: 10, color: '#7A7890', textAlign: 'center' }}>
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-[clamp(5px,0.8vh,8px)]">
          {DAYS.map((minutes, i) => (
            <span
              key={i}
              data-heat-cell
              className="flex items-center justify-center"
              style={{
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                backgroundColor: cellColor(minutes),
                fontSize: 11,
                color: minutes >= 60 ? '#E8E6F0' : '#7A7890',
              }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      <div
        className="p-[18px] md:p-[clamp(12px,1.7vh,18px)]"
        style={{
          backgroundColor: '#141417',
          border: '1px solid #2E2E38',
          borderRadius: 14,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#E8E6F0' }}>By project</span>

        <div className="mt-[14px] flex items-center gap-4 md:mt-[clamp(9px,1.5vh,14px)] md:gap-3">
          <div style={{ flexShrink: 0 }}>
            <PieChart width={92} height={92}>
              <Pie
                data={PROJECTS}
                cx={46}
                cy={46}
                innerRadius={26}
                outerRadius={41}
                dataKey="minutes"
                startAngle={90}
                endAngle={-270}
                stroke="#141417"
                strokeWidth={2}
              >
                {PROJECTS.map((project) => (
                  <Cell key={project.name} fill={project.color} />
                ))}
              </Pie>
            </PieChart>
          </div>

          <div className="flex flex-col" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            {PROJECTS.map((project) => (
              <div key={project.name} className="flex items-center gap-2">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: project.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: '#E8E6F0',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {project.name}
                </span>
                <span
                  className="font-data"
                  style={{ fontSize: 12, color: '#7A7890', flexShrink: 0 }}
                >
                  {formatMinutesToHours(project.minutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
