import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Clock, FolderOpen, Settings } from 'lucide-react'

import { useUiStore } from '@/store'
import { PATHS } from '@/routes/paths'
import { cn } from '@/lib/utils/cn'
import { Logo } from '@/components/ui'

interface NavItem {
  label: string
  path:  string
  icon:  ReactNode
}

// ── Nav items — Depthly's domains. Uncomment as you build each page. ────────
const NAV_ITEMS: NavItem[] = [
  { label: 'Timer',    path: PATHS.home,     icon: <Clock size={18} /> },
  { label: 'Projects', path: PATHS.projects, icon: <FolderOpen size={18} /> },
  { label: 'Settings', path: PATHS.settings, icon: <Settings size={18} /> },
  // { label: 'Analytics',   path: PATHS.analytics,   icon: <BarChart2 size={18} /> },
  // { label: 'Goals',       path: PATHS.goals,       icon: <Target size={18} /> },
  // { label: 'Leaderboard', path: PATHS.leaderboard, icon: <Trophy size={18} /> },
]

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-20 flex flex-col border-r border-border bg-surface-raised',
        'transition-all duration-200',
        sidebarOpen
          ? 'w-60 translate-x-0'
          : 'w-60 -translate-x-full md:translate-x-0 md:w-16'
      )}
    >
      {/* Logo + collapse toggle — collapse arrow only on desktop */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Logo size={22} withWordmark={sidebarOpen} />
        <button
          onClick={toggleSidebar}
          className="hidden rounded p-1 text-text-faint hover:bg-surface-overlay hover:text-text md:flex"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <NavLink
            key={label}
            to={path}
            end={path === PATHS.home}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-brand/10 text-brand font-medium'
                  : 'text-text-muted hover:bg-surface-overlay hover:text-text'
              )
            }
          >
            {icon}
            {sidebarOpen ? <span>{label}</span> : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
