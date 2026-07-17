import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/shared/useAuth'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
import { useTimerEffects } from '@/hooks/useTimerEffects'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils/cn'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  useAuth()
  useOnboardingTour()
  // Mounted once here (not per timer page) so the tick interval, tab title,
  // completion beeps, auto-save, and break auto-transition all keep running
  // no matter which page is visible — see useTimerEffects.ts.
  useTimerEffects()

  const { sidebarOpen, toggleSidebar } = useUiStore()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  // AppLayout owns scrolling via its own overflow-hidden root + <main>'s
  // overflow-y-auto — lock document-level scroll only while this layout is
  // mounted, so routes rendered outside it (landing, auth pages) keep their
  // normal body scroll.
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflowY
    const previousBodyOverflow = document.body.style.overflowY
    document.documentElement.style.overflowY = 'hidden'
    document.body.style.overflowY = 'hidden'
    return () => {
      document.documentElement.style.overflowY = previousHtmlOverflow
      document.body.style.overflowY = previousBodyOverflow
    }
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--color-surface-base)' }}>
      {/* Mobile backdrop — tapping closes sidebar. Always mounted (rather than
          conditionally rendered) so opacity can transition instead of the
          backdrop popping in/out instantly. */}
      <div
        className={cn(
          'fixed inset-0 z-10 bg-black/50 transition-opacity duration-200 ease md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={toggleSidebar}
        aria-hidden={!sidebarOpen}
      />

      <Sidebar />

      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-200',
          // On mobile: no margin (sidebar overlays). On md+: offset by sidebar width.
          sidebarOpen ? 'md:ml-60' : 'md:ml-16'
        )}
      >
        <Topbar />

        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
