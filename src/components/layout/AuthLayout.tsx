import { Outlet } from 'react-router-dom'

import { Logo } from '@/components/ui'

/**
 * Minimal centered layout for login and signup pages.
 * No sidebar, no topbar — just the lockup above the form.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo size={32} withWordmark />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
