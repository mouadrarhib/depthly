import { Link } from 'react-router-dom'

import { Button, Logo } from '@/components/ui'
import { PATHS } from '@/routes/paths'
import { useAuthStore } from '@/store'

const AVATAR_COLORS = [
  '#4B9EFF', '#3DD68C', '#F5A623',
  '#F25C5C', '#A78BFA', '#F472B6',
  '#FB923C', '#34D399',
]

function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * Public marketing nav. Reads auth state only to swap the CTA:
 * logged out → "Log in" + "Get started", logged in → "Go to app" + avatar.
 */
export function LandingNav() {
  const user = useAuthStore((s) => s.user)

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    ''
  const initial = displayName.charAt(0).toUpperCase() || '?'

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        backgroundColor: 'rgba(13, 13, 16, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid #2E2E38',
      }}
    >
      <div
        className="mx-auto flex items-center justify-between px-5 md:px-8"
        style={{ maxWidth: 1100, height: 64 }}
      >
        {/* Lockup + tagline */}
        <Link to={PATHS.home} className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
          <Logo size={26} withWordmark />
          <span
            className="hidden md:inline"
            style={{
              fontSize: 12,
              color: '#7A7890',
              borderLeft: '1px solid #2E2E38',
              paddingLeft: 12,
              letterSpacing: '-0.01em',
            }}
          >
            Stay focused, work deeper
          </span>
        </Link>

        {/* Auth CTAs */}
        {user ? (
          <div className="flex items-center gap-3">
            <Button asChild size="sm" style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}>
              <Link to={PATHS.dashboard}>Go to app</Link>
            </Button>
            <span
              aria-hidden="true"
              className="flex items-center justify-center rounded-full"
              style={{
                width: 32,
                height: 32,
                backgroundColor: avatarColor(displayName),
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {initial}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              to={PATHS.login}
              className="px-2 py-1 text-sm font-medium transition-colors"
              style={{ color: '#7A7890', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E6F0' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7890' }}
            >
              Log in
            </Link>
            <Button asChild size="sm" style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}>
              <Link to={PATHS.signup}>Get started</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
