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
import { useProfile } from '@/hooks/useAnalytics'
import { usePlan } from '@/hooks/usePlan'
import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
import { useAuthStore } from '@/store'

const AVATAR_COLORS = [
  '#4B9EFF',
  '#3DD68C',
  '#F5A623',
  '#F25C5C',
  '#A78BFA',
  '#F472B6',
  '#FB923C',
  '#34D399',
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

/** Quiet separation between the app action and account menu. */
const Divider = () => (
  <span
    style={{ width: 0.5, height: 20, background: '#2E2E38', flexShrink: 0, display: 'block' }}
  />
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
  const { data: profile } = useProfile()

  const displayName =
    profile?.display_name ??
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    ''
  const avatarUrl = profile?.avatar_url ?? null
  const initial = displayName.charAt(0).toUpperCase() || '?'

  const planLabel = plan === 'pro' ? 'Pro' : plan === 'founding' ? 'Founding' : 'Free'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header
      data-landing-nav
      className="sticky top-0 z-50 border-b border-depth-border bg-depth-bg/95 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-5 md:px-8">
        <div className="flex min-w-0 items-center gap-9">
          <Link
            to={PATHS.home}
            aria-label="Depthly home"
            className="inline-flex min-h-11 items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            <Logo size={24} withWordmark />
          </Link>
          <nav aria-label="Landing page sections" className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="inline-flex min-h-11 items-center border-b-2 border-transparent pt-0.5 text-sm font-medium text-ink-secondary transition-colors hover:border-brand/70 hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Pricing stays one tap away on phones, even when full nav is hidden. */}
        <div className="flex min-w-0 items-center justify-end gap-2 md:gap-4">
          <a
            href="#pricing"
            className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand md:hidden"
          >
            Pricing
          </a>

          {/* Auth CTAs */}
          {user ? (
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                asChild
                size="sm"
                className="h-11"
                style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}
              >
                <Link to={PATHS.dashboard} state={{ fromAuth: true }}>
                  Go to app
                </Link>
              </Button>

              <Divider />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="User menu"
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full"
                    style={{
                      backgroundColor: avatarUrl ? undefined : avatarColor(displayName),
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
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      initial
                    )}
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" style={{ minWidth: 200 }}>
                  <DropdownMenuLabel
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: '#7A7890',
                      padding: '8px 8px 4px',
                    }}
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
                        background:
                          plan === 'free' ? 'rgba(122,120,144,0.15)' : 'rgba(75,158,255,0.15)',
                        color: plan === 'free' ? '#7A7890' : '#4B9EFF',
                      }}
                    >
                      {planLabel}
                    </span>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => navigate(PATHS.dashboard)}>
                    Home
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
                className="hidden min-h-11 items-center px-1 text-sm font-medium transition-colors min-[360px]:inline-flex"
                style={{ color: '#7A7890', textDecoration: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#E8E6F0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#7A7890'
                }}
              >
                Log in
              </Link>
              <Button
                asChild
                size="sm"
                className="h-11"
                style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}
              >
                <Link to={PATHS.signup}>Start free</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
