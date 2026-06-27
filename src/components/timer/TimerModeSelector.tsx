import { useTimerStore } from '@/store/timerStore'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TimerMode = 'pomodoro' | 'custom' | 'free'

const MODES: { value: TimerMode; label: string }[] = [
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'custom',   label: 'Custom'   },
  { value: 'free',     label: 'Free'     },
]

export function TimerModeSelector() {
  const { mode, isRunning, stop, setMode } = useTimerStore()

  return (
    <Tabs
      value={mode}
      onValueChange={(v) => {
        if (v === mode) return
        stop()
        setMode(v as TimerMode)
      }}
    >
      <TabsList
        className="rounded-full p-1 gap-0.5 h-auto"
        style={{ background: 'var(--color-surface-overlay)' }}
      >
        {MODES.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            disabled={isRunning}
            className={[
              'rounded-full text-[13px] font-medium px-[18px] py-[6px]',
              'transition-all shadow-none',
              'data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--color-text-faint)]',
              'data-[state=active]:bg-[var(--color-surface-raised)] data-[state=active]:text-[var(--color-brand)]',
              'data-[state=active]:border data-[state=active]:border-[rgba(75,158,255,0.3)]',
              'data-[state=active]:shadow-none',
              'disabled:opacity-40',
            ].join(' ')}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
