import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, Clock, CreditCard, FolderOpen, History,
  LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen,
  Settings, Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useUiStore, useAuthStore } from '@/store'
import { usePlan } from '@/hooks/usePlan'
import { useTodayStats } from '@/hooks/useTodayStats'
import { useMediaQuery } from '@/hooks/shared/useMediaQuery'
import { usePendingFriendRequestsCount } from '@/hooks/useLeaderboard'
import { PATHS } from '@/routes/paths'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/Avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ── Nav items ────────────────────────────────────────────────────────────────
interface NavItem { label: string; path: string; Icon: LucideIcon; tour?: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',        path: PATHS.dashboard,   Icon: LayoutDashboard, tour: 'home'        },
  { label: 'Timer',       path: PATHS.timer,       Icon: Clock,          tour: 'timer'       },
  { label: 'Projects',    path: PATHS.projects,    Icon: FolderOpen,     tour: 'projects'    },
  { label: 'Sessions',    path: PATHS.sessions,    Icon: History,        tour: 'sessions'    },
  { label: 'Analytics',   path: PATHS.analytics,   Icon: BarChart2,      tour: 'analytics'   },
  { label: 'Leaderboard', path: PATHS.leaderboard, Icon: Trophy,         tour: 'leaderboard' },
  { label: 'Billing',     path: PATHS.billing,     Icon: CreditCard,     tour: 'billing'     },
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
    maxWidth:   expanded ? maxWidth : 0,
    opacity:    expanded ? 1 : 0,
    overflow:   'hidden',
    whiteSpace: 'nowrap',
    transition: 'max-width 200ms ease, opacity 150ms ease',
  }
}

// ── Toggle button ─────────────────────────────────────────────────────────────
function ToggleBtn({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      'transparent',
        border:          'none',
        padding:         4,
        borderRadius:    6,
        cursor:          'pointer',
        color:           '#3D3B4E',
        flexShrink:      0,
        transition:      'color 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#E8E6F0')}
      onMouseLeave={e => (e.currentTarget.style.color = '#3D3B4E')}
    >
      {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
    </button>
  )
}

// ── Bottom action row ────────────────────────────────────────────────────────
interface BottomActionProps {
  icon:     React.ReactNode
  label:    string
  onClick:  () => void
  expanded: boolean
  tour?:    string
}

