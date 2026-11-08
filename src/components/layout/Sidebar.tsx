import { useEffect, useState } from 'react'

import {
  BarChart2,
  CalendarDays,
  ChevronDown,
  Clock,
  CreditCard,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/shared/useMediaQuery'
import { usePlan } from '@/hooks/usePlan'
import { useTodayStats } from '@/hooks/useTodayStats'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { PATHS } from '@/routes/paths'
import { useUiStore, useAuthStore } from '@/store'

// ── Nav items ────────────────────────────────────────────────────────────────
interface NavItem {
  label: string
  path: string
  Icon: LucideIcon
  tour?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: PATHS.dashboard, Icon: LayoutDashboard, tour: 'home' },
  { label: 'Timer', path: PATHS.timer, Icon: Clock, tour: 'timer' },
  { label: 'Projects', path: PATHS.projects, Icon: FolderOpen, tour: 'projects' },
  { label: 'Planner', path: PATHS.planner, Icon: CalendarDays },
  { label: 'Sessions', path: PATHS.sessions, Icon: History, tour: 'sessions' },
  { label: 'Analytics', path: PATHS.analytics, Icon: BarChart2, tour: 'analytics' },
  { label: 'Groups', path: PATHS.groupLeaderboards, Icon: Users, tour: 'groups' },
]

// ── Collapsible text ─────────────────────────────────────────────────────────
// The branding wordmark, nav labels, bottom-action labels, and the user row's
// name/plan text used to be conditionally mounted (`{expanded && <span>...}`)
// or swapped between two entirely separate JSX blocks. React unmounts/mounts
// that content the instant `expanded` flips — well before the sidebar's own
// 200ms width transition finishes — so the text popped in/out abruptly while
// the container was still visibly animating around it. Keeping the text
// permanently mounted and collapsing it via max-width/opacity instead lets it
// shrink and fade in step with the container, instead of jumping.
function collapsibleTextStyle(expanded: boolean, maxWidth: number): React.CSSProperties {
  return {
    maxWidth: expanded ? maxWidth : 0,
    opacity: expanded ? 1 : 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    transition: 'max-width 200ms ease, opacity 150ms ease',
  }
}

