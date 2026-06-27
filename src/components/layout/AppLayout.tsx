import { Outlet } from 'react-router-dom'

import { useAuth } from '@/hooks/shared/useAuth'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils/cn'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  useAuth()

  const { sidebarOpen, toggleSidebar } = useUiStore()

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--color-surface-base)' }}>
      {/* Mobile backdrop — tapping closes sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <Sidebar />

      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-200',
          // On mobile: no margin (sidebar overlays). On md+: offset by sidebar width.
          sidebarOpen ? 'md:ml-60' : 'md:ml-16'
        )}
      >
        <Topbar />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
