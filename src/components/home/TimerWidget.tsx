import { useState } from 'react'

import { CheckSquare, FileText, Pause, Play, Square } from 'lucide-react'
import { Link } from 'react-router-dom'

import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { TimerNotesPanel } from '@/components/timer/TimerNotesPanel'
import { TimerProjectSelector } from '@/components/timer/TimerProjectSelector'
import { TimerTodoPanel } from '@/components/timer/TimerTodoPanel'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { useSaveSession } from '@/hooks/useSaveSession'
import { PATHS } from '@/routes/paths'
import { useUiStore } from '@/store'
import { useTimerStore } from '@/store/timerStore'

function formatTime(seconds: number, free: boolean): string {
  if (free) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function TimerWidget() {
  const { elapsed, duration, mode, sessionType, isRunning, isPaused, sessionCount } = useTimerStore()
  const { start, pause, resume, saveAndStop, skipBreak, isSaving, isSessionLimitReached } = useSaveSession()
  const toggleLog = useUiStore((state) => state.toggleLog)
  const toggleTodo = useUiStore((state) => state.toggleTodo)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const isFree = mode === 'free'
  const isIdle = !isRunning && !isPaused
  const isBreakIdle = isIdle && sessionType === 'break'
  const hasCompleted = !isFree && duration > 0 && elapsed >= duration
  const progress = isFree || duration === 0 ? 0 : elapsed / duration
  const remaining = isFree ? elapsed : Math.max(0, duration - elapsed)
  const modeLabel = mode === 'pomodoro' ? 'Pomodoro' : mode === 'custom' ? 'Custom' : 'Free'

  const handleStart = () => {
    if (sessionType === 'focus' && isSessionLimitReached) {
      setUpgradeOpen(true)
      return
    }
    start()
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center xl:gap-10">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-secondary">
          {modeLabel} · {sessionType === 'focus' ? 'Focus session' : 'Break'}
        </p>
        <h2 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink-primary sm:text-[30px]">
          {isIdle ? 'Start with your next task.' : isPaused ? 'Your session is paused.' : 'Stay with the work.'}
        </h2>
        <p className="mt-2 max-w-[38ch] text-sm leading-6 text-ink-secondary">
          {isIdle
            ? 'Choose what you are working on, then give it your full attention.'
            : 'Your focused time is being tracked and will count toward your progress.'}
        </p>

        <div className="mt-7 max-w-[320px]">
          <TimerProjectSelector />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {isIdle ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-depth-bg transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={16} fill="currentColor" aria-hidden="true" />
              {isBreakIdle ? 'Start break' : 'Start focus session'}
            </button>
          ) : isPaused ? (
            <>
              <button type="button" onClick={resume} disabled={isSaving || hasCompleted} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-depth-bg hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary disabled:opacity-50">
                <Play size={16} fill="currentColor" aria-hidden="true" /> Resume
              </button>
              <button type="button" onClick={saveAndStop} disabled={isSaving || hasCompleted} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-depth-border px-4 text-sm font-medium text-ink-primary hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50">
                <Square size={14} aria-hidden="true" /> Stop
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={pause} disabled={isSaving || hasCompleted} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-depth-bg hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary disabled:opacity-50">
                <Pause size={16} fill="currentColor" aria-hidden="true" /> Pause
              </button>
              <button type="button" onClick={saveAndStop} disabled={isSaving || hasCompleted} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-depth-border px-4 text-sm font-medium text-ink-primary hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50">
                <Square size={14} aria-hidden="true" /> Stop
              </button>
            </>
          )}
          {sessionType === 'break' && (
            <button type="button" onClick={skipBreak} disabled={isSaving} className="min-h-12 rounded-xl px-3 text-sm text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50">
              Skip break
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <button type="button" onClick={toggleLog} className="inline-flex min-h-9 items-center gap-1.5 text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <FileText size={14} aria-hidden="true" /> Log
          </button>
          <button type="button" onClick={toggleTodo} className="inline-flex min-h-9 items-center gap-1.5 text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <CheckSquare size={14} aria-hidden="true" /> Todo
          </button>
          <Link to={PATHS.timer} className="inline-flex min-h-9 items-center text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            Open full timer →
          </Link>
        </div>
      </div>

      <div className="flex justify-center lg:justify-end">
        <ProgressRing progress={progress} isRunning={isRunning} size={220} strokeWidth={9} color={sessionType === 'focus' ? '#4B9EFF' : '#3DD68C'}>
          <div className="flex flex-col items-center">
            <span className="font-data text-[42px] font-semibold leading-none tracking-[-0.03em] text-ink-primary">
              {formatTime(remaining, isFree)}
            </span>
            <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.15em] text-ink-secondary">
              {isPaused ? 'Paused' : isRunning ? 'In progress' : 'Ready to focus'}
            </span>
            <span className="mt-2 text-xs text-ink-secondary">
              {sessionCount} session{sessionCount === 1 ? '' : 's'} today
            </span>
          </div>
        </ProgressRing>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="sessions" />
      <TimerNotesPanel />
      <TimerTodoPanel />
    </div>
  )
}