// ── Toggle button ─────────────────────────────────────────────────────────────
function ToggleBtn({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors duration-150 hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
    >
      {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
    </button>
  )
}

// ── Sidebar tooltip ──────────────────────────────────────────────────────────
// During the width transition, nav rows move beneath the pointer without
// reliably firing pointer-leave events. An uncontrolled tooltip can therefore
// remain open while another row moves into the same pointer position, leaving
// several labels stacked over the page. Controlling each tooltip lets the
// sidebar close all of them for the duration of the transition.
interface SidebarTooltipProps {
  children: React.ReactElement
  enabled: boolean
  label: string
}

function SidebarTooltip({ children, enabled, label }: SidebarTooltipProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled) setOpen(false)
  }, [enabled])

  return (
    <Tooltip open={enabled && open} onOpenChange={(nextOpen) => setOpen(enabled && nextOpen)}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

// ── Bottom action row ────────────────────────────────────────────────────────
interface BottomActionProps {
  active?: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
  expanded: boolean
  tooltipsEnabled: boolean
  tour?: string
}

function BottomAction({
  active = false,
  icon,
  label,
  onClick,
  expanded,
  tooltipsEnabled,
  tour,
}: BottomActionProps) {
  const row = (
    <button
      type="button"
      data-tour={tour}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn('flex h-11 w-full shrink-0 items-center rounded-lg text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60', active ? 'bg-brand/15 text-brand' : 'text-text-muted hover:bg-surface-overlay hover:text-text')}
      style={{
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: expanded ? 10 : 0,
        paddingInline: expanded ? 12 : 0,
      }}
    >
      {icon}
      <span style={collapsibleTextStyle(expanded, 120)}>{label}</span>
    </button>
  )

  return (
    <SidebarTooltip enabled={tooltipsEnabled} label={label}>
      {row}
    </SidebarTooltip>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const user = useAuthStore((s) => s.user)
  const { plan } = usePlan()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { avatarUrl, displayName: profileDisplayName } = useTodayStats()

  // The icon-only "rail" collapse is a desktop-only affordance. On mobile,
  // sidebarOpen purely controls whether the (always full-width, always
  // fully-labeled) drawer is slid on/off screen — it never collapses to a
  // rail there. Coupling both behaviors to one boolean previously made the
  // sidebar's width and inner layout change at the same time as the mobile
  // slide transform, which is what made the open/close animation janky.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const expanded = isDesktop ? sidebarOpen : true
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const closeMobile = () => { if (!isDesktop && sidebarOpen) toggleSidebar() }
  const [tooltipsReady, setTooltipsReady] = useState(false)

  useEffect(() => {
    setTooltipsReady(false)
    if (expanded) return

    const timeoutId = window.setTimeout(() => setTooltipsReady(true), 200)
    return () => window.clearTimeout(timeoutId)
  }, [expanded])

  const tooltipsEnabled = !expanded && tooltipsReady

  const meta = user?.user_metadata as Record<string, string> | undefined
  const displayName =
    profileDisplayName ?? meta?.full_name ?? meta?.name ?? user?.email?.split('@')[0] ?? 'User'

  const planLabel =
    plan === 'pro' ? 'Pro plan' : plan === 'founding' ? 'Founding plan' : 'Free plan'

  const handleSignOut = () => {
    void supabase.auth.signOut()
  }

  const logoMark = (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" stroke="var(--color-text)" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="9" stroke="var(--color-text)" strokeWidth="1.25" opacity="0.45" />
      <circle cx="16" cy="16" r="4.5" stroke="var(--color-text)" strokeWidth="1.25" opacity="0.2" />
      <circle cx="16" cy="16" r="2" fill="var(--color-brand)" />
    </svg>
  )

  const avatar = <Avatar avatarUrl={avatarUrl} name={displayName} size={32} />

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 flex flex-col motion-reduce:[&_*]:!transition-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{
          width: expanded ? 240 : 64,
          background: 'var(--color-surface-raised)',
          borderRight: '1px solid var(--color-border)',
          transition: reducedMotion ? 'none' : 'width 200ms cubic-bezier(0.22,1,0.36,1), transform 200ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          className="relative flex h-[72px] shrink-0 items-center border-b border-border"
          style={{
            paddingInline: expanded ? 14 : 3,
            justifyContent: expanded ? 'space-between' : 'center',
            transition: 'padding 200ms ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: expanded ? 10 : 0,
              transition: 'gap 200ms ease',
            }}
          >
            {expanded && logoMark}
            <div style={collapsibleTextStyle(expanded, 150)}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  color: 'var(--color-text)',
                }}
              >
                Depthly
              </div>
            </div>
          </div>
          <ToggleBtn expanded={expanded} onClick={toggleSidebar} />
        </div>

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <nav aria-label="Primary navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
          {NAV_ITEMS.map(({ label, path, Icon, tour }, index) => {
            const link = (
              <NavLink to={path} end={path === PATHS.dashboard} data-tour={tour} aria-label={label} onClick={closeMobile} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60">
                {({ isActive }) => (
                  <div
                    className={cn(
                      'relative flex h-11 items-center rounded-lg transition-colors duration-150',
                      isActive
                        ? 'bg-brand/15 text-text'
                        : 'text-text-muted hover:bg-surface-overlay hover:text-text'
                    )}
                    style={{
                      justifyContent: expanded ? 'flex-start' : 'center',
                      gap: expanded ? 10 : 0,
                      paddingInline: expanded ? 12 : 0,
                    }}
                  >
                    <Icon size={18} className={isActive ? 'shrink-0 text-brand' : 'shrink-0 text-current'} />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        ...collapsibleTextStyle(expanded, 160),
                      }}
                    >
                      {label}
                    </span>
                    {isActive && expanded && <span aria-hidden="true" className="ml-auto size-1.5 shrink-0 rounded-full bg-brand" />}
                  </div>
                )}
              </NavLink>
            )

            return (
              <div key={label}>
                {(index === 0 || index === 4) && (
                  <div aria-hidden="true" className={cn('overflow-hidden text-xs text-text-muted', index === 4 && 'mt-5', expanded ? 'mb-2 px-3' : 'mb-2 border-t border-border')} style={{ height: expanded ? 20 : 1 }}>
                    {expanded ? (index === 0 ? 'Workspace' : 'Review & connect') : null}
                  </div>
                )}
                <SidebarTooltip enabled={tooltipsEnabled} label={label}>{link}</SidebarTooltip>
              </div>
            )
          })}
        </nav>

        <div className={cn("shrink-0 border-t border-border py-3", expanded ? "px-3" : "px-2")}>
          <BottomAction active={pathname === PATHS.billing} icon={<CreditCard size={18} />} label="Billing" onClick={() => { navigate(PATHS.billing); closeMobile() }} expanded={expanded} tooltipsEnabled={tooltipsEnabled} tour="billing" />
          <BottomAction active={pathname === PATHS.settings} icon={<Settings size={18} />} label="Settings" onClick={() => { navigate(PATHS.settings); closeMobile() }} expanded={expanded} tooltipsEnabled={tooltipsEnabled} tour="settings" />
          <div className="mt-3 border-t border-border pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={`${displayName} — Account menu`} className={cn("flex w-full items-center rounded-xl text-left transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60", expanded ? "min-h-16 gap-3 bg-surface-overlay px-2" : "h-12 justify-center p-0")}>
                  <span className="shrink-0">{avatar}</span>
                  <span className="min-w-0" style={{ ...collapsibleTextStyle(expanded, 140), display: expanded ? undefined : 'none' }}>
                    <span className="block truncate text-sm font-semibold text-text">{displayName}</span>
                    <span className="block text-xs text-text-muted">{planLabel}</span>
                  </span>
                  {expanded && <ChevronDown size={16} className="ml-auto shrink-0 text-text-muted" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isDesktop ? 'right' : 'top'} align="end" className="w-56">
                <DropdownMenuLabel className="break-all text-xs text-text-muted">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { navigate(PATHS.settings); closeMobile() }}><Settings size={16} className="mr-2" />Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}><LogOut size={16} className="mr-2" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
