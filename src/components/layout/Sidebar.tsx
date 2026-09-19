import { useEffect, useState } from 'react'

import {
  BarChart2,
  Clock,
  CreditCard,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/shared/useMediaQuery'
import { usePendingFriendRequestsCount } from '@/hooks/useLeaderboard'
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
  { label: 'Sessions', path: PATHS.sessions, Icon: History, tour: 'sessions' },
  { label: 'Analytics', path: PATHS.analytics, Icon: BarChart2, tour: 'analytics' },
  { label: 'Leaderboard', path: PATHS.leaderboard, Icon: Trophy, tour: 'leaderboard' },
  { label: 'Billing', path: PATHS.billing, Icon: CreditCard, tour: 'billing' },
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
      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-faint transition-colors duration-150 hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
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
  icon: React.ReactNode
  label: string
  onClick: () => void
  expanded: boolean
  tooltipsEnabled: boolean
  tour?: string
}

function BottomAction({
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
      onClick={onClick}
      className="flex h-9 w-full items-center rounded-lg text-[13px] text-text-muted transition-colors duration-150 hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
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
  const { avatarUrl, displayName: profileDisplayName } = useTodayStats()
  const { data: pendingRequestsCount } = usePendingFriendRequestsCount()

  // The icon-only "rail" collapse is a desktop-only affordance. On mobile,
  // sidebarOpen purely controls whether the (always full-width, always
  // fully-labeled) drawer is slid on/off screen — it never collapses to a
  // rail there. Coupling both behaviors to one boolean previously made the
  // sidebar's width and inner layout change at the same time as the mobile
  // slide transform, which is what made the open/close animation janky.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const expanded = isDesktop ? sidebarOpen : true
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
      <circle cx="16" cy="16" r="14" stroke="#E8E6F0" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="9" stroke="#E8E6F0" strokeWidth="1.25" opacity="0.45" />
      <circle cx="16" cy="16" r="4.5" stroke="#E8E6F0" strokeWidth="1.25" opacity="0.2" />
      <circle cx="16" cy="16" r="2" fill="#4B9EFF" />
    </svg>
  )

  const avatar = <Avatar avatarUrl={avatarUrl} name={displayName} size={32} />

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{
          width: expanded ? 240 : 64,
          background: '#141417',
          borderRight: '1px solid #2E2E38',
          transition: 'width 200ms ease, transform 200ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex h-14 shrink-0 items-center border-b border-border"
          style={{
            paddingInline: expanded ? 14 : 3,
            justifyContent: expanded ? 'space-between' : 'flex-start',
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
            {logoMark}
            <div style={collapsibleTextStyle(expanded, 150)}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  color: '#E8E6F0',
                }}
              >
                Depthly
              </div>
            </div>
          </div>
          <ToggleBtn expanded={expanded} onClick={toggleSidebar} />
        </div>

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 px-2 py-3">
          {NAV_ITEMS.map(({ label, path, Icon, tour }) => {
            const link = (
              <NavLink to={path} end={path === PATHS.dashboard} data-tour={tour}>
                {({ isActive }) => (
                  <div
                    className={cn(
                      'flex h-10 items-center rounded-lg transition-colors duration-150',
                      isActive
                        ? 'bg-brand/15 text-text shadow-[inset_0_0_0_1px_rgba(75,158,255,0.14)]'
                        : 'text-text-muted hover:bg-surface-overlay hover:text-text'
                    )}
                    style={{
                      justifyContent: expanded ? 'flex-start' : 'center',
                      gap: expanded ? 10 : 0,
                      paddingInline: expanded ? 12 : 0,
                    }}
                  >
                    {label === 'Leaderboard' &&
                    !!pendingRequestsCount &&
                    pendingRequestsCount > 0 ? (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Icon size={18} className={isActive ? 'text-brand' : 'text-current'} />
                        <span
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            minWidth: 16,
                            height: 16,
                            padding: pendingRequestsCount > 9 ? '0 3px' : 0,
                            borderRadius: 9999,
                            background: '#F25C5C',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 600,
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                        </span>
                      </div>
                    ) : (
                      <Icon
                        size={18}
                        className={isActive ? 'shrink-0 text-brand' : 'shrink-0 text-current'}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        ...collapsibleTextStyle(expanded, 160),
                      }}
                    >
                      {label}
                    </span>
                  </div>
                )}
              </NavLink>
            )

            return (
              <SidebarTooltip key={label} enabled={tooltipsEnabled} label={label}>
                {link}
              </SidebarTooltip>
            )
          })}
        </nav>

        {/* ── Bottom ─────────────────────────────────────────────────── */}
        <div className="border-t border-border px-2 py-3">
          {/* User row — one persistent block; text collapses via
              collapsibleTextStyle instead of the row being swapped out. */}
          <SidebarTooltip enabled={tooltipsEnabled} label={`${displayName} — Settings`}>
            <button
              type="button"
              onClick={() => navigate(PATHS.settings)}
              className="mb-2 flex h-11 w-full items-center rounded-lg transition-colors duration-150 hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              style={{
                justifyContent: expanded ? 'flex-start' : 'center',
                gap: expanded ? 10 : 0,
                paddingInline: expanded ? 10 : 0,
              }}
            >
              {avatar}
              <div style={{ minWidth: 0, ...collapsibleTextStyle(expanded, 150) }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#E8E6F0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </div>
                <div style={{ fontSize: 11, color: '#7A7890' }}>{planLabel}</div>
              </div>
            </button>
          </SidebarTooltip>

          <BottomAction
            icon={<Settings size={15} />}
            label="Settings"
            onClick={() => navigate(PATHS.settings)}
            expanded={expanded}
            tooltipsEnabled={tooltipsEnabled}
            tour="settings"
          />

          <BottomAction
            icon={<LogOut size={15} />}
            label="Sign out"
            onClick={handleSignOut}
            expanded={expanded}
            tooltipsEnabled={tooltipsEnabled}
          />
        </div>
      </aside>
    </TooltipProvider>
  )
}
