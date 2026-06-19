import { NavLink } from 'react-router-dom'

import { useUiStore } from '@/store'
import { PATHS } from '@/routes/paths'
import { cn } from '@/lib/utils/cn'
import { Logo } from '@/components/ui'

// ── Nav items — Depthly's domains. Uncomment as you build each page. ────────
const NAV_ITEMS = [
  { label: 'Timer',    path: PATHS.home,     icon: '◷' },
  { label: 'Settings', path: PATHS.settings, icon: '⚙' },
  // { label: 'Projects',    path: PATHS.projects,    icon: '◈' },
  // { label: 'Tasks',       path: PATHS.tasks,       icon: '☰' },
  // { label: 'Analytics',   path: PATHS.analytics,   icon: '▦' },
  // { label: 'Goals',       path: PATHS.goals,       icon: '◎' },
  // { label: 'Leaderboard', path: PATHS.leaderboard, icon: '▲' },
] as const

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-20 flex flex-col border-r border-border bg-surface-raised',
        'transition-all duration-200',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Logo size={22} withWordmark={sidebarOpen} />
        <button
          onClick={toggleSidebar}
          className="rounded p-1 text-text-faint hover:bg-surface-overlay hover:text-text"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <NavLink
            key={path}
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
            <span className="text-base">{icon}</span>
            {sidebarOpen ? <span>{label}</span> : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
