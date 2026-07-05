import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useTimerStore } from '@/store/timerStore'
import { useTimerEffects } from '@/hooks/useTimerEffects'
import { useSaveSession } from '@/hooks/useSaveSession'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
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

  const { saveSession, saveAndStop, isSessionLimitReached } = useSaveSession()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const savedRef = useRef(false)

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

      {/* Link to full timer */}
      <Link
        to={PATHS.timer}
        style={{
          fontSize: 12, color: 'var(--color-text-muted)',
          textDecoration: 'none', letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-brand)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >
        Open Timer →
      </Link>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        trigger="sessions"
      />
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
