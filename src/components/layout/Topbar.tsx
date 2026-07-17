import { useState } from 'react'
import { CircleHelp, Flame, Clock, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { supabase }    from '@/lib/supabase/client'
import { useAuthStore, useUiStore } from '@/store'
import { useTodayStats }  from '@/hooks/useTodayStats'
import { usePlan }        from '@/hooks/usePlan'
import { clearOnboardingTourSeen, runOnboardingTour } from '@/hooks/useOnboardingTour'
import { PATHS }          from '@/routes/paths'
import { Avatar }         from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

function fmtFocus(mins: number): string {
  if (mins === 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const Divider = () => (
  <span style={{ width: 0.5, height: 16, background: '#2E2E38', flexShrink: 0, display: 'block' }} />
)

// ── Help button (opens onboarding-tour replay menu) ─────────────────────────
function HelpButton({ onReplayTour }: { onReplayTour: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Help"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          32,
            height:         32,
            borderRadius:   8,
            border:         'none',
            background:     hovered ? '#222228' : 'transparent',
            cursor:         'pointer',
            flexShrink:     0,
            transition:     'background 150ms',
          }}
        >
          <CircleHelp size={18} style={{ color: hovered ? '#E8E6F0' : '#7A7890' }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" style={{ minWidth: 192 }}>
        <DropdownMenuItem onClick={onReplayTour}>
          Quick guide
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar() {
  const user          = useAuthStore((s) => s.user)
  const userId        = useAuthStore((s) => s.user?.id)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const navigate      = useNavigate()

  const { streak, focusMinutes, sessions, avatarUrl, displayName } = useTodayStats()
  const { plan } = usePlan()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleReplayTour = () => {
    if (!userId) return
    clearOnboardingTourSeen(userId)
    void runOnboardingTour(userId)
  }

  const name = displayName ?? user?.email?.split('@')[0] ?? '?'

  const planLabel =
    plan === 'pro'      ? 'Pro'      :
    plan === 'founding' ? 'Founding' :
    'Free'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4 sm:px-6">
      {/* Hamburger — mobile only; desktop uses sidebar's own collapse arrow */}
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

      {/* Right-side: stats + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

        {/* Today's stats — streak / focus time / sessions */}
        <div data-tour="today-stats" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Streak */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={14} style={{ color: '#C8FF64', flexShrink: 0 }} />
            <span className="font-data" style={{ fontSize: 13, color: '#C8FF64', lineHeight: 1 }}>
              {streak}
            </span>
          </span>

          <Divider />

          {/* Focus time today */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} style={{ color: '#4B9EFF', flexShrink: 0 }} />
            <span className="font-data" style={{ fontSize: 13, color: '#4B9EFF', lineHeight: 1 }}>
              {fmtFocus(focusMinutes)}
            </span>
          </span>

          <Divider />

          {/* Sessions today */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} style={{ color: '#3DD68C', flexShrink: 0 }} />
            <span className="font-data" style={{ fontSize: 13, color: '#3DD68C', lineHeight: 1 }}>
              {sessions}
            </span>
          </span>
        </div>

        <Divider />

        {/* Help — replay onboarding tour */}
        <HelpButton onReplayTour={handleReplayTour} />

        {/* Avatar → dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: 'none', padding: 0,
                background: 'none', outline: 'none',
              }}
            >
              <Avatar avatarUrl={avatarUrl} name={name} size={26} fontSize={10} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" style={{ minWidth: 192 }}>
            {/* Email */}
            <DropdownMenuLabel
              style={{ fontSize: 12, fontWeight: 400, color: '#7A7890', padding: '8px 8px 4px' }}
            >
              {user?.email}
            </DropdownMenuLabel>

            {/* Plan badge */}
            <div style={{ padding: '2px 8px 8px' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                background: plan === 'free'
                  ? 'rgba(122,120,144,0.15)'
                  : 'rgba(75,158,255,0.15)',
                color: plan === 'free' ? '#7A7890' : '#4B9EFF',
              }}>
                {planLabel}
              </span>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate(PATHS.settings)}>
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSignOut}
              style={{ color: '#E07878' }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
