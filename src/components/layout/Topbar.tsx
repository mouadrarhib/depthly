import { useState } from 'react'

import { CheckCircle, CircleHelp, Clock, Flame, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { clearOnboardingTourSeen, runOnboardingTour } from '@/hooks/useOnboardingTour'
import { usePlan } from '@/hooks/usePlan'
import { clearProjectsTourSeen, runProjectsTour } from '@/hooks/useProjectsTour'
import { useTodayStats } from '@/hooks/useTodayStats'
import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
import { useAuthStore, useUiStore } from '@/store'

function fmtFocus(mins: number): string {
  if (mins === 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const Divider = () => (
  <span
    style={{ width: 0.5, height: 16, background: '#2E2E38', flexShrink: 0, display: 'block' }}
  />
)

const PAGE_TITLES: Record<string, string> = {
  [PATHS.dashboard]: 'Home',
  [PATHS.timer]: 'Timer',
  [PATHS.projects]: 'Projects',
  [PATHS.sessions]: 'Sessions',
  [PATHS.analytics]: 'Analytics',
  [PATHS.leaderboard]: 'Leaderboard',
  [PATHS.billing]: 'Billing',
  [PATHS.settings]: 'Settings',
}

// ── Help button (opens onboarding-tour replay menu) ─────────────────────────
function HelpButton({
  onReplayTour,
  onReplayProjectsTour,
}: {
  onReplayTour: () => void
  onReplayProjectsTour?: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Help"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: hovered ? '#222228' : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 150ms',
          }}
        >
          <CircleHelp size={18} style={{ color: hovered ? '#E8E6F0' : '#7A7890' }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" style={{ minWidth: 192 }}>
        <DropdownMenuItem onClick={onReplayTour}>Quick guide</DropdownMenuItem>
        {onReplayProjectsTour ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onReplayProjectsTour}>Projects guide</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar() {
  const user = useAuthStore((s) => s.user)
  const userId = useAuthStore((s) => s.user?.id)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isProjectsPage = pathname === PATHS.projects
  const pageTitle =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith(`${PATHS.projects}/`) ? 'Project details' : 'Depthly')

  const { streak, focusMinutes, sessions, avatarUrl, displayName } = useTodayStats()
  const { plan } = usePlan()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleReplayTour = () => {
    if (!userId) return
    clearOnboardingTourSeen(userId)
    void runOnboardingTour(userId)
  }

  const handleReplayProjectsTour = () => {
    if (!userId) return
    clearProjectsTourSeen(userId)
    const hasVisibleProjects = document.querySelector('[data-project-tour="project-card"]') !== null
    void runProjectsTour(userId, hasVisibleProjects)
  }

  const name = displayName ?? user?.email?.split('@')[0] ?? '?'

  const planLabel = plan === 'pro' ? 'Pro' : plan === 'founding' ? 'Founding' : 'Free'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-3 sm:px-5">
      {/* Hamburger — mobile only; desktop uses sidebar's own collapse arrow */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex size-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 md:hidden"
        aria-label="Toggle navigation"
      >
        <Menu size={18} />
      </button>

      <div className="hidden min-w-0 items-center gap-3 md:flex">
        <span className="text-sm font-semibold tracking-tight text-text">{pageTitle}</span>
        <span className="hidden h-4 w-px bg-border lg:block" aria-hidden="true" />
        <span className="hidden text-xs text-text-muted lg:block">Your focused workspace</span>
      </div>

      {/* Right-side: stats + avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Today's stats — streak / focus time / sessions */}
        <div data-tour="today-stats" className="flex items-center gap-2 sm:gap-3">
          {/* Streak */}
          {streak > 0 ? (
            <span className="flex items-center">
              <StreakBadge
                days={streak}
                showLabel={false}
                className="h-8 rounded-lg px-1.5 sm:px-2"
              />
              <span className="hidden text-[11px] text-text-muted xl:inline">streak</span>
            </span>
          ) : (
            <span
              aria-label="No active streak"
              className="flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-text-muted sm:px-2"
            >
              <Flame size={14} />
              <span className="font-data text-[13px] leading-none">0</span>
              <span className="hidden text-[11px] xl:inline">streak</span>
            </span>
          )}

          <Divider />

          {/* Focus time today */}
          <span
            aria-label={`${fmtFocus(focusMinutes)} focused today`}
            className="flex h-8 items-center gap-1.5 rounded-lg px-1.5 sm:px-2"
          >
            <Clock size={14} style={{ color: '#4B9EFF', flexShrink: 0 }} />
            <span className="font-data" style={{ fontSize: 13, color: '#4B9EFF', lineHeight: 1 }}>
              {fmtFocus(focusMinutes)}
            </span>
            <span className="hidden text-[11px] text-text-muted xl:inline">focus</span>
          </span>

          <Divider />

          {/* Sessions today */}
          <span
            aria-label={`${sessions} sessions today`}
            className="hidden h-8 items-center gap-1.5 rounded-lg px-1.5 sm:flex sm:px-2"
          >
            <CheckCircle size={14} style={{ color: '#3DD68C', flexShrink: 0 }} />
            <span className="font-data" style={{ fontSize: 13, color: '#3DD68C', lineHeight: 1 }}>
              {sessions}
            </span>
            <span className="hidden text-[11px] text-text-muted xl:inline">sessions</span>
          </span>
        </div>

        <Divider />

        {/* Help — replay onboarding tour */}
        <HelpButton
          onReplayTour={handleReplayTour}
          onReplayProjectsTour={isProjectsPage ? handleReplayProjectsTour : undefined}
        />

        {/* Avatar → dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <Avatar avatarUrl={avatarUrl} name={name} size={26} fontSize={10} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" style={{ minWidth: 192 }}>
            {/* Email */}
            <DropdownMenuLabel
              style={{ fontSize: 12, fontWeight: 400, color: '#7A7890', padding: '8px 8px 4px' }}
            >
              {user?.email}
            </DropdownMenuLabel>

            {/* Plan badge */}
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

            <DropdownMenuItem onClick={() => navigate(PATHS.settings)}>Settings</DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleSignOut} style={{ color: '#E07878' }}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