function BottomAction({ icon, label, onClick, expanded, tour }: BottomActionProps) {
  const row = (
    <div
      role="button"
      tabIndex={0}
      data-tour={tour}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  expanded ? 'flex-start' : 'center',
        gap:             expanded ? 8 : 0,
        padding:         expanded ? '8px 12px' : '8px 0',
        borderRadius:    8,
        cursor:          'pointer',
        color:           '#7A7890',
        fontSize:        13,
        transition:      'color 150ms',
      }}
    >
      {icon}
      <span style={collapsibleTextStyle(expanded, 120)}>{label}</span>
    </div>
  )

  // Tooltip/TooltipTrigger stay mounted in both states (stable structure —
  // no remount on toggle); only the content itself is conditional, since
  // it'd be redundant next to the now-always-visible label above.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      {!expanded && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const user                           = useAuthStore(s => s.user)
  const { plan }                       = usePlan()
  const navigate                       = useNavigate()
  const { avatarUrl, displayName: profileDisplayName } = useTodayStats()
  const { data: pendingRequestsCount } = usePendingFriendRequestsCount()

  // The icon-only "rail" collapse is a desktop-only affordance. On mobile,
  // sidebarOpen purely controls whether the (always full-width, always
  // fully-labeled) drawer is slid on/off screen — it never collapses to a
  // rail there. Coupling both behaviors to one boolean previously made the
  // sidebar's width and inner layout change at the same time as the mobile
  // slide transform, which is what made the open/close animation janky.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const expanded  = isDesktop ? sidebarOpen : true

  const meta        = user?.user_metadata as Record<string, string> | undefined
  const displayName = profileDisplayName ?? meta?.full_name ?? meta?.name ?? user?.email?.split('@')[0] ?? 'User'

  const planLabel =
    plan === 'pro'      ? '⚡ Pro'      :
    plan === 'founding' ? '⭐ Founding' :
    'Free plan'

  const handleSignOut = () => { void supabase.auth.signOut() }

  const logoMark = (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="16" cy="16" r="14"  stroke="#E8E6F0" strokeWidth="1.25"/>
      <circle cx="16" cy="16" r="9"   stroke="#E8E6F0" strokeWidth="1.25" opacity="0.45"/>
      <circle cx="16" cy="16" r="4.5" stroke="#E8E6F0" strokeWidth="1.25" opacity="0.2"/>
      <circle cx="16" cy="16" r="2"   fill="#4B9EFF"/>
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
          width:       expanded ? 240 : 60,
          background:  '#141417',
          borderRight: '1px solid #2E2E38',
          transition:  'width 200ms ease, transform 200ms ease',
          overflow:    'hidden',
        }}
      >
        {/* ── Branding ───────────────────────────────────────────────── */}
        {/* One persistent block instead of two conditionally-swapped ones —
            React no longer unmounts/remounts the header on every toggle.
            flexDirection still flips discretely (row ↔ column, unavoidable —
            there's no room for the logo, wordmark, and toggle button side by
            side in a 60px rail), but the wordmark/tagline text itself now
            shrinks and fades via collapsibleTextStyle instead of popping. */}
        <div
          style={{
            padding:        expanded ? '20px 16px 16px' : '16px 0',
            borderBottom:   '1px solid #2E2E38',
            display:        'flex',
            flexDirection:  expanded ? 'row' : 'column',
            alignItems:     expanded ? 'flex-start' : 'center',
            justifyContent: expanded ? 'space-between' : 'flex-start',
            gap:            expanded ? 0 : 8,
            transition:     'padding 200ms ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: expanded ? 10 : 0, transition: 'gap 200ms ease' }}>
            {logoMark}
            <div style={collapsibleTextStyle(expanded, 150)}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.03em', color: '#E8E6F0' }}>
                Depthly
              </div>
              <div style={{ fontSize: 11, color: '#7A7890', marginTop: 1 }}>
                Stay focused, work deeper
              </div>
            </div>
          </div>
          <ToggleBtn expanded={expanded} onClick={toggleSidebar} />
        </div>

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ label, path, Icon, tour }) => {
            const link = (
              <NavLink to={path} end={path === PATHS.dashboard} data-tour={tour}>
                {({ isActive }) => (
                  <div
                    style={{
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  expanded ? 'flex-start' : 'center',
                      gap:             expanded ? 10 : 0,
                      padding:         expanded ? '10px 12px' : '10px 0',
                      borderRadius:    8,
                      cursor:          'pointer',
                      background:      isActive ? 'rgba(75,158,255,0.12)' : 'transparent',
                      borderLeft:      isActive ? '2px solid #4B9EFF' : '2px solid transparent',
                      transition:      'all 150ms',
                    }}
                  >
                    {label === 'Leaderboard' && !!pendingRequestsCount && pendingRequestsCount > 0 ? (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Icon
                          size={18}
                          style={{ color: isActive ? '#4B9EFF' : '#7A7890', flexShrink: 0, minWidth: 18 }}
                        />
                        <span
                          style={{
                            position:       'absolute',
                            top:            -4,
                            right:          -4,
                            minWidth:       16,
                            height:         16,
                            padding:        pendingRequestsCount > 9 ? '0 3px' : 0,
                            borderRadius:   9999,
                            background:     '#F25C5C',
                            color:          '#fff',
                            fontSize:       10,
                            fontWeight:     600,
                            lineHeight:     1,
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                          }}
                        >
                          {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                        </span>
                      </div>
                    ) : (
                      <Icon
                        size={18}
                        style={{ color: isActive ? '#4B9EFF' : '#7A7890', flexShrink: 0, minWidth: 18 }}
                      />
                    )}
                    <span
                      style={{
                        fontSize:   14,
                        fontWeight: isActive ? 500 : 400,
                        color:      isActive ? '#E8E6F0' : '#7A7890',
                        ...collapsibleTextStyle(expanded, 160),
                      }}
                    >
                      {label}
                    </span>
                  </div>
                )}
              </NavLink>
            )

            // Tooltip/TooltipTrigger stay mounted in both states (stable
            // structure — no remount on toggle); only the content itself is
            // conditional, since it'd be redundant next to the now-always-
            // visible label above.
            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                {!expanded && <TooltipContent side="right">{label}</TooltipContent>}
              </Tooltip>
            )
          })}
        </nav>

        {/* ── Bottom ─────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #2E2E38', padding: '12px 8px' }}>
          {/* User row — one persistent block; text collapses via
              collapsibleTextStyle instead of the row being swapped out. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(PATHS.settings)}
                onKeyDown={e => e.key === 'Enter' && navigate(PATHS.settings)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  gap:            expanded ? 10 : 0,
                  padding:        expanded ? '8px 12px' : '8px 0',
                  borderRadius:   8,
                  marginBottom:   4,
                  cursor:         'pointer',
                  transition:     'gap 200ms ease, padding 200ms ease',
                }}
              >
                {avatar}
                <div style={{ minWidth: 0, ...collapsibleTextStyle(expanded, 150) }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#E8E6F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 11, color: '#7A7890' }}>{planLabel}</div>
                </div>
              </div>
            </TooltipTrigger>
            {!expanded && <TooltipContent side="right">{displayName} — Settings</TooltipContent>}
          </Tooltip>

          <BottomAction
            icon={<Settings size={15} />}
            label="Settings"
            onClick={() => navigate(PATHS.settings)}
            expanded={expanded}
            tour="settings"
          />

          <BottomAction
            icon={<LogOut size={15} />}
            label="Sign out"
            onClick={handleSignOut}
            expanded={expanded}
          />
        </div>
      </aside>
    </TooltipProvider>
  )
}
