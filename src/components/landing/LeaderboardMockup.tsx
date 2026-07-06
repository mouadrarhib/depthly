import { Trophy } from 'lucide-react'

import { StreakBadge } from '@/components/ui'

const MEDAL_COLORS: Record<number, string> = {
  1: '#F5A623',
  2: '#C0C0C0',
  3: '#CD7F32',
}

interface MockEntry {
  rank: number
  initial: string
  avatarBg: string
  name: string
  hours: string
  streakDays: number
  isYou?: boolean
}

const ENTRIES: MockEntry[] = [
  { rank: 1, initial: 'S', avatarBg: '#A78BFA', name: 'Sara K.', hours: '32h 40m', streakDays: 21 },
  { rank: 2, initial: 'M', avatarBg: '#4B9EFF', name: 'Mouad R.', hours: '28h 15m', streakDays: 14, isYou: true },
  { rank: 3, initial: 'J', avatarBg: '#3DD68C', name: 'Jonas T.', hours: '24h 02m', streakDays: 9 },
  { rank: 4, initial: 'A', avatarBg: '#F472B6', name: 'Aya B.', hours: '19h 30m', streakDays: 7 },
]

/**
 * Static illustrative leaderboard — mirrors the real LeaderboardRow styling
 * (rank medal, avatar circle, name, weekly hours, streak badge).
 */
export function LeaderboardMockup() {
  return (
    <div
      className="mx-auto w-full"
      style={{
        maxWidth: 460,
        backgroundColor: '#141417',
        border: '1px solid #2E2E38',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '14px 20px', borderBottom: '1px solid #2E2E38' }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#E8E6F0' }}>This week</span>
        <span className="font-data" style={{ fontSize: 11, color: '#7A7890' }}>
          Resets in 2d 6h
        </span>
      </div>

      {ENTRIES.map(({ rank, initial, avatarBg, name, hours, streakDays, isYou }, i) => (
        <div
          key={rank}
          className="flex items-center gap-3"
          style={{
            padding: '12px 20px',
            borderBottom: i < ENTRIES.length - 1 ? '1px solid #2E2E38' : 'none',
          }}
        >
          {/* Rank */}
          <span className="flex shrink-0 items-center" style={{ width: 26 }}>
            {MEDAL_COLORS[rank] ? (
              <Trophy size={16} style={{ color: MEDAL_COLORS[rank] }} />
            ) : (
              <span className="font-data" style={{ fontSize: 13, color: '#3D3B4E' }}>
                {rank}
              </span>
            )}
          </span>

          {/* Avatar */}
          <span
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: 32,
              height: 32,
              backgroundColor: avatarBg,
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {initial}
          </span>

          {/* Name + streak */}
          <span className="flex min-w-0 flex-1 flex-wrap items-center" style={{ gap: 8 }}>
            <span
              className="truncate"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: isYou ? '#4B9EFF' : '#E8E6F0',
              }}
            >
              {name}
            </span>
            {isYou ? (
              <span
                className="shrink-0 rounded-full"
                style={{
                  fontSize: 10,
                  padding: '1px 7px',
                  backgroundColor: 'rgba(75, 158, 255, 0.1)',
                  color: '#4B9EFF',
                }}
              >
                You
              </span>
            ) : null}
            <span className="hidden sm:inline-flex">
              <StreakBadge days={streakDays} />
            </span>
          </span>

          {/* Weekly hours */}
          <span
            className="font-data shrink-0"
            style={{ fontSize: 13, color: '#E8E6F0', fontWeight: 500 }}
          >
            {hours}
          </span>
        </div>
      ))}
    </div>
  )
}
