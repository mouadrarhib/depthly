import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'

import { formatMinutesToHours } from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'

export interface ProjectEntry {
  name:    string
  color:   string
  minutes: number
  pct:     number
}

// Callers sort pieData desc by minutes, so slicing to this count keeps the
// top N by focus time. Truncation only kicks in once even a 2-column grid
// can't reasonably fit everything (15+ projects) — see MAX_LEGEND_ENTRIES + 4
// below.
const MAX_LEGEND_ENTRIES = 10

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

const card: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         20,
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag size={16} style={{ color: '#4B9EFF', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E6F0' }}>{title}</span>
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: '#7A7890', marginTop: 2 }}>{subtitle}</p>
      )}
      <div style={{ height: 1, backgroundColor: '#2E2E38', margin: '12px 0' }} />
    </>
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

interface ProjectBreakdownCardProps {
  pieData:    ProjectEntry[]
  isLoading:  boolean
  title?:     string
  subtitle?:  string
  emptyText?: string
  style?:     React.CSSProperties
}

export function ProjectBreakdownCard({
  pieData,
  isLoading,
  title    = 'Focus Time by Project',
  subtitle = 'See how you spent your focus time across different projects',
  emptyText = 'No focus sessions for this period.',
  style,
}: ProjectBreakdownCardProps) {
  if (isLoading) return <ProjectCardSkeleton />

  const hasSessions = pieData.length > 0

  return (
    <div style={{ ...card, ...style }}>
      <CardHeader title={title} subtitle={subtitle} />

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
              items, not two) instead of a cramped inline cluster.
              5+ projects switch to a 2-column grid so the card grows
              a bit taller instead of scrolling internally — a nested
              scrollbar inside the page's own scroll reads as broken. */}
          {(() => {
            const useTwoColumn  = pieData.length > 4
            const shouldTruncate = pieData.length > MAX_LEGEND_ENTRIES + 4
            const visibleData   = shouldTruncate ? pieData.slice(0, MAX_LEGEND_ENTRIES) : pieData
            const hiddenCount   = pieData.length - visibleData.length

            return (
              <div
                style={{
                  flex:     '0 1 auto',
                  minWidth: 200,
                  maxWidth: useTwoColumn ? 480 : 260,
                  width:    useTwoColumn ? '100%' : undefined,
                  ...(useTwoColumn
                    ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 24, rowGap: 10 }
                    : { display: 'flex', flexDirection: 'column', gap: 4 }),
                }}
              >
                {visibleData.map((entry) => (
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

                {hiddenCount > 0 && (
                  <div style={{ gridColumn: useTwoColumn ? '1 / -1' : undefined, textAlign: 'center', marginTop: 4 }}>
                    <Link
                      to={PATHS.projects}
                      style={{ fontSize: 12, color: '#4B9EFF', textDecoration: 'none' }}
                    >
                      +{hiddenCount} more →
                    </Link>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
          <Tag size={28} style={{ color: '#3D3B4E' }} />
          <p style={{ fontSize: 13, color: '#7A7890', marginTop: 10 }}>
            {emptyText}
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
  )
}
