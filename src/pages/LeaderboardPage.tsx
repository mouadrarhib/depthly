import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, Clock, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow'
import type { LeaderboardRowEntry } from '@/components/leaderboard/LeaderboardRow'
import { PeriodCountdown } from '@/components/leaderboard/PeriodCountdown'
import { UserProfileModal } from '@/components/leaderboard/UserProfileModal'
import { PeriodNavigator } from '@/components/analytics/PeriodNavigator'
import { Spinner } from '@/components/ui/Spinner'
import { useGlobalLeaderboard, useFriendsLeaderboard, useUserRank } from '@/hooks/useLeaderboard'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { formatMinutesToHours, formatPeriodKey } from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'
import type { LeaderboardEntry } from '@/lib/supabase/queries/leaderboard'

// ── Types ────────────────────────────────────────────────────────────────────

type TimeNav   = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time'
type StreakNav  = 'current_streak' | 'best_streak'
type NavItem   = TimeNav | StreakNav
type ViewTab   = 'global' | 'friends'

interface StreakEntry {
  rank:           number
  user_id:        string
  display_name:   string
  avatar_url:     string | null
  profile_slug:   string
  current_streak: number
  longest_streak: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_ITEMS: { value: TimeNav; label: string }[] = [
  { value: 'daily',    label: 'Day'      },
  { value: 'weekly',   label: 'Week'     },
  { value: 'monthly',  label: 'Month'    },
  { value: 'yearly',   label: 'Year'     },
  { value: 'all_time', label: 'All Time' },
]

const STREAK_ITEMS: { value: StreakNav; label: string }[] = [
  { value: 'current_streak', label: 'Current Streak' },
  { value: 'best_streak',    label: 'Best Streak'    },
]

const NAV_TITLE: Record<NavItem, string> = {
  daily:          'Daily',
  weekly:         'Weekly',
  monthly:        'Monthly',
  yearly:         'Yearly',
  all_time:       'All-Time',
  current_streak: 'Current Streak',
  best_streak:    'Best Streak',
}

const IS_TIME_NAV = (n: NavItem): n is TimeNav =>
  ['daily', 'weekly', 'monthly', 'yearly', 'all_time'].includes(n)

// ── Inline streak queries (avoids touching query/hooks files) ─────────────────

async function fetchStreakLeaderboard(mode: StreakNav, limit = 50): Promise<StreakEntry[]> {
  const orderCol = mode === 'current_streak' ? 'current_streak' : 'longest_streak'
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, profile_slug, current_streak, longest_streak')
    .eq('is_public', true)
    .gt(orderCol, 0)
    .order(orderCol, { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((row, i) => ({
    rank:           i + 1,
    user_id:        row.id,
    display_name:   row.display_name,
    avatar_url:     row.avatar_url,
    profile_slug:   row.profile_slug,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
  }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavSection({
  title,
  items,
  active,
  onSelect,
}: {
  title:    string
  items:    { value: NavItem; label: string }[]
  active:   NavItem
  onSelect: (v: NavItem) => void
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{
        fontSize:      11,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color:         '#7A7890',
        marginBottom:  8,
        fontWeight:    500,
      }}>
        {title}
      </p>
      {items.map(({ value, label }) => {
        const isActive = active === value
        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            style={{
              display:      'block',
              width:        '100%',
              textAlign:    'left',
              padding:      '6px 12px',
              borderRadius: 8,
              border:       'none',
              background:   isActive ? '#222228' : 'transparent',
              color:        isActive ? '#E8E6F0' : '#7A7890',
              fontSize:     13,
              fontWeight:   isActive ? 500 : 400,
              cursor:       'pointer',
              marginBottom: 2,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function TabPill({
  label,
  active,
  onClick,
}: {
  label:   string
  active:  boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      '5px 14px',
        borderRadius: 9999,
        border:       'none',
        background:   active ? '#222228' : 'transparent',
        color:        active ? '#E8E6F0' : '#3D3B4E',
        fontSize:     13,
        fontWeight:   active ? 500 : 400,
        cursor:       'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const [activeNav,       setActiveNav]       = useState<NavItem>('weekly')
  const [viewTab,         setViewTab]         = useState<ViewTab>('global')
  const [currentDate,     setCurrentDate]     = useState(() => new Date())
  const [selectedUserId,  setSelectedUserId]  = useState<string | null>(null)

  const currentUserId = useAuthStore(s => s.user?.id ?? '')
  const isTimeMode    = IS_TIME_NAV(activeNav)
  const isStreakMode  = !isTimeMode
  const showNavigator = isTimeMode && activeNav !== 'all_time'

  // Period key from the navigated date (not just "current" date)
  const periodType = isTimeMode
    ? (activeNav as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time')
    : 'weekly'

  const periodKey = (isTimeMode && activeNav !== 'all_time')
    ? formatPeriodKey(currentDate, periodType as 'daily' | 'weekly' | 'monthly' | 'yearly')
    : ''

  // When switching nav items, reset date to today
  function handleNavSelect(nav: NavItem) {
    setActiveNav(nav)
    setCurrentDate(new Date())
  }

  // ── Queries ──

  const globalQuery  = useGlobalLeaderboard(isTimeMode ? activeNav : 'weekly', periodKey)
  const friendsQuery = useFriendsLeaderboard(
    isTimeMode && activeNav !== 'all_time' ? activeNav : 'yearly',
    isTimeMode && activeNav !== 'all_time' ? periodKey : formatPeriodKey(new Date(), 'yearly'),
  )
  const rankQuery = useUserRank(
    isTimeMode && activeNav !== 'all_time' ? activeNav : 'yearly',
    isTimeMode && activeNav !== 'all_time' ? periodKey : formatPeriodKey(new Date(), 'yearly'),
  )

  const streakQuery = useQuery({
    queryKey: ['leaderboard', 'streak', activeNav],
    queryFn:  () => fetchStreakLeaderboard(activeNav as StreakNav),
    enabled:  isStreakMode,
  })

  // Active data source
  const activeQuery = isStreakMode
    ? streakQuery
    : viewTab === 'global' ? globalQuery : friendsQuery

  const entries   = activeQuery.data ?? []
  const isLoading = activeQuery.isLoading

  // Rank from list for all-time (hook doesn't cover it)
  const allTimeRankEntry = activeNav === 'all_time'
    ? (entries as LeaderboardEntry[]).find(e => e.user_id === currentUserId)
    : null

  // Value to display per row
  function rowValue(entry: StreakEntry | LeaderboardEntry): string {
    if (isStreakMode) {
      const se = entry as StreakEntry
      return activeNav === 'current_streak'
        ? `${se.current_streak} days`
        : `${se.longest_streak} days`
    }
    return formatMinutesToHours((entry as LeaderboardEntry).focus_minutes)
  }

  // Scope label for status bar
  const scopeLabel = isStreakMode
    ? `${NAV_TITLE[activeNav]} · Global`
    : `${NAV_TITLE[activeNav]} · ${viewTab === 'global' ? 'Everyone' : 'Friends'} · Global`

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>

      {/* ── Left panel ── */}
      <div style={{
        width:        160,
        flexShrink:   0,
        background:   '#0D0D10',
        borderRight:  '1px solid #2E2E38',
        padding:      '24px 12px',
        overflowY:    'auto',
      }}>
        <NavSection
          title="Time"
          items={TIME_ITEMS}
          active={activeNav}
          onSelect={handleNavSelect}
        />
        <NavSection
          title="Streak"
          items={STREAK_ITEMS}
          active={activeNav}
          onSelect={handleNavSelect}
        />
      </div>

      {/* ── Right content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Title */}
          <h1 style={{
            fontSize:    28,
            fontWeight:  600,
            color:       '#E8E6F0',
            textAlign:   'center',
            margin:      '0 0 8px',
          }}>
            {NAV_TITLE[activeNav]} Leaderboard
          </h1>

          {/* Period navigator */}
          {showNavigator && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <PeriodNavigator
                period={periodType as 'daily' | 'weekly' | 'monthly' | 'yearly'}
                currentDate={currentDate}
                onNavigate={setCurrentDate}
              />
            </div>
          )}
          {!showNavigator && <div style={{ marginBottom: 20 }} />}

          {/* Status bar */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                padding:      '2px 10px',
                borderRadius: 9999,
                fontSize:     12,
                fontWeight:   500,
                background:   'rgba(61,214,140,0.15)',
                color:        '#3DD68C',
                border:       '1px solid rgba(61,214,140,0.3)',
              }}>
                Active
              </span>
              <span style={{ fontSize: 13, color: '#7A7890' }}>{scopeLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isTimeMode && <PeriodCountdown periodType={activeNav} periodKey={periodKey} />}
              {isTimeMode && (
                <div style={{
                  display:      'flex',
                  background:   '#1C1C23',
                  borderRadius: 9999,
                  padding:      2,
                  gap:          2,
                }}>
                  <TabPill label="Everyone" active={viewTab === 'global'}  onClick={() => setViewTab('global')}  />
                  <TabPill label="Friends"  active={viewTab === 'friends'} onClick={() => setViewTab('friends')} />
                </div>
              )}
            </div>
          </div>

          {/* User rank bar */}
          {isTimeMode && (() => {
            const rankedEntry = activeNav === 'all_time' ? allTimeRankEntry : null
            const periodRank  = activeNav !== 'all_time' ? rankQuery.data : null
            const isRanked    = !!(rankedEntry || periodRank)

            const rankNum     = rankedEntry?.rank ?? periodRank?.rank
            const focusMins   = rankedEntry
              ? rankedEntry.focus_minutes
              : periodRank?.focus_minutes

            return (
              <div style={{
                border:          isRanked ? '1px solid #2E2E38' : '1px solid #2E2E38',
                borderLeft:      isRanked ? '3px solid #4B9EFF' : '1px solid #2E2E38',
                borderRadius:    10,
                padding:         '12px 20px',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'space-between',
                marginBottom:    16,
                background:      isRanked ? 'rgba(75,158,255,0.05)' : '#141417',
              }}>
                {isRanked ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span className="font-data" style={{ fontSize: 22, color: '#4B9EFF', fontWeight: 700 }}>
                        #{rankNum}
                      </span>
                      <span style={{ fontSize: 12, color: '#7A7890' }}>
                        of {entries.length} users
                      </span>
                    </div>
                    {focusMins !== undefined && (
                      <span className="font-data" style={{ fontSize: 14, color: '#E8E6F0' }}>
                        {formatMinutesToHours(focusMins)}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#7A7890' }}>Your position</span>
                  </>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#7A7890', margin: 0 }}>Unranked</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Clock style={{ width: 14, height: 14, color: '#3D3B4E', flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: '#3D3B4E', margin: 0 }}>
                        You haven't tracked any focus time this period yet
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* List */}
          <div style={{
            backgroundColor: '#141417',
            border:          '1px solid #2E2E38',
            borderRadius:    14,
            overflow:        'hidden',
          }}>
            {/* Column headers */}
            <div style={{
              display:      'flex',
              alignItems:   'center',
              padding:      '10px 20px',
              borderBottom: '1px solid #2E2E38',
            }}>
              <div style={{ width: 48, flexShrink: 0 }} />
              <div style={{ width: 48, flexShrink: 0 }} />
              <div style={{
                flex:          1,
                fontSize:      11,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color:         '#7A7890',
              }}>
                User
              </div>
              <div style={{
                width:         100,
                flexShrink:    0,
                textAlign:     'right',
                fontSize:      11,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color:         '#7A7890',
              }}>
                {isStreakMode ? 'Streak' : 'Time'}
              </div>
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Spinner />
              </div>
            ) : entries.length === 0 ? (
              <div style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                padding:        '48px 20px',
                gap:            10,
                textAlign:      'center',
              }}>
                {viewTab === 'friends' && isTimeMode ? (
                  <>
                    <Users style={{ width: 36, height: 36, color: '#3D3B4E' }} />
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#7A7890', margin: 0 }}>
                      No friends yet
                    </p>
                    <p style={{ fontSize: 13, color: '#3D3B4E', margin: 0 }}>
                      Click a user on the Everyone tab to follow them
                    </p>
                    <button
                      onClick={() => setViewTab('global')}
                      style={{
                        marginTop:    6,
                        padding:      '6px 16px',
                        borderRadius: 8,
                        border:       '1px solid #2E2E38',
                        background:   '#222228',
                        color:        '#7A7890',
                        fontSize:     13,
                        cursor:       'pointer',
                      }}
                    >
                      Browse everyone →
                    </button>
                  </>
                ) : (
                  <>
                    <BarChart2 style={{ width: 36, height: 36, color: '#3D3B4E' }} />
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#7A7890', margin: 0 }}>
                      No data for this period
                    </p>
                    <p style={{ fontSize: 13, color: '#3D3B4E', margin: 0 }}>
                      Complete a focus session to appear on the leaderboard
                    </p>
                    <Link
                      to={PATHS.timer}
                      style={{
                        marginTop:    6,
                        padding:      '6px 16px',
                        borderRadius: 8,
                        border:       '1px solid rgba(75,158,255,0.2)',
                        background:   'rgba(75,158,255,0.06)',
                        color:        '#4B9EFF',
                        fontSize:     13,
                        textDecoration: 'none',
                        display:      'inline-block',
                      }}
                    >
                      Start a session →
                    </Link>
                  </>
                )}
              </div>
            ) : (
              (entries as Array<StreakEntry | LeaderboardEntry>).map(entry => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry as LeaderboardRowEntry}
                  rank={entry.rank}
                  isCurrentUser={entry.user_id === currentUserId}
                  valueDisplay={rowValue(entry)}
                  onClick={() => setSelectedUserId(entry.user_id)}
                />
              ))
            )}
          </div>

        </div>
      </div>

      {/* Modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  )
}
