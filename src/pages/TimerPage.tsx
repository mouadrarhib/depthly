import React, { useEffect, useRef } from 'react'

import { useTimerEffects } from '@/hooks/useTimerEffects'
import { useSaveSession } from '@/hooks/useSaveSession'
import { TimerFullscreen } from '@/components/timer/TimerFullscreen'
import { TimerModeSelector } from '@/components/timer/TimerModeSelector'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerControls } from '@/components/timer/TimerControls'
import { TimerSettings } from '@/components/timer/TimerSettings'
import { useTimerStore } from '@/store/timerStore'
import { useUiStore } from '@/store'

// ── Session dots — clickable focus/break cycle switcher ──────────────────

type PhaseKey = 'focus' | 'break'

function SessionDots() {
  const { mode, sessionType, startBreak, skipBreak } = useTimerStore()

  if (mode === 'free') return null

  const handleSwitch = (phase: PhaseKey) => {
    if (phase === sessionType) return
    if (phase === 'break') startBreak()
    else skipBreak()
  }

  const phases: { key: PhaseKey; label: string; color: string; glow: string }[] = [
    { key: 'focus', label: 'Focus', color: '#3DD68C', glow: 'rgba(61,214,140,0.5)' },
    { key: 'break', label: 'Break', color: '#4B9EFF', glow: 'rgba(75,158,255,0.5)' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {phases.map(({ key, label, color, glow }, i) => {
        const isActive = sessionType === key
        return (
          <React.Fragment key={key}>
            <button
              onClick={() => handleSwitch(key)}
              disabled={isActive}
              title={isActive ? undefined : `Switch to ${label}`}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         6,
                background:  'none',
                border:      'none',
                padding:     '4px 8px',
                borderRadius: 6,
                cursor:      isActive ? 'default' : 'pointer',
                opacity:     isActive ? 1 : 0.45,
                transition:  'opacity 0.2s',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.opacity = '0.75' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.opacity = '0.45' }}
            >
              <div
                style={{
                  width:        8,
                  height:       8,
                  borderRadius: '50%',
                  flexShrink:   0,
                  background:   isActive ? color : 'var(--color-text-faint)',
                  transition:   'background 0.25s',
                  boxShadow:    isActive ? `0 0 6px ${glow}` : 'none',
                }}
              />
              <span
                style={{
                  fontSize:      11,
                  fontWeight:    500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color:         isActive ? 'var(--color-text-muted)' : 'var(--color-text-faint)',
                  transition:    'color 0.25s',
                  userSelect:    'none',
                }}
              >
                {label}
              </span>
            </button>

            {/* Cycle arrow between the two dots */}
            {i === 0 && (
              <span
                style={{
                  fontSize:   10,
                  color:      'var(--color-text-faint)',
                  opacity:    0.4,
                  lineHeight: 1,
                  userSelect: 'none',
                  padding:    '0 2px',
                }}
              >
                →
              </span>
            )}
        </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Bottom action row ─────────────────────────────────────────────────────

function BottomActionRow() {
  const toggleSettings  = useUiStore((s) => s.toggleSettings)
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen)

  const btnStyle: React.CSSProperties = {
    display:      'flex',
    alignItems:   'center',
    gap:          6,
    background:   'var(--color-surface-overlay)',
    border:       '1px solid var(--color-border)',
    borderRadius: 10,
    padding:      '7px 12px',
    fontSize:     12,
    color:        'var(--color-text-muted)',
    cursor:       'pointer',
    transition:   'color 0.15s, background 0.15s',
    fontWeight:   500,
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
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
        style={btnStyle}
        onClick={() => {
          document.documentElement.requestFullscreen().catch(() => {})
          toggleFullscreen()
        }}
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
        <span>⛶</span> Fullscreen
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

  const { elapsed, duration, mode, sessionType, isRunning } = useTimerStore()
  const { saveSession } = useSaveSession()

  const savedRef = useRef(false)

  useEffect(() => {
    if (elapsed === 0) {
      savedRef.current = false
      return
    }
    // Only save focus sessions — break completion is handled in useTimerEffects
    if (
      mode !== 'free' &&
      sessionType === 'focus' &&
      duration > 0 &&
      isRunning &&
      elapsed >= duration &&
      !savedRef.current
    ) {
      savedRef.current = true
      saveSession()
    }
  }, [elapsed, duration, mode, sessionType, isRunning, saveSession])

  return (
    <>
      {/* Main centered area — fills the full available space */}
      <div className="flex min-h-full flex-col items-center justify-center gap-4 sm:gap-6">
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
