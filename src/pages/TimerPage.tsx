import { Expand, ListChecks, NotebookPen, Settings2 } from 'lucide-react'

import { TimerControls } from '@/components/timer/TimerControls'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerFullscreen } from '@/components/timer/TimerFullscreen'
import { TimerModeSelector } from '@/components/timer/TimerModeSelector'
import { TimerNotesPanel } from '@/components/timer/TimerNotesPanel'
import { TimerSettings } from '@/components/timer/TimerSettings'
import { TimerTodoPanel } from '@/components/timer/TimerTodoPanel'
import { useUiStore } from '@/store'
import { useTimerStore } from '@/store/timerStore'

// ── Phase selector — clickable focus/break cycle switcher ────────────────

type PhaseKey = 'focus' | 'break'

function PhaseSelector() {
  const { mode, sessionType, isRunning, isPaused } = useTimerStore()

  if (mode === 'free') return null

  const handleSwitch = (phase: PhaseKey) => {
    if (phase === sessionType) return
    if (isRunning || isPaused) return
    useTimerStore.setState((state) => ({
      sessionType: phase,
      duration: phase === 'break' ? state.breakDuration : state.focusDuration,
      elapsed: 0,
    }))
  }

  const phases: { key: PhaseKey; label: string }[] = [
    { key: 'focus', label: 'Focus' },
    { key: 'break', label: 'Break' },
  ]

  return (
    <div className="flex items-center gap-1 rounded-lg border border-depth-border bg-depth-surface p-1" aria-label="Timer phase">
      {phases.map(({ key, label }) => {
        const isActive = sessionType === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleSwitch(key)}
            disabled={isActive || isRunning || isPaused}
            aria-pressed={isActive}
            className={`min-w-[72px] rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              isActive
                ? 'bg-depth-raised text-ink-primary'
                : 'text-ink-muted hover:bg-depth-raised hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-40'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Bottom action row ─────────────────────────────────────────────────────

function BottomActionRow() {
  const toggleSettings   = useUiStore((s) => s.toggleSettings)
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen)
  const toggleLog        = useUiStore((s) => s.toggleLog)
  const toggleTodo       = useUiStore((s) => s.toggleTodo)

  const actions = [
    { label: 'Configure', icon: Settings2, onClick: toggleSettings },
    {
      label: 'Fullscreen',
      icon: Expand,
      onClick: () => {
        // Native Fullscreen API is unsupported on iOS Safari and some mobile
        // WebViews, so the app overlay remains the reliable fallback.
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {})
        }
        toggleFullscreen()
      },
    },
    { label: 'Log', icon: NotebookPen, onClick: toggleLog },
    { label: 'Todo', icon: ListChecks, onClick: toggleTodo },
  ]

  return (
    <div className="flex items-center divide-x divide-depth-border overflow-hidden rounded-xl border border-depth-border bg-depth-surface p-1">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          title={label}
          className="flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-medium text-ink-secondary transition-colors duration-200 hover:bg-depth-raised hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-w-[96px]"
        >
          <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Timer page ─────────────────────────────────────────────────────────────

export function TimerPage() {
  return (
    <>
      {/* Main centered area — fills the full available space */}
      <main className="mx-auto flex h-full min-h-0 w-full max-w-[760px] flex-col items-center justify-center overflow-hidden px-1">
        <h1 className="sr-only">Focus timer</h1>

        <div className="mb-4 flex flex-col items-center gap-2.5 sm:mb-5 [@media(max-height:720px)]:mb-3 [@media(max-height:720px)]:gap-2">
          <TimerModeSelector />
          <PhaseSelector />
        </div>

        <TimerDisplay />

        <div className="mt-4 flex w-full justify-center sm:mt-5 [@media(max-height:720px)]:mt-3">
          <TimerControls />
        </div>

        <div className="mt-3 sm:mt-4 [@media(max-height:720px)]:mt-2">
          <BottomActionRow />
        </div>
      </main>

      {/* Fixed right-side slide-in panels */}
      <TimerSettings />
      <TimerNotesPanel />
      <TimerTodoPanel />

      {/* Fixed fullscreen overlay */}
      <TimerFullscreen />

    </>
  )
}
