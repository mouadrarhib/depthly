import { useState } from 'react'

import { CheckSquare, FileText, Pause, Play, Square } from 'lucide-react'
import { Link } from 'react-router-dom'

import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { TimerNotesPanel } from '@/components/timer/TimerNotesPanel'
import { TimerProjectSelector } from '@/components/timer/TimerProjectSelector'
import { TimerTodoPanel } from '@/components/timer/TimerTodoPanel'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { useSaveSession } from '@/hooks/useSaveSession'
import { shortDate } from '@/lib/utils/plannerDates'
import type { PlannerEntry } from '@/lib/utils/recurrence'
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

export function TimerWidget({
  nextTask,
  projectName,
}: {
  nextTask?: PlannerEntry | null
  projectName?: string
}) {
  const {
    elapsed,
    duration,
    mode,
    sessionType,
    isRunning,
    isPaused,
    sessionCount,
    selectedProjectId,
    selectedTaskId,
    setSelectedProject,
    setSelectedTask,
  } = useTimerStore()
  const { start, pause, resume, saveAndStop, skipBreak, isSaving, isSessionLimitReached } =
    useSaveSession()
  const toggleLog = useUiStore((state) => state.toggleLog)
  const toggleTodo = useUiStore((state) => state.toggleTodo)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [showSelector, setShowSelector] = useState(false)

  const isFree = mode === 'free'
  const isIdle = !isRunning && !isPaused
  const isBreakIdle = isIdle && sessionType === 'break'
  const hasCompleted = !isFree && duration > 0 && elapsed >= duration
  const progress = isFree || duration === 0 ? 0 : elapsed / duration
  const remaining = isFree ? elapsed : Math.max(0, duration - elapsed)
  const modeLabel = mode === 'free' ? 'Free' : 'Pomodoro'
  const showPlanTask =
    !!nextTask &&
    isIdle &&
    sessionType === 'focus' &&
    !showSelector &&
    ((!selectedProjectId && !selectedTaskId) || selectedTaskId === nextTask.task.id)

  const handleStart = () => {
    if (sessionType === 'focus' && isSessionLimitReached) {
      setUpgradeOpen(true)
      return
    }
    if (showPlanTask && nextTask && selectedTaskId !== nextTask.task.id) {
      setSelectedProject(nextTask.task.project_id)
      setSelectedTask(nextTask.task.id)
    }
    start()
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center xl:gap-10">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {modeLabel} · {sessionType === 'focus' ? 'Focus session' : 'Break'}
        </p>
        <h2 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[30px]">
          {isIdle
            ? 'Start with your next task.'
            : isPaused
              ? 'Your session is paused.'
              : 'Stay with the work.'}
        </h2>
        <p className="mt-2 max-w-[38ch] text-sm leading-6 text-muted-foreground">
          {isIdle
            ? nextTask
              ? 'Your plan is here when you are ready to focus.'
              : 'Choose what you are working on, then give it your full attention.'
            : 'Your focused time is being tracked and will count toward your progress.'}
        </p>

        {showPlanTask && nextTask ? (
          <div className="mt-7 max-w-[360px]">
            <button
              type="button"
              onClick={() => {
                setSelectedProject(nextTask.task.project_id)
                setSelectedTask(nextTask.task.id)
              }}
              className="w-full rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-left transition-colors hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand">
                Next from today’s plan
              </span>
              <span className="mt-2 block truncate text-base font-semibold text-foreground">
                {nextTask.task.title}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {projectName ?? 'Project'}
                {nextTask.task.due_date ? ` · Due ${shortDate(nextTask.task.due_date)}` : ''}
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-7 max-w-[320px] space-y-2">
            <TimerProjectSelector />
            {nextTask && isIdle && sessionType === 'focus' && showSelector && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProject(nextTask.task.project_id)
                  setSelectedTask(nextTask.task.id)
                  setShowSelector(false)
                }}
                className="min-h-10 text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Use a task from today’s plan →
              </button>
            )}
          </div>
        )}

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
              <button
                type="button"
                onClick={resume}
                disabled={isSaving || hasCompleted}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-depth-bg hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary disabled:opacity-50"
              >
                <Play size={16} fill="currentColor" aria-hidden="true" /> Resume
              </button>
              <button
                type="button"
                onClick={saveAndStop}
                disabled={isSaving || hasCompleted}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-depth-border px-4 text-sm font-medium text-ink-primary hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              >
                <Square size={14} aria-hidden="true" /> Stop
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={pause}
                disabled={isSaving || hasCompleted}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-depth-bg hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary disabled:opacity-50"
              >
                <Pause size={16} fill="currentColor" aria-hidden="true" /> Pause
              </button>
              <button
                type="button"
                onClick={saveAndStop}
                disabled={isSaving || hasCompleted}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-depth-border px-4 text-sm font-medium text-ink-primary hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              >
                <Square size={14} aria-hidden="true" /> Stop
              </button>
            </>
          )}
          {showPlanTask && (
            <button
              type="button"
              onClick={() => setShowSelector(true)}
              className="min-h-12 px-3 text-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Choose another task →
            </button>
          )}
          {sessionType === 'break' && (
            <button
              type="button"
              onClick={skipBreak}
              disabled={isSaving}
              className="min-h-12 rounded-xl px-3 text-sm text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            >
              Skip break
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <button
            type="button"
            onClick={toggleLog}
            className="inline-flex min-h-9 items-center gap-1.5 text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <FileText size={14} aria-hidden="true" /> Log
          </button>
          <button
            type="button"
            onClick={toggleTodo}
            className="inline-flex min-h-9 items-center gap-1.5 text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <CheckSquare size={14} aria-hidden="true" /> Todo
          </button>
          <Link
            to={PATHS.timer}
            className="inline-flex min-h-9 items-center text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Open full timer →
          </Link>
        </div>
      </div>

      <div className="flex justify-center lg:justify-end">
        <ProgressRing
          progress={progress}
          isRunning={isRunning}
          size={220}
          strokeWidth={9}
          color={sessionType === 'focus' ? '#4B9EFF' : '#3DD68C'}
        >
          <div className="flex flex-col items-center">
            <span className="font-data text-[42px] font-semibold leading-none tracking-[-0.03em] text-foreground">
              {formatTime(remaining, isFree)}
            </span>
            <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {isPaused ? 'Paused' : isRunning ? 'In progress' : 'Ready to focus'}
            </span>
            <span className="mt-2 text-xs text-muted-foreground">
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
