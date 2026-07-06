import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, Clock, FolderOpen, History,
  LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen,
  Settings, Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useUiStore, useAuthStore } from '@/store'
import { usePlan } from '@/hooks/usePlan'
import { PATHS } from '@/routes/paths'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ── Avatar color helper ──────────────────────────────────────────────────────
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

// ── Nav items ────────────────────────────────────────────────────────────────
interface NavItem { label: string; path: string; Icon: LucideIcon }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   path: PATHS.dashboard,   Icon: LayoutDashboard },
  { label: 'Timer',       path: PATHS.timer,       Icon: Clock           },
  { label: 'Projects',    path: PATHS.projects,    Icon: FolderOpen      },
  { label: 'Sessions',    path: PATHS.sessions,    Icon: History         },
  { label: 'Analytics',   path: PATHS.analytics,   Icon: BarChart2       },
  { label: 'Leaderboard', path: PATHS.leaderboard, Icon: Trophy          },
]

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
}

function BottomAction({ icon, label, onClick, expanded }: BottomActionProps) {
  const row = (
    <div
      role="button"
      tabIndex={0}
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
      {expanded && <span>{label}</span>}
    </div>
  )

  if (expanded) return row

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const user                           = useAuthStore(s => s.user)
  const { plan }                       = usePlan()
  const navigate                       = useNavigate()

  const meta        = user?.user_metadata as Record<string, string> | undefined
  const displayName = meta?.full_name ?? meta?.name ?? user?.email?.split('@')[0] ?? 'User'

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

  const avatar = (
    <div
      style={{
        width:          32,
        height:         32,
        borderRadius:   '50%',
        background:     getAvatarColor(displayName),
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       13,
        fontWeight:     600,
        color:          'white',
        flexShrink:     0,
      }}
    >
      {displayName[0]?.toUpperCase() ?? '?'}
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{
          width:       sidebarOpen ? 240 : 60,
          background:  '#141417',
          borderRight: '1px solid #2E2E38',
          transition:  'width 200ms ease, transform 200ms ease',
          overflow:    'hidden',
        }}
      >
        {/* ── Branding ───────────────────────────────────────────────── */}
        {sidebarOpen ? (
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #2E2E38' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {logoMark}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.03em', color: '#E8E6F0' }}>
                    Depthly
                  </div>
                  <div style={{ fontSize: 11, color: '#7A7890', marginTop: 1 }}>
                    Stay focused, work deeper
                  </div>
                </div>
              </div>
              <ToggleBtn expanded onClick={toggleSidebar} />
            </div>
          </div>
        ) : (
          <div
            style={{
              padding:         '16px 0',
              borderBottom:    '1px solid #2E2E38',
              display:         'flex',
              flexDirection:   'column',
              alignItems:      'center',
              gap:             8,
            }}
          >
            {logoMark}
            <ToggleBtn expanded={false} onClick={toggleSidebar} />
          </div>
        )}

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ label, path, Icon }) => {
            const link = (
              <NavLink key={label} to={path} end={path === PATHS.dashboard}>
                {({ isActive }) => (
                  <div
                    style={{
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  sidebarOpen ? 'flex-start' : 'center',
                      gap:             sidebarOpen ? 10 : 0,
                      padding:         sidebarOpen ? '10px 12px' : '10px 0',
                      borderRadius:    8,
                      cursor:          'pointer',
                      background:      isActive ? 'rgba(75,158,255,0.12)' : 'transparent',
                      borderLeft:      isActive ? '2px solid #4B9EFF' : '2px solid transparent',
                      transition:      'all 150ms',
                    }}
                  >
                    <Icon
                      size={18}
                      style={{ color: isActive ? '#4B9EFF' : '#7A7890', flexShrink: 0, minWidth: 18 }}
                    />
                    {sidebarOpen && (
                      <span style={{ fontSize: 14, fontWeight: isActive ? 500 : 400, color: isActive ? '#E8E6F0' : '#7A7890' }}>
                        {label}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            )

            if (sidebarOpen) return link

            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* ── Bottom ─────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #2E2E38', padding: '12px 8px' }}>
          {/* User row */}
          {sidebarOpen ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(PATHS.settings)}
              onKeyDown={e => e.key === 'Enter' && navigate(PATHS.settings)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                padding:      '8px 12px',
                borderRadius: 8,
                marginBottom: 4,
                cursor:       'pointer',
              }}
            >
              {avatar}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#E8E6F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 11, color: '#7A7890' }}>{planLabel}</div>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(PATHS.settings)}
                  onKeyDown={e => e.key === 'Enter' && navigate(PATHS.settings)}
                  style={{
                    display:         'flex',
                    justifyContent:  'center',
                    padding:         '8px 0',
                    borderRadius:    8,
                    marginBottom:    4,
                    cursor:          'pointer',
                  }}
                >
                  {avatar}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{displayName} — Settings</TooltipContent>
            </Tooltip>
          )}

          <BottomAction
            icon={<Settings size={15} />}
            label="Settings"
            onClick={() => navigate(PATHS.settings)}
            expanded={sidebarOpen}
          />

          <BottomAction
            icon={<LogOut size={15} />}
            label="Sign out"
            onClick={handleSignOut}
            expanded={sidebarOpen}
          />
        </div>
      </aside>
    </TooltipProvider>
  )
}
