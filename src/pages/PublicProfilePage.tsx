import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  usePublicProfile,
  usePublicHeatmap,
  useFriendshipStatus,
  usePendingFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useUnfriend,
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

// ── Friend action button (requires own component for hooks) ──────────────────

function FriendActionButton({ targetUserId }: { targetUserId: string }) {
  const { data: status, isLoading }  = useFriendshipStatus(targetUserId)
  const { data: pendingRequests }    = usePendingFriendRequests()
  const sendRequest    = useSendFriendRequest()
  const acceptRequest  = useAcceptFriendRequest()
  const declineRequest = useDeclineFriendRequest()
  const unfriend        = useUnfriend()
  const [confirmUnfriendOpen, setConfirmUnfriendOpen] = useState(false)

  if (isLoading) return <div style={{ width: 100, height: 36 }} />

  if (status === 'friends') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmUnfriendOpen(true)}
          style={{ color: '#7A7890' }}
        >
          Friends
        </Button>
        <ConfirmDialog
          open={confirmUnfriendOpen}
          onClose={() => setConfirmUnfriendOpen(false)}
          onConfirm={() => unfriend.mutate(targetUserId, { onSuccess: () => setConfirmUnfriendOpen(false) })}
          title="Remove friend"
          description="You'll stop appearing on each other's Friends leaderboard, and won't be able to see this profile again if it's private. You can send a new request later."
          confirmLabel="Remove"
          isLoading={unfriend.isPending}
          variant="danger"
        />
      </>
    )
  }

  if (status === 'pending_sent') {
    return (
      <Button variant="ghost" size="sm" disabled style={{ color: '#7A7890' }}>
        Requested
      </Button>
    )
  }

  if (status === 'pending_received') {
    const incoming = pendingRequests?.find(r => r.requester_id === targetUserId)
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          variant="outline"
          size="sm"
          isLoading={acceptRequest.isPending}
          disabled={!incoming}
          onClick={() => incoming && acceptRequest.mutate({ requestRowId: incoming.id, requesterId: targetUserId })}
          style={{ color: '#4B9EFF', borderColor: '#4B9EFF' }}
        >
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          isLoading={declineRequest.isPending}
          disabled={!incoming}
          onClick={() => incoming && declineRequest.mutate({ requestRowId: incoming.id, requesterId: targetUserId })}
          style={{ color: '#7A7890' }}
        >
          Decline
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      isLoading={sendRequest.isPending}
      onClick={() => sendRequest.mutate(targetUserId)}
      style={{ color: '#4B9EFF', borderColor: '#4B9EFF' }}
    >
      Add Friend
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

  // A private profile is still viewable by an accepted friend — RLS already
  // grants the read (see is_connected_via_follows), but a *pending* request
  // (either direction) must NOT unlock the full profile here, only a
  // confirmed mutual friendship. This hook call must stay unconditional
  // (rules of hooks); its `enabled` guard (in useFriendshipStatus) makes an
  // empty-string id a no-op instead of an extra branch here.
  const isOwnProfile     = !!currentUserId && !!profile && currentUserId === profile.id
  const needsFriendCheck = !!profile && !profile.is_public && !isOwnProfile
  const friendshipQuery  = useFriendshipStatus(needsFriendCheck ? profile!.id : '')
  const isFriend         = friendshipQuery.data === 'friends'

  const year      = new Date().getFullYear()
  const startDate = formatPeriodKey(new Date(year, 0, 1), 'daily')
  const endDate   = formatPeriodKey(new Date(year, 11, 31), 'daily')

  const showHeatmap    = !!profile && (profile.is_public || isOwnProfile || isFriend) && profile.show_heatmap_on_profile
  const { data: heat } = usePublicHeatmap(
    showHeatmap ? (profile?.id ?? '') : '',
    startDate,
    endDate,
  )

  // Wait for the friendship check too when it's actually needed, so a
  // private-but-friended profile doesn't flash the "private" lock screen
  // before the connection status comes back.
  const stillCheckingFriendship = needsFriendCheck && friendshipQuery.isLoading

  if (isLoading || stillCheckingFriendship) {
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

  const isPrivate = !profile || (!profile.is_public && !isOwnProfile && !isFriend)

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

  const streakColor = profile.current_streak > 0 ? '#C8FF64' : '#E8E6F0'

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
            <FriendActionButton targetUserId={profile.id} />
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
