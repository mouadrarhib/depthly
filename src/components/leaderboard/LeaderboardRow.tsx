import { useState } from 'react'
import { Flame, Trophy } from 'lucide-react'

const RANK_COLORS: Record<number, string> = {
  1: '#F5A623',
  2: '#C0C0C0',
  3: '#CD7F32',
}

const ROW_ACCENT: Record<number, React.CSSProperties> = {
  1: { background: 'rgba(245,166,35,0.10)',  borderLeft: '3px solid #F5A623' },
  2: { background: 'rgba(192,192,192,0.10)', borderLeft: '3px solid #C0C0C0' },
  3: { background: 'rgba(205,127,50,0.10)',  borderLeft: '3px solid #CD7F32' },
}

function getAvatarColor(name: string): string {
  const colors = [
    '#4B9EFF', '#3DD68C', '#F5A623',
    '#F25C5C', '#A78BFA', '#F472B6',
    '#FB923C', '#34D399',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export interface LeaderboardRowEntry {
  user_id:        string
  display_name:   string
  avatar_url:     string | null
  current_streak: number
}

interface LeaderboardRowProps {
  entry:         LeaderboardRowEntry
  rank:          number
  isCurrentUser: boolean
  valueDisplay:  string
  onClick:       () => void
}

export function LeaderboardRow({ entry, rank, isCurrentUser, valueDisplay, onClick }: LeaderboardRowProps) {
  const medalColor       = RANK_COLORS[rank]
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={onClick}
      style={{
        display:      'flex',
        alignItems:   'center',
        padding:      '12px 20px',
        borderBottom: '1px solid #2E2E38',
        cursor:       'pointer',
        transition:   'background 0.12s',
        ...ROW_ACCENT[rank] ?? {},
      }}
      onMouseEnter={e => {
        if (!ROW_ACCENT[rank]) (e.currentTarget as HTMLDivElement).style.background = '#1C1C23'
      }}
      onMouseLeave={e => {
        if (!ROW_ACCENT[rank]) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* Rank — 48px */}
      <div style={{ width: 48, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {medalColor ? (
          <Trophy style={{ width: 18, height: 18, color: medalColor }} />
        ) : (
          <span
            className="font-data"
            style={{
              fontSize:   14,
              color:      isCurrentUser ? '#4B9EFF' : '#3D3B4E',
              fontWeight: isCurrentUser ? 700 : 400,
            }}
          >
            {rank}
          </span>
        )}
      </div>

      {/* Avatar — 36px */}
      {entry.avatar_url && !imgError ? (
        <img
          src={entry.avatar_url}
          alt={entry.display_name}
          onError={() => setImgError(true)}
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginRight: 12 }}
        />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginRight: 12,
          backgroundColor: getAvatarColor(entry.display_name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 600, color: '#fff',
        }}>
          {entry.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}

      {/* Name + streak — flex-1 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize:    14,
            fontWeight:  500,
            color:       isCurrentUser ? '#4B9EFF' : '#E8E6F0',
            overflow:    'hidden',
            textOverflow:'ellipsis',
            whiteSpace:  'nowrap',
          }}>
            {entry.display_name}
          </span>
          {isCurrentUser && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
              background: 'rgba(75,158,255,0.1)', color: '#4B9EFF',
              border: '1px solid rgba(75,158,255,0.2)', fontWeight: 500,
            }}>
              You
            </span>
          )}
        </div>
        {entry.current_streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Flame size={12} style={{ color: '#C8FF64' }} />
            <span style={{ fontSize: 11, color: '#C8FF64', fontWeight: 500 }}>
              {entry.current_streak}d streak
            </span>
          </div>
        )}
      </div>

      {/* Value — 100px right-aligned */}
      <div style={{ width: 100, flexShrink: 0, textAlign: 'right' }}>
        <span className="font-data" style={{ fontSize: 15, fontWeight: 600, color: '#E8E6F0' }}>
          {valueDisplay}
        </span>
      </div>
    </div>
  )
}
