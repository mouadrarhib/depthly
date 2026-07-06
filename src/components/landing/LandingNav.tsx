import { Link, useNavigate } from 'react-router-dom'

import { Button, Logo } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePlan } from '@/hooks/usePlan'
import { supabase } from '@/lib/supabase/client'
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

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
]

const navLinkStyle = { fontSize: 14, color: '#7A7890', textDecoration: 'none' } as const

/** Thin vertical divider — same style used between the logo and tagline. */
const Divider = () => (
  <span style={{ width: 0.5, height: 20, background: '#2E2E38', flexShrink: 0, display: 'block' }} />
)

/**
 * Public marketing nav. Reads auth state only to swap the CTA:
 * logged out → "Log in" + "Get started", logged in → "Go to app" + avatar
 * (with a working account dropdown, same pattern as the app's Topbar).
 */
export function LandingNav() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { plan } = usePlan()

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    ''
  const initial = displayName.charAt(0).toUpperCase() || '?'

  const planLabel =
    plan === 'pro' ? 'Pro' :
    plan === 'founding' ? 'Founding' :
    'Free'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

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
        <div className="flex items-center gap-8">
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

          {/* Anchor nav links — hidden below md to keep mobile CTA layout tight */}
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={navLinkStyle}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E6F0' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7890' }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Auth CTAs */}
        {user ? (
          <div className="flex items-center gap-4">
            <Button asChild size="sm" style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}>
              <Link to={PATHS.dashboard}>Go to app</Link>
            </Button>

            <Divider />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="User menu"
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: avatarColor(displayName),
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'filter 0.15s ease, transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.15)'
                    e.currentTarget.style.transform = 'scale(1.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  {initial}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" style={{ minWidth: 200 }}>
                <DropdownMenuLabel
                  style={{ fontSize: 12, fontWeight: 400, color: '#7A7890', padding: '8px 8px 4px' }}
                >
                  {user.email}
                </DropdownMenuLabel>

                <div style={{ padding: '2px 8px 8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      background: plan === 'free' ? 'rgba(122,120,144,0.15)' : 'rgba(75,158,255,0.15)',
                      color: plan === 'free' ? '#7A7890' : '#4B9EFF',
                    }}
                  >
                    {planLabel}
                  </span>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate(PATHS.dashboard)}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(PATHS.settings)}>
                  Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleSignOut} style={{ color: '#E07878' }}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
