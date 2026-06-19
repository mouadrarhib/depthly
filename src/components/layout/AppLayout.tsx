import { Outlet } from 'react-router-dom'

import { useAuth } from '@/hooks/shared/useAuth'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils/cn'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/**
 * The shell wrapping all authenticated pages.
 * Structure: fixed sidebar + scrollable main content area.
 *
 * <Outlet /> renders the matched child route (e.g. HomePage, ProjectsPage).
 * useAuth() is called here so auth state is synced for all protected pages.
 */
export function AppLayout() {
  useAuth() // syncs Supabase session → authStore on mount

  const sidebarOpen = useUiStore((s) => s.sidebarOpen)

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-base">
      <Sidebar />

      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-200',
          sidebarOpen ? 'ml-60' : 'ml-16'
        )}
      >
        <Topbar />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
