import { supabase } from '@/lib/supabase/client'
import { useAuthStore, useUiStore } from '@/store'
import { Button } from '@/components/ui'

export function Topbar() {
  const user          = useAuthStore((s) => s.user)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4 sm:px-6">
      {/* Hamburger — mobile only; desktop uses the sidebar's own collapse arrow */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center rounded p-1.5 text-text-faint hover:bg-surface-overlay hover:text-text md:hidden"
        aria-label="Toggle navigation"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect y="3"  width="18" height="1.5" rx="0.75" fill="currentColor"/>
          <rect y="8"  width="18" height="1.5" rx="0.75" fill="currentColor"/>
          <rect y="13" width="18" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
      </button>

      {/* Desktop left slot */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm text-text-muted sm:inline">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
