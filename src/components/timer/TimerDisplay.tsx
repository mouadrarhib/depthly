import { useEffect, useState } from 'react'

import { useTimerStore } from '@/store/timerStore'
import { ProgressRing } from '@/components/ui/ProgressRing'

function formatCountdown(seconds: number, free: boolean): string {
  if (free) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function computeSize(): number {
  const w = window.innerWidth
  if (w < 360) return 210
  if (w < 480) return 250
  if (w < 768) return 290
  return 340
}

function useRingSize(): number {
  const [size, setSize] = useState(computeSize)
  useEffect(() => {
    const handler = () => setSize(computeSize())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

export function TimerDisplay() {
  const { mode, sessionType, elapsed, duration, sessionCount, isRunning } = useTimerStore()
  const ringSize = useRingSize()

  const isFree     = mode === 'free'
  const progress   = isFree || duration === 0 ? 0 : elapsed / duration
  const remaining  = isFree ? elapsed : Math.max(0, duration - elapsed)
  const timeLabel  = formatCountdown(remaining, isFree)
  const typeLabel  = sessionType === 'focus' ? 'FOCUS' : 'BREAK'
  const countLabel = `${sessionCount} session${sessionCount === 1 ? '' : 's'} today`

  // Focus = green, Break = blue
  const ringColor = sessionType === 'focus' ? '#3DD68C' : 'var(--color-brand)'

  // Scale font proportionally to ring size (baseline: 340px ring → 72px / 48px)
  const scale    = ringSize / 340
  const fontSize = Math.round((isFree ? 48 : 72) * scale)

  return (
    <ProgressRing progress={progress} isRunning={isRunning} size={ringSize} color={ringColor}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <span
          className="font-data"
          style={{
            fontSize,
            fontWeight:    600,
            letterSpacing: '-0.02em',
            color:         'var(--color-text)',
            lineHeight:    1,
          }}
        >
          {timeLabel}
        </span>

        <span
          style={{
            fontSize:      Math.max(9, Math.round(11 * scale)),
            fontWeight:    500,
            color:         'var(--color-text-muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop:     Math.round(8 * scale),
          }}
        >
          {typeLabel}
        </span>

        <span
          style={{
            fontSize:  Math.max(9, Math.round(12 * scale)),
            color:     'var(--color-text-faint)',
            marginTop: 4,
          }}
        >
          {countLabel}
        </span>
      </div>
    </ProgressRing>
  )
}
