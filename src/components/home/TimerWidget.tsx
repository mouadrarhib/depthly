import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, FileText } from 'lucide-react'

import { useTimerStore } from '@/store/timerStore'
import { useUiStore } from '@/store'
import { useTimerEffects } from '@/hooks/useTimerEffects'
import { useSaveSession } from '@/hooks/useSaveSession'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { TimerNotesPanel } from '@/components/timer/TimerNotesPanel'
import { TimerTodoPanel } from '@/components/timer/TimerTodoPanel'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { PATHS } from '@/routes/paths'

const RING = 220
const SCALE = RING / 340

function fmt(sec: number, free: boolean): string {
  if (free) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerWidget() {
  useTimerEffects()

  const {
    elapsed, duration, mode, sessionType,
    isRunning, isPaused, sessionCount,
    start, pause, resume,
  } = useTimerStore()

  const { saveSession, saveAndStop, isSessionLimitReached, toastMessage } = useSaveSession()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const savedRef = useRef(false)

  const toggleLog  = useUiStore((s) => s.toggleLog)
  const toggleTodo = useUiStore((s) => s.toggleTodo)

  const isFree    = mode === 'free'
  const progress  = isFree || duration === 0 ? 0 : elapsed / duration
  const remaining = isFree ? elapsed : Math.max(0, duration - elapsed)
  const ringColor = sessionType === 'focus' ? '#3DD68C' : 'var(--color-brand)'
  const isIdle    = !isRunning && !isPaused
  const fontSz    = Math.round((isFree ? 48 : 72) * SCALE)

  // Intercept start when monthly session limit is reached
  useEffect(() => {
    if (isRunning && sessionType === 'focus' && isSessionLimitReached && !upgradeOpen) {
      useTimerStore.getState().pause()
      setUpgradeOpen(true)
    }
  }, [isRunning, sessionType, isSessionLimitReached, upgradeOpen])

  // Save focus session on completion (same logic as TimerPage)
  useEffect(() => {
    if (elapsed === 0) {
      savedRef.current = false
      return
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

      {/* Mode · session type label */}
      <span style={{
        fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--color-text-faint)',
      }}>
        {mode === 'pomodoro' ? 'Pomodoro' : mode === 'custom' ? 'Custom' : 'Free'}
        {' · '}
        {sessionType === 'focus' ? 'Focus' : 'Break'}
      </span>

      {/* Progress ring */}
      <ProgressRing progress={progress} isRunning={isRunning} size={RING} color={ringColor}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span
            className="font-data"
            style={{
              fontSize: fontSz, fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text)',
              lineHeight: 1,
            }}
          >
            {fmt(remaining, isFree)}
          </span>
          <span style={{
            fontSize: Math.max(9, Math.round(11 * SCALE)),
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: Math.round(8 * SCALE),
          }}>
            {sessionType === 'focus' ? 'FOCUS' : 'BREAK'}
          </span>
          <span style={{
            fontSize: Math.max(9, Math.round(12 * SCALE)),
            color: 'var(--color-text-faint)',
            marginTop: 4,
          }}>
            {sessionCount} session{sessionCount === 1 ? '' : 's'} today
          </span>
        </div>
      </ProgressRing>

      {/* Controls */}
      {isIdle ? (
        <button
          onClick={start}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: RING, height: 48, borderRadius: 14,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
            background: 'rgba(75,158,255,0.08)',
            border: '1px solid rgba(75,158,255,0.22)',
            color: '#B8D4FF',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(75,158,255,0.14)'
            el.style.borderColor = 'rgba(75,158,255,0.38)'
            el.style.color = '#D0E4FF'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(75,158,255,0.08)'
            el.style.borderColor = 'rgba(75,158,255,0.22)'
            el.style.color = '#B8D4FF'
          }}
        >
          Start Focus Session
        </button>
      ) : isPaused ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={resume} variant="blue">Resume</Btn>
          <Btn onClick={saveAndStop} variant="red">Stop</Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={pause}        variant="neutral">Pause</Btn>
          <Btn onClick={saveAndStop} variant="red">Stop</Btn>
        </div>
      )}

      {/* Log / Todo — same panels as /timer, shared uiStore + timerStore state */}
      <div style={{ display: 'flex', gap: 8 }}>
        <ChipBtn onClick={toggleLog}>
          <FileText size={13} />
          Log
        </ChipBtn>
        <ChipBtn onClick={toggleTodo}>
          <CheckSquare size={13} />
          Todo
        </ChipBtn>
      </div>

      {/* Link to full timer (fullscreen + settings stay /timer-only) */}
      <Link
        to={PATHS.timer}
        style={{
          fontSize: 12, color: 'var(--color-text-muted)',
          textDecoration: 'none', letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-brand)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >
        Full timer →
      </Link>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        trigger="sessions"
      />

      <TimerNotesPanel />
      <TimerTodoPanel />
      <SaveToast message={toastMessage} />
    </div>
  )
}

