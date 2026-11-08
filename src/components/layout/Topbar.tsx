import { Check, CheckCircle, CircleHelp, Clock, Flame, Menu, Monitor, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { clearOnboardingTourSeen, runOnboardingTour } from '@/hooks/useOnboardingTour'
import { clearProjectsTourSeen, runProjectsTour } from '@/hooks/useProjectsTour'
import { useTodayStats } from '@/hooks/useTodayStats'
import type { ThemePreference } from '@/lib/theme'
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
    aria-hidden="true"
    className="hidden sm:block"
    style={{ width: 1, height: 16, background: 'var(--color-border)', flexShrink: 0 }}
  />
)

const PAGE_TITLES: Record<string, string> = {
  [PATHS.dashboard]: 'Home',
  [PATHS.timer]: 'Timer',
  [PATHS.projects]: 'Projects',
  [PATHS.planner]: 'Planner',
  [PATHS.sessions]: 'Sessions',
  [PATHS.analytics]: 'Analytics',
  [PATHS.groupLeaderboards]: 'Groups',
  [PATHS.billing]: 'Billing',
  [PATHS.settings]: 'Settings',
}

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

function ThemeButton() {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const current = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[2]
  const Icon = current.Icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change theme, current: ${current.label}`}
          title={`Theme: ${current.label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <Icon size={18} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {THEME_OPTIONS.map(({ value, label, Icon: OptionIcon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="min-h-11 gap-2.5" aria-label={`${label} theme${theme === value ? ', selected' : ''}`}>
            <OptionIcon size={16} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {theme === value && <Check size={15} className="text-brand" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Help button (opens onboarding-tour replay menu) ─────────────────────────
function HelpButton({
  onReplayTour,
  onReplayProjectsTour,
}: {
  onReplayTour: () => void
  onReplayProjectsTour?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Help"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <CircleHelp size={18} />
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
  const userId = useAuthStore((s) => s.user?.id)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const { pathname } = useLocation()
  const isProjectsPage = pathname === PATHS.projects
  const pageTitle =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith(`${PATHS.projects}/`) ? 'Project details' : pathname.startsWith(`${PATHS.groupLeaderboards}/`) ? 'Group details' : 'Depthly')

  const { streak, focusMinutes, sessions } = useTodayStats()

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

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-surface-base px-2 sm:px-6">
      {/* Hamburger — mobile only; desktop uses sidebar's own collapse arrow */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 md:hidden"
        aria-label="Toggle navigation" aria-expanded={sidebarOpen}
      >
        <Menu size={18} />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm font-semibold tracking-tight text-text">{pageTitle}</span>
        <span className="hidden h-4 w-px bg-border lg:block" aria-hidden="true" />
        <span className="hidden text-xs text-text-muted lg:block">Your workspace</span>
      </div>

      {/* Today’s statistics and help */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {/* Today's stats — streak / focus time / sessions */}
        <div data-tour="today-stats" className="flex items-center gap-3 sm:gap-4">
          {/* Streak */}
          {streak > 0 ? (
            <span className="hidden h-9 shrink-0 items-center gap-2 whitespace-nowrap sm:flex">
              <StreakBadge
                days={streak}
                showLabel={false}
                className="h-9 shrink-0 !animate-none rounded-lg !bg-transparent !px-0 !py-0 [&>span]:text-sm [&>svg]:size-4 motion-reduce:animate-none"
              />
              <span className="hidden text-xs text-text-muted xl:inline">day streak</span>
            </span>
          ) : (
            <span
              aria-label="No active streak"
              className="hidden h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-1.5 text-text-muted sm:flex sm:px-2"
            >
              <Flame size={16} />
              <span className="font-data text-[13px] leading-none">0</span>
              <span className="hidden text-xs xl:inline">day streak</span>
            </span>
          )}

          <Divider />

          {/* Focus time today */}
          <span
            aria-label={`${fmtFocus(focusMinutes)} focused today`}
            className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-1.5 sm:px-2"
          >
            <Clock size={16} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
            <span className="font-data" style={{ fontSize: 14, color: 'var(--color-brand)', lineHeight: 1 }}>
              {fmtFocus(focusMinutes)}
            </span>
            <span className="hidden text-xs text-text-muted xl:inline">focus today</span>
          </span>

          <Divider />

          {/* Sessions today */}
          <span
            aria-label={`${sessions} sessions today`}
            className="hidden h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-1.5 sm:flex sm:px-2"
          >
            <CheckCircle size={16} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
            <span className="font-data" style={{ fontSize: 14, color: 'var(--color-brand)', lineHeight: 1 }}>
              {sessions}
            </span>
            <span className="hidden text-xs text-text-muted xl:inline">{sessions === 1 ? 'session' : 'sessions'}</span>
          </span>
        </div>

        <Divider />

        <ThemeButton />

        {/* Help — replay onboarding tour */}
        <HelpButton
          onReplayTour={handleReplayTour}
          onReplayProjectsTour={isProjectsPage ? handleReplayProjectsTour : undefined}
        />

      </div>
    </header>
  )
}
