import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui'

export function Topbar() {
  const user = useAuthStore((s) => s.user)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-6">
      <div /> {/* Left slot — breadcrumbs or page title can go here */}

      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
