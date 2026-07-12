import { ProjectBreakdownCard, type ProjectEntry } from '@/components/analytics/ProjectBreakdownCard'
import { useProfile, useSessionsAllTime } from '@/hooks/useAnalytics'
import { formatMinutesToHours } from '@/lib/utils/analytics'

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         24,
}

function computeAvgPerDay(totalMinutes: number, memberSince: string): string {
  const joined = new Date(memberSince)
  const now    = new Date()
  const days   = Math.max(1, Math.floor((now.getTime() - joined.getTime()) / 86_400_000))
  return formatMinutesToHours(Math.round(totalMinutes / days))
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface StatCardProps {
  value:     React.ReactNode
  label:     string
  valueSize?: number
}

function StatCard({ value, label, valueSize = 32 }: StatCardProps) {
  return (
    <div style={cardStyle}>
      <div className="font-data text-ink-primary"
        style={{ fontSize: valueSize, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div className="text-ink-muted" style={{ fontSize: 12, marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={cardStyle}>
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 36, width: '50%', marginBottom: 8 }} />
      <div className="bg-depth-raised animate-pulse rounded" style={{ height: 14, width: '65%' }} />
    </div>
  )
}

export function OverviewView() {
  const { data: profile, isLoading: loadingProfile } = useProfile()
  const { data: sessions, isLoading: loadingSessions } = useSessionsAllTime()

  const isLoading = loadingProfile || loadingSessions

  // Lifetime project breakdown — aggregated across every focus session ever logged
  const projectMap = new Map<string, Omit<ProjectEntry, 'pct'>>()
  for (const s of sessions ?? []) {
    const pid   = s.project_id ?? '__none__'
    const name  = s.projects?.name  ?? 'No project'
    const color = s.projects?.color ?? '#7A7890'
    const cur   = projectMap.get(pid)
    if (cur) cur.minutes += s.duration_mins
    else projectMap.set(pid, { name, color, minutes: s.duration_mins })
  }
  const totalProjectMinutes = [...projectMap.values()].reduce((s, p) => s + p.minutes, 0)
  const projectPieData: ProjectEntry[] = [...projectMap.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .map(p => ({ ...p, pct: totalProjectMinutes > 0 ? Math.round((p.minutes / totalProjectMinutes) * 100) : 0 }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {isLoading || !profile ? (
          <>
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
              value={formatMinutesToHours(profile.total_focus_minutes)}
              label="total focus"
            />
            <StatCard
              value={profile.total_sessions}
              label="sessions"
            />
            <StatCard
              value={
                <span style={profile.current_streak > 0 ? { color: '#C8FF64' } : undefined}>
                  {profile.current_streak}
                  <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>days</span>
                </span>
              }
              label="current streak"
            />
            <StatCard
              value={<>{profile.longest_streak}<span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>days</span></>}
              label="longest streak"
            />
            <StatCard
              value={computeAvgPerDay(profile.total_focus_minutes, profile.member_since)}
              label="avg per day"
            />
            <StatCard
              valueSize={24}
              value={formatMemberSince(profile.member_since)}
              label="member since"
            />
          </>
        )}
      </div>

      {/* Focus Time by Project — lifetime */}
      <ProjectBreakdownCard
        pieData={projectPieData}
        isLoading={isLoading}
        title="Focus Time by Project"
        subtitle="See how you've spent your focus time across every project, all-time"
        emptyText="No focus sessions logged yet."
      />
    </div>
  )
}
