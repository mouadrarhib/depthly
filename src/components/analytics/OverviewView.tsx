import { Clock, BarChart2, Flame, Award, Timer, Calendar } from 'lucide-react'

import {
  ProjectBreakdownCard,
  type ProjectEntry,
} from '@/components/analytics/ProjectBreakdownCard'
import { useProfile, useSessionsAllTime } from '@/hooks/useAnalytics'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import {
  getCurrentFocusStreak,
  getLongestFocusStreak,
  sessionsToDailyTotals,
} from '@/lib/utils/analyticsSessions'
import type { AnalyticsProjectScope } from '@/types/app'

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141417',
  border: '1px solid #2E2E38',
  borderRadius: 14,
  padding: 16,
}

function computeAvgPerDay(totalMinutes: number, memberSince: string): string {
  const joined = new Date(memberSince)
  const now = new Date()
  const days = Math.max(1, Math.floor((now.getTime() - joined.getTime()) / 86_400_000))
  return formatMinutesToHours(Math.round(totalMinutes / days))
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ─── card header — matches DailyView's/MonthlyView's/YearlyView's CardHeader exactly ───

interface CardHeaderProps {
  icon: React.ReactNode
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

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: React.ReactNode
  label: string
  valueSize?: number
}

function StatCard({ icon, title, value, label, valueSize = 28 }: StatCardProps) {
  return (
    <div style={cardStyle}>
      <CardHeader icon={icon} title={title} />
      <div style={{ color: '#7A7890', fontSize: 12 }}>{label}</div>
      <div
        className="font-data"
        style={{
          fontSize: valueSize,
          fontWeight: 600,
          color: '#E8E6F0',
          marginTop: 4,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          className="animate-pulse bg-depth-raised"
          style={{ width: 26, height: 26, borderRadius: 6 }}
        />
        <div className="animate-pulse rounded bg-depth-raised" style={{ height: 13, width: 90 }} />
      </div>
      <div
        className="animate-pulse rounded bg-depth-raised"
        style={{ height: 1, margin: '8px 0' }}
      />
      <div
        className="animate-pulse rounded bg-depth-raised"
        style={{ height: 11, width: 70, marginBottom: 8 }}
      />
      <div className="animate-pulse rounded bg-depth-raised" style={{ height: 32, width: 100 }} />
    </div>
  )
}

export function OverviewView({ projectId, projectLabel }: AnalyticsProjectScope) {
  const { data: profile, isLoading: loadingProfile } = useProfile()
  const { data: sessions, isLoading: loadingSessions } = useSessionsAllTime(projectId)

  const isProjectFiltered = projectId !== undefined
  const isLoading = loadingSessions || (!isProjectFiltered && loadingProfile)

  // Lifetime project breakdown — aggregated across every focus session ever logged
  const projectMap = new Map<string, Omit<ProjectEntry, 'pct'>>()
  for (const s of sessions ?? []) {
    const pid = s.project_id ?? '__none__'
    const name = s.projects?.name ?? 'No project'
    const color = s.projects?.color ?? '#7A7890'
    const cur = projectMap.get(pid)
    if (cur) cur.minutes += s.duration_mins
    else projectMap.set(pid, { name, color, minutes: s.duration_mins })
  }
  const totalProjectMinutes = [...projectMap.values()].reduce((s, p) => s + p.minutes, 0)
  const projectPieData: ProjectEntry[] = [...projectMap.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .map((p) => ({
      ...p,
      pct: totalProjectMinutes > 0 ? Math.round((p.minutes / totalProjectMinutes) * 100) : 0,
    }))

  const dailyTotals = [...sessionsToDailyTotals(sessions ?? []).values()]
  const firstSessionDate = [...(sessions ?? [])].sort((a, b) =>
    a.started_at.localeCompare(b.started_at)
  )[0]?.started_at
  const totalFocusMinutes = isProjectFiltered
    ? (sessions ?? []).reduce((total, session) => total + session.duration_mins, 0)
    : (profile?.total_focus_minutes ?? 0)
  const totalSessions = isProjectFiltered ? (sessions?.length ?? 0) : (profile?.total_sessions ?? 0)
  const currentStreak = isProjectFiltered
    ? getCurrentFocusStreak(dailyTotals)
    : (profile?.current_streak ?? 0)
  const longestStreak = isProjectFiltered
    ? getLongestFocusStreak(dailyTotals)
    : (profile?.longest_streak ?? 0)
  const memberSince = isProjectFiltered
    ? (firstSessionDate ?? new Date().toISOString())
    : (profile?.member_since ?? new Date().toISOString())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {isLoading || (!isProjectFiltered && !profile) ? (
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
              icon={<Clock size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Focus Time"
              value={formatMinutesToHours(totalFocusMinutes)}
              label="total focus"
            />
            <StatCard
              icon={<BarChart2 size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Focus Sessions"
              value={totalSessions}
              label="sessions"
            />
            <StatCard
              icon={<Flame size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Current Streak"
              value={
                <>
                  {currentStreak}
                  <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>days</span>
                </>
              }
              label={isProjectFiltered ? 'project activity streak' : 'current streak'}
            />
            <StatCard
              icon={<Award size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Longest Streak"
              value={
                <>
                  {longestStreak}
                  <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>days</span>
                </>
              }
              label={isProjectFiltered ? 'longest project streak' : 'longest streak'}
            />
            <StatCard
              icon={<Timer size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title="Avg Per Day"
              value={computeAvgPerDay(totalFocusMinutes, memberSince)}
              label="avg per day"
            />
            <StatCard
              icon={<Calendar size={16} style={{ color: '#7A7890', flexShrink: 0 }} />}
              title={isProjectFiltered ? 'First Session' : 'Member Since'}
              valueSize={16}
              value={formatMemberSince(memberSince)}
              label={isProjectFiltered ? 'first filtered session' : 'member since'}
            />
          </>
        )}
      </div>

      {/* Focus Time by Project — lifetime */}
      <ProjectBreakdownCard
        pieData={projectPieData}
        isLoading={isLoading}
        title={isProjectFiltered ? `${projectLabel} Focus` : 'Focus Time by Project'}
        subtitle={
          isProjectFiltered
            ? `All-time focus logged for ${projectLabel}`
            : "See how you've spent your focus time across every project, all-time"
        }
        emptyText={
          isProjectFiltered
            ? `No focus sessions for ${projectLabel} yet.`
            : 'No focus sessions logged yet.'
        }
      />
    </div>
  )
}