// ── Small helper so control buttons don't repeat 20 lines of inline style ──

type BtnVariant = 'blue' | 'red' | 'neutral'

const VARIANT_STYLES: Record<BtnVariant, {
  bg: string; border: string; color: string;
  hoverBg: string; hoverBorder: string; hoverColor: string
}> = {
  blue: {
    bg: 'rgba(75,158,255,0.08)',     border: 'rgba(75,158,255,0.22)',  color: '#B8D4FF',
    hoverBg: 'rgba(75,158,255,0.14)', hoverBorder: 'rgba(75,158,255,0.38)', hoverColor: '#D0E4FF',
  },
  red: {
    bg: 'rgba(242,92,92,0.06)',      border: 'rgba(242,92,92,0.18)',   color: '#E07878',
    hoverBg: 'rgba(242,92,92,0.11)', hoverBorder: 'rgba(242,92,92,0.3)',   hoverColor: '#F09090',
  },
  neutral: {
    bg: 'rgba(255,255,255,0.04)',    border: 'rgba(255,255,255,0.09)', color: '#7A7890',
    hoverBg: 'rgba(255,255,255,0.07)', hoverBorder: 'rgba(255,255,255,0.14)', hoverColor: '#B0AECB',
  },
}

function Btn({
  onClick, variant, children,
}: {
  onClick: () => void
  variant: BtnVariant
  children: React.ReactNode
}) {
  const v = VARIANT_STYLES[variant]
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: 44, minWidth: 100, padding: '0 18px', borderRadius: 12,
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
        background: v.bg, border: `1px solid ${v.border}`, color: v.color,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.background = v.hoverBg
        el.style.borderColor = v.hoverBorder
        el.style.color = v.hoverColor
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = v.bg
        el.style.borderColor = v.border
        el.style.color = v.color
      }}
    >
      {children}
    </button>
  )
}

// ── Small chip button — matches BottomActionRow's Configure/Fullscreen style ──

function ChipBtn({
  onClick, children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--color-surface-overlay)',
        border: '1px solid var(--color-border)',
        borderRadius: 10, padding: '7px 12px',
        fontSize: 12, fontWeight: 500,
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.color = 'var(--color-text)'
        el.style.background = 'var(--color-surface-raised)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.color = 'var(--color-text-muted)'
        el.style.background = 'var(--color-surface-overlay)'
      }}
    >
      {children}
    </button>
  )
}

// ── Save toast — fixed, auto-fading confirmation for background saves ─────
// (Same shape as TimerControls' — TimerWidget renders its own Stop buttons
// rather than <TimerControls>, so it needs its own toast host.)

function SaveToast({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <>
      <style>{`
        @keyframes timerWidgetToastFade {
          0%, 80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position:      'fixed',
          bottom:        32,
          left:          '50%',
          transform:     'translateX(-50%)',
          background:    'var(--color-surface-raised)',
          border:        '1px solid var(--color-border)',
          borderRadius:  10,
          padding:       '10px 18px',
          fontSize:      13,
          fontWeight:    500,
          color:         'var(--color-text)',
          boxShadow:     '0 8px 24px rgba(0,0,0,0.35)',
          zIndex:        200,
          pointerEvents: 'none',
          animation:     'timerWidgetToastFade 3s ease forwards',
        }}
      >
        {message}
      </div>
    </>
  )
}
