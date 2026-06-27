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

export function TimerDisplay() {
  const { mode, sessionType, elapsed, duration, sessionCount, isRunning } = useTimerStore()

  const isFree     = mode === 'free'
  const progress   = isFree || duration === 0 ? 0 : elapsed / duration
  const remaining  = isFree ? elapsed : Math.max(0, duration - elapsed)
  const timeLabel  = formatCountdown(remaining, isFree)
  const typeLabel  = sessionType === 'focus' ? 'FOCUS' : 'BREAK'
  const countLabel = `${sessionCount} session${sessionCount === 1 ? '' : 's'} today`

  return (
    <ProgressRing progress={progress} isRunning={isRunning}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <span
          className="font-data"
          style={{
            fontSize:      isFree ? 42 : 64,
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
            fontSize:      11,
            fontWeight:    500,
            color:         'var(--color-text-muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop:     8,
          }}
        >
          {typeLabel}
        </span>

        <span
          style={{
            fontSize:  12,
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
