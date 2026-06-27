import { useTimerStore } from '@/store/timerStore'

type TimerMode = 'pomodoro' | 'custom' | 'free'

const MODES: { value: TimerMode; label: string }[] = [
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'custom',   label: 'Custom'   },
  { value: 'free',     label: 'Free'     },
]

export function TimerModeSelector() {
  const { mode, isRunning, stop, setMode } = useTimerStore()

  const handleSelect = (selected: TimerMode) => {
    if (selected === mode) return
    stop()
    setMode(selected)
  }

  return (
    <div
      className="inline-flex"
      style={{
        background:   'var(--color-surface-overlay)',
        borderRadius: 999,
        padding:      4,
        gap:          3,
      }}
    >
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          disabled={isRunning}
          onClick={() => handleSelect(value)}
          className="disabled:pointer-events-none disabled:opacity-40 transition-all"
          style={{
            padding:      '6px 18px',
            fontSize:     13,
            fontWeight:   500,
            borderRadius: 999,
            ...(mode === value
              ? {
                  background: 'var(--color-surface-raised)',
                  color:      'var(--color-text)',
                  border:     '1px solid rgba(75,158,255,0.3)',
                }
              : {
                  background: 'transparent',
                  color:      'var(--color-text-faint)',
                  border:     '1px solid transparent',
                }),
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
