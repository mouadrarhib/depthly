import { useEffect, useRef } from 'react'

import { useTimerEffects } from '@/hooks/useTimerEffects'
import { useSaveSession } from '@/hooks/useSaveSession'
import { TimerFullscreen } from '@/components/timer/TimerFullscreen'
import { TimerModeSelector } from '@/components/timer/TimerModeSelector'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerControls } from '@/components/timer/TimerControls'
import { TimerSettings } from '@/components/timer/TimerSettings'
import { useTimerStore } from '@/store/timerStore'
import { useUiStore } from '@/store'

// ── Session dots — shows focus/break cycle position ──────────────────────

function SessionDots() {
  const { mode, sessionType } = useTimerStore()

  if (mode === 'free') return null

  const dots = [
    { key: 'focus', active: sessionType === 'focus' },
    { key: 'break', active: sessionType === 'break' },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      {dots.map(({ key, active }) => (
        <div
          key={key}
          style={{
            width:        8,
            height:       8,
            borderRadius: '50%',
            background:   active ? 'var(--color-brand)' : 'var(--color-surface-overlay)',
            transition:   'background 0.3s',
          }}
        />
      ))}
    </div>
  )
}

// ── Bottom action row ─────────────────────────────────────────────────────

function BottomActionRow() {
  const toggleSettings = useUiStore((s) => s.toggleSettings)

  const btnStyle: React.CSSProperties = {
    display:      'flex',
    alignItems:   'center',
    gap:          6,
    background:   'var(--color-surface-overlay)',
    border:       '1px solid var(--color-border)',
    borderRadius: 10,
    padding:      '8px 16px',
    fontSize:     13,
    color:        'var(--color-text-muted)',
    cursor:       'pointer',
    transition:   'color 0.15s, background 0.15s',
    fontWeight:   500,
  }

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button
        style={btnStyle}
        onClick={toggleSettings}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color      = 'var(--color-text)'
          el.style.background = 'var(--color-surface-raised)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color      = 'var(--color-text-muted)'
          el.style.background = 'var(--color-surface-overlay)'
        }}
      >
        <span>⚙</span> Configure
      </button>

      <button
        style={{ ...btnStyle, cursor: 'default', opacity: 0.5 }}
        disabled
        title="Coming soon"
      >
        <span>✏</span> Log
      </button>

      <button
        style={{ ...btnStyle, cursor: 'default', opacity: 0.5 }}
        disabled
        title="Coming soon"
      >
        <span>☑</span> Todo
      </button>
    </div>
  )
}

// ── Timer page ─────────────────────────────────────────────────────────────

export function TimerPage() {
  useTimerEffects()

  const { elapsed, duration, mode, isRunning } = useTimerStore()
  const { saveSession } = useSaveSession()

  const savedRef = useRef(false)

  useEffect(() => {
    if (elapsed === 0) {
      savedRef.current = false
      return
    }
    if (
      mode !== 'free' &&
      duration > 0 &&
      isRunning &&
      elapsed >= duration &&
      !savedRef.current
    ) {
      savedRef.current = true
      saveSession()
    }
  }, [elapsed, duration, mode, isRunning, saveSession])

  return (
    <>
      {/* Main centered area — fills the full available space */}
      <div className="flex min-h-full flex-col items-center justify-center gap-6">
        <TimerModeSelector />

        <SessionDots />

        <TimerDisplay />

        <TimerControls />

        <BottomActionRow />
      </div>

      {/* Fixed right-side settings panel (renders on top) */}
      <TimerSettings />

      {/* Fixed fullscreen overlay */}
      <TimerFullscreen />
    </>
  )
}
