import { Lock } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  usePublicProfile,
  usePublicHeatmap,
  useFollowStatus,
  useFollowUser,
  useUnfollowUser,
} from '@/hooks/useLeaderboard'
import { useAuthStore } from '@/store/authStore'
import { formatMinutesToHours, formatPeriodKey, getWeeksInYear } from '@/lib/utils/analytics'

// ── Heatmap constants (mirrors YearlyView) ──────────────────────────────────

const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_ROWS  = ['Mon','','Wed','','Fri','','']
const CELL = 13, GAP = 3, STEP = 16, DAY_W = 32

const LEGEND_COLORS = [
  '#222228',
  'rgba(75,158,255,0.20)',
  'rgba(75,158,255,0.45)',
  'rgba(75,158,255,0.70)',
  '#4B9EFF',
]

function cellColor(minutes: number): string {
  if (minutes <= 0)  return '#222228'
  if (minutes < 60)  return 'rgba(75,158,255,0.20)'
  if (minutes < 120) return 'rgba(75,158,255,0.45)'
  if (minutes < 240) return 'rgba(75,158,255,0.70)'
  return '#4B9EFF'
}

// ── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#4B9EFF', '#7C3AED', '#059669', '#DC2626', '#D97706', '#DB2777']

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function formatMemberSince(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ── ProfileHeatmap ───────────────────────────────────────────────────────────

interface ProfileHeatmapProps {
  summaries: Array<{ date: string; focus_minutes: number }>
}

function ProfileHeatmap({ summaries }: ProfileHeatmapProps) {
  const year     = new Date().getFullYear()
  const todayKey = formatPeriodKey(new Date(), 'daily')
  const focusMap = new Map(summaries.map(s => [s.date, s.focus_minutes]))

  const weeks = [...getWeeksInYear(year)]
  const lastMonday = weeks[weeks.length - 1]
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  if (lastSunday < new Date(year, 11, 31)) {
    const extra = new Date(lastMonday)
    extra.setDate(lastMonday.getDate() + 7)
    weeks.push(extra)
  }

  const monthLabels: Array<{ label: string; col: number }> = []
  let seenMonth = -1
  weeks.forEach((monday, col) => {
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + d)
      if (day.getFullYear() === year) {
        const m = day.getMonth()
        if (m !== seenMonth) {
          seenMonth = m
          monthLabels.push({ label: MONTHS[m], col })
        }
        break
      }
    }
  })

  const gridWidth = weeks.length * STEP - GAP

  return (
    <div style={{
      backgroundColor: '#141417',
      border:          '1px solid #2E2E38',
      borderRadius:    14,
      padding:         20,
      overflowX:       'auto',
    }}>
      <div style={{ width: DAY_W + GAP + gridWidth, minWidth: DAY_W + GAP + gridWidth }}>

        {/* Month labels */}
        <div style={{ paddingLeft: DAY_W + GAP, position: 'relative', height: 20, marginBottom: 4 }}>
          {monthLabels.map(({ label, col }) => (
            <span
              key={label}
              className="text-ink-muted"
              style={{ position: 'absolute', left: col * STEP, fontSize: 11 }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Day labels + grid */}
        <div style={{ display: 'flex', gap: GAP }}>
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
                  const minutes  = inYear && !isFuture ? (focusMap.get(key) ?? 0) : 0
                  const tipText  = !inYear ? '' : minutes > 0
                    ? `${cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${formatMinutesToHours(minutes)}`
                    : `${cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — No sessions`

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
                        outline:         key === todayKey ? '2px solid rgba(75,158,255,0.5)' : 'none',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
          <span className="text-ink-muted" style={{ fontSize: 11 }}>Less</span>
          {LEGEND_COLORS.map((color, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
          ))}
          <span className="text-ink-muted" style={{ fontSize: 11 }}>More</span>
        </div>
      </div>
    </div>
  )
}

// ── Follow button (requires own component for hooks) ─────────────────────────

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { data: isFollowing, isLoading: statusLoading } = useFollowStatus(targetUserId)
  const follow   = useFollowUser()
  const unfollow = useUnfollowUser()
  const pending  = follow.isPending || unfollow.isPending

  if (statusLoading) return <div style={{ width: 100, height: 36 }} />

  return isFollowing ? (
    <Button
      variant="ghost"
      size="sm"
      isLoading={pending}
      onClick={() => unfollow.mutate(targetUserId)}
      style={{ color: '#7A7890' }}
    >
      Following
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      isLoading={pending}
      onClick={() => follow.mutate(targetUserId)}
      style={{ color: '#4B9EFF', borderColor: '#4B9EFF' }}
    >
      Follow
    </Button>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  valueColor,
}: {
  value: string
  label: string
  valueColor?: string
}) {
  return (
    <div style={{
      flex:            1,
      backgroundColor: '#141417',
      border:          '1px solid #2E2E38',
      borderRadius:    14,
      padding:         '20px 24px',
    }}>
      <div
        className="font-data"
        style={{ fontSize: 28, fontWeight: 600, color: valueColor ?? '#E8E6F0', letterSpacing: '-0.02em', lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div className="text-ink-muted" style={{ fontSize: 12, marginTop: 6 }}>{label}</div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PublicProfilePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const currentUserId = useAuthStore(s => s.user?.id ?? '')

  const { data: profile, isLoading } = usePublicProfile(slug)

  const year      = new Date().getFullYear()
  const startDate = formatPeriodKey(new Date(year, 0, 1), 'daily')
  const endDate   = formatPeriodKey(new Date(year, 11, 31), 'daily')

  const showHeatmap    = profile?.is_public && profile.show_heatmap_on_profile
  const { data: heat } = usePublicHeatmap(
    showHeatmap ? (profile?.id ?? '') : '',
    startDate,
    endDate,
  )

  if (isLoading) {
    return (
      <div style={{
        minHeight:       '100dvh',
        backgroundColor: '#0D0D10',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Spinner />
      </div>
    )
  }

  const isPrivate = !profile || !profile.is_public

  if (isPrivate) {
    return (
      <div style={{
        minHeight:       '100dvh',
        backgroundColor: '#0D0D10',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         24,
      }}>
        <div style={{
          backgroundColor: '#141417',
          border:          '1px solid #2E2E38',
          borderRadius:    16,
          padding:         '48px 40px',
          textAlign:       'center',
          maxWidth:        360,
          width:           '100%',
        }}>
          <Lock style={{ width: 36, height: 36, color: '#3D3B4E', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 16, fontWeight: 500, color: '#E8E6F0', marginBottom: 8 }}>
            This profile is private
          </p>
          <p style={{ fontSize: 13, color: '#7A7890' }}>
            This user has chosen to keep their profile private
          </p>
        </div>
      </div>
    )
  }

  const isOwnProfile  = !!currentUserId && currentUserId === profile.id
  const streakColor   = profile.current_streak > 0 ? '#C8FF64' : '#E8E6F0'

  return (
    <div style={{
      minHeight:       '100dvh',
      backgroundColor: '#0D0D10',
      padding:         '40px 24px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* HEADER CARD */}
        <div style={{
          backgroundColor: '#141417',
          border:          '1px solid #2E2E38',
          borderRadius:    16,
          padding:         32,
          display:         'flex',
          alignItems:      'center',
          gap:             20,
        }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width:          72,
              height:         72,
              borderRadius:   '50%',
              flexShrink:     0,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              background:     avatarColor(profile.display_name),
              fontSize:       28,
              fontWeight:     600,
              color:          '#fff',
            }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 24, fontWeight: 500, color: '#E8E6F0', margin: 0 }}>
              {profile.display_name}
            </p>
            <p className="text-ink-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Member since {formatMemberSince(profile.member_since)}
            </p>
          </div>

          {!isOwnProfile && !!currentUserId && (
            <FollowButton targetUserId={profile.id} />
          )}
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'flex', gap: 16 }}>
          <StatCard
            value={formatMinutesToHours(profile.total_focus_minutes)}
            label="total focus"
          />
          <StatCard
            value={`${profile.current_streak} days`}
            label="current streak"
            valueColor={streakColor}
          />
          <StatCard
            value={`${profile.longest_streak} days`}
            label="longest streak"
          />
        </div>

        {/* HEATMAP */}
        {showHeatmap && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#7A7890', marginBottom: 12 }}>
              Focus Activity
            </p>
            <ProfileHeatmap summaries={heat ?? []} />
          </div>
        )}
      </div>
    </div>
  )
}
