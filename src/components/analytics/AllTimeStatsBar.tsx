import { Clock, CheckCircle, Flame, Trophy, TrendingUp, Calendar, type LucideIcon } from 'lucide-react'

import { useProfile } from '@/hooks/useAnalytics'
import { formatMinutesToHours } from '@/lib/utils/analytics'

function computeAvgPerDay(totalMinutes: number, memberSince: string): string {
  const joined = new Date(memberSince)
  const now    = new Date()
  const days   = Math.max(1, Math.floor((now.getTime() - joined.getTime()) / 86_400_000))
  return formatMinutesToHours(Math.round(totalMinutes / days))
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface StatCellProps {
  icon:      LucideIcon
  iconBg:    string
  iconColor: string
  value:     React.ReactNode
  label:     string
}

function StatCell({ icon: Icon, iconBg, iconColor, value, label }: StatCellProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '20px 16px',
        textAlign:       'center',
        backgroundColor: '#141417',
      }}
    >
      {/* Icon */}
      <div style={{
        width:           40,
        height:          40,
        borderRadius:    10,
        backgroundColor: iconBg,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        margin:          '0 auto',
      }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>

      {/* Value */}
      <div
        className="font-data"
        style={{
          fontSize:   22,
          fontWeight: 600,
          color:      '#E8E6F0',
          marginTop:  10,
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize:      10,
          fontWeight:    500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         '#7A7890',
          marginTop:     4,
          whiteSpace:    'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function SkeletonCell() {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '20px 16px',
        backgroundColor: '#141417',
      }}
    >
      <div
        className="bg-depth-raised animate-pulse"
        style={{ width: 40, height: 40, borderRadius: '50%' }}
      />
      <div
        className="bg-depth-raised animate-pulse rounded"
        style={{ height: 22, width: 60, marginTop: 10 }}
      />
      <div
        className="bg-depth-raised animate-pulse rounded"
        style={{ height: 10, width: 48, marginTop: 4 }}
      />
    </div>
  )
}

export function AllTimeStatsBar() {
  const { data: profile, isLoading } = useProfile()

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px"
      style={{
        backgroundColor: '#2E2E38',
        border:          '1px solid #2E2E38',
        borderRadius:    14,
        overflow:        'hidden',
      }}
    >
      {isLoading || !profile ? (
        <>
          <SkeletonCell />
          <SkeletonCell />
          <SkeletonCell />
          <SkeletonCell />
          <SkeletonCell />
          <SkeletonCell />
        </>
      ) : (
        <>
          <StatCell
            icon={Clock}
            iconBg="rgba(75,158,255,0.2)"
            iconColor="#4B9EFF"
            value={formatMinutesToHours(profile.total_focus_minutes)}
            label="total focus"
          />
          <StatCell
            icon={CheckCircle}
            iconBg="rgba(61,214,140,0.2)"
            iconColor="#3DD68C"
            value={profile.total_sessions}
            label="sessions"
          />
          <StatCell
            icon={Flame}
            iconBg="rgba(200,255,100,0.2)"
            iconColor="#C8FF64"
            value={
              <span style={profile.current_streak > 0 ? { color: '#C8FF64' } : { color: '#E8E6F0' }}>
                {profile.current_streak} days
              </span>
            }
            label="current streak"
          />
          <StatCell
            icon={Trophy}
            iconBg="rgba(245,166,35,0.2)"
            iconColor="#F5A623"
            value={`${profile.longest_streak} days`}
            label="longest streak"
          />
          <StatCell
            icon={TrendingUp}
            iconBg="rgba(75,158,255,0.2)"
            iconColor="#4B9EFF"
            value={computeAvgPerDay(profile.total_focus_minutes, profile.member_since)}
            label="avg per day"
          />
          <StatCell
            icon={Calendar}
            iconBg="rgba(122,120,144,0.2)"
            iconColor="#7A7890"
            value={formatMemberSince(profile.member_since)}
            label="member since"
          />
        </>
      )}
    </div>
  )
}
