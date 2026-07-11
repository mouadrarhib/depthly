import { useState, useEffect } from 'react'

const AVATAR_COLORS = [
  '#4B9EFF', '#3DD68C', '#F5A623',
  '#F25C5C', '#A78BFA', '#F472B6',
  '#FB923C', '#34D399',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface AvatarProps {
  avatarUrl?: string | null
  name: string
  size?: number
  fontSize?: number
  className?: string
}

// Single source of truth for rendering a user's avatar (photo or initial
// fallback) — used by both the Sidebar and Topbar so they never drift.
export function Avatar({ avatarUrl, name, size = 32, fontSize = 13, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  // Reset error state when the url changes (e.g. user uploads/removes a photo)
  useEffect(() => { setImgError(false) }, [avatarUrl])

  const showImage = !!avatarUrl && !imgError

  return (
    <div
      className={className}
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        overflow:       'hidden',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
        backgroundColor: showImage ? undefined : getAvatarColor(name),
      }}
    >
      {showImage ? (
        <img
          src={avatarUrl as string}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize, fontWeight: 600, color: 'white', userSelect: 'none' }}>
          {name[0]?.toUpperCase() ?? '?'}
        </span>
      )}
    </div>
  )
}
