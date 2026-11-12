import { Expand, ListChecks, NotebookPen, Settings2 } from 'lucide-react'

import { TimerControls } from '@/components/timer/TimerControls'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerFullscreen } from '@/components/timer/TimerFullscreen'
import { TimerModeSelector } from '@/components/timer/TimerModeSelector'
import { TimerNotesPanel } from '@/components/timer/TimerNotesPanel'
import { TimerProjectSelector } from '@/components/timer/TimerProjectSelector'
import { TimerSettings } from '@/components/timer/TimerSettings'
import { TimerTodoPanel } from '@/components/timer/TimerTodoPanel'
import { useUiStore } from '@/store'
import { useTimerStore } from '@/store/timerStore'

type PhaseKey = 'focus' | 'break'

function PhaseSelector() {
  const { mode, sessionType, isRunning, isPaused } = useTimerStore()
  if (mode === 'free') return null

  const switchPhase = (phase: PhaseKey) => {
    if (phase === sessionType || isRunning || isPaused) return
    useTimerStore.setState((state) => ({
      sessionType: phase,
      duration: phase === 'break' ? state.breakDuration : state.focusDuration,
      elapsed: 0,
    }))
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-depth-border bg-depth-raised p-1" aria-label="Timer phase">
      {(['focus', 'break'] as const).map((phase) => (
        <button
          key={phase}
          type="button"
          onClick={() => switchPhase(phase)}
          disabled={phase === sessionType || isRunning || isPaused}
          aria-pressed={phase === sessionType}
          className={`min-h-9 min-w-24 rounded-lg px-3 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${phase === sessionType ? 'bg-depth-border text-ink-primary' : 'text-ink-secondary hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50'}`}
        >
          {phase}
        </button>
      ))}
    </div>
  )
}

function openFullscreen(toggleFullscreen: () => void) {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {})
  }
  toggleFullscreen()
}

function TimerTools() {
  const toggleSettings = useUiStore((state) => state.toggleSettings)
  const toggleFullscreen = useUiStore((state) => state.toggleFullscreen)
  const toggleLog = useUiStore((state) => state.toggleLog)
  const toggleTodo = useUiStore((state) => state.toggleTodo)
  const actions = [
    { label: 'Log', icon: NotebookPen, onClick: toggleLog },
    { label: 'Todo', icon: ListChecks, onClick: toggleTodo },
    { label: 'Fullscreen', icon: Expand, onClick: () => openFullscreen(toggleFullscreen) },
    { label: 'Session settings', icon: Settings2, onClick: toggleSettings },
  ]

  return (
    <div className="grid grid-cols-4 gap-1 border-t border-depth-border pt-4">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          aria-label={label}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-1 text-xs font-medium text-ink-secondary transition-colors hover:bg-depth-raised hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Icon size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

function TimerContext() {
  const { mode, focusDuration, breakDuration, isRunning, isPaused } = useTimerStore()
  const toggleSettings = useUiStore((state) => state.toggleSettings)
  const toggleFullscreen = useUiStore((state) => state.toggleFullscreen)

  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:gap-5" aria-label="Timer context">
      <section className="rounded-2xl border border-depth-border bg-depth-surface p-5">
        <h2 className="text-base font-semibold text-ink-primary">What are you working on?</h2>
        <p className="mt-1 text-xs leading-5 text-ink-secondary">Connect this session to your work.</p>
        <div className="mt-6 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-secondary">Project and task</p>
          <TimerProjectSelector />
        </div>
        <p className="mt-4 text-xs text-ink-secondary">You can also focus without a project.</p>
      </section>

      <section className="rounded-2xl border border-depth-border bg-depth-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink-primary">Session rhythm</h2>
            <p className="mt-1 text-xs text-ink-secondary">{mode === 'free' ? 'Count up at your own pace' : 'Your focus and break durations'}</p>
          </div>
          <button type="button" onClick={toggleSettings} className="inline-flex min-h-9 items-center text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Edit</button>
        </div>
        {mode === 'free' ? (
          <p className="mt-6 border-t border-depth-border pt-5 text-sm text-ink-secondary">The timer counts up until you stop the session.</p>
        ) : (
          <div className="mt-5 space-y-4 border-t border-depth-border pt-5 text-sm">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-ink-primary"><span className="size-2.5 rounded-full bg-brand" />Focus</span><span className="font-data text-ink-primary">{Math.round(focusDuration / 60)} min</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-ink-primary"><span className="size-2.5 rounded-full bg-ink-secondary" />Break</span><span className="font-data text-ink-primary">{Math.round(breakDuration / 60)} min</span></div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-depth-border bg-depth-surface p-5">
        <h2 className="text-base font-semibold text-ink-primary">Stay in the moment</h2>
        <p className="mt-2 text-xs leading-5 text-ink-secondary">Fullscreen gives your timer a quieter view when you are ready to work.</p>
        <button type="button" onClick={() => openFullscreen(toggleFullscreen)} className="mt-5 inline-flex min-h-9 items-center text-xs font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Open fullscreen →</button>
        {(isRunning || isPaused) && <p className="mt-2 text-xs text-ink-secondary">Your session continues across the app.</p>}
      </section>
    </aside>
  )
}

export function TimerPage() {
  const { mode, focusDuration, breakDuration } = useTimerStore()
  const toggleSettings = useUiStore((state) => state.toggleSettings)

  return (
    <>
      <div className="mx-auto w-full max-w-[1180px] space-y-5 py-2 sm:space-y-6 sm:py-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink-primary sm:text-[30px]">Make space to focus.</h1>
            <p className="mt-1 text-sm text-ink-secondary">Choose your rhythm, connect your work, and begin.</p>
          </div>
          <button type="button" onClick={toggleSettings} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-depth-border bg-depth-raised px-4 text-sm font-medium text-ink-primary hover:bg-depth-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Settings2 size={16} aria-hidden="true" /> Configure
          </button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.87fr)] lg:gap-5">
          <section className="flex min-w-0 flex-col rounded-2xl border border-depth-border bg-depth-surface p-4 sm:p-6 lg:min-h-[680px]" aria-label="Focus timer">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-depth-border pb-5">
              <TimerModeSelector />
              <p className="text-xs text-ink-secondary">
                {mode === 'free' ? 'Count up freely' : `${Math.round(focusDuration / 60)} min focus · ${Math.round(breakDuration / 60)} min break`}
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-8">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-secondary">Session phase</p>
              <PhaseSelector />
              <div className="mt-8"><TimerDisplay /></div>
              <div className="mt-7 flex w-full justify-center"><TimerControls /></div>
            </div>
            <TimerTools />
          </section>
          <TimerContext />
        </div>
      </div>

      <TimerSettings />
      <TimerNotesPanel />
      <TimerTodoPanel />
      <TimerFullscreen />
    </>
  )
}
