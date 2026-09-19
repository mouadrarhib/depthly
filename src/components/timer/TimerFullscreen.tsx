import { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Circle, Focus, LayoutPanelTop, Minimize2, X } from 'lucide-react'

import { ProgressRing } from '@/components/ui/ProgressRing'
import { projectKeys, taskKeys } from '@/lib/queryKeys'
import { fetchProjects } from '@/lib/supabase/queries/projects'
import { fetchTasksByProject } from '@/lib/supabase/queries/tasks'
import { useUiStore } from '@/store'
import type { FullscreenTimerStyle } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'

import { TimerControls } from './TimerControls'

const DISPLAY_STYLES: { value: FullscreenTimerStyle; label: string; icon: typeof Circle }[] = [
  { value: 'orbit', label: 'Orbit', icon: Circle },
  { value: 'minimal', label: 'Minimal', icon: Minimize2 },
  { value: 'panel', label: 'Panel', icon: LayoutPanelTop },
]

function formatTime(seconds: number, free: boolean): string {
  if (free) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':')
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function useOrbitSize(): number {
  const getSize = () => Math.max(260, Math.min(500, window.innerWidth * 0.46, window.innerHeight * 0.56))
  const [size, setSize] = useState(getSize)

  useEffect(() => {
    const handleResize = () => setSize(getSize())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return Math.round(size)
}

function FullscreenTimerFace({ style }: { style: FullscreenTimerStyle }) {
  const { mode, sessionType, elapsed, duration, sessionCount, isRunning } = useTimerStore()
  const orbitSize = useOrbitSize()
  const isFree = mode === 'free'
  const progress = isFree || duration === 0 ? 0 : Math.min(1, elapsed / duration)
  const remaining = isFree ? elapsed : Math.max(0, duration - elapsed)
  const time = formatTime(remaining, isFree)
  const phase = sessionType === 'focus' ? 'Focus' : 'Break'
  const ringColor = sessionType === 'focus' ? '#3DD68C' : 'var(--color-brand)'

  const timeBlock = (
    <div className="flex flex-col items-center">
      <span className="font-data text-[clamp(64px,10vw,132px)] font-semibold leading-none tracking-[-0.045em] text-ink-primary">
        {time}
      </span>
      <div className="mt-4 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-secondary">
        <span className={`size-1.5 rounded-full ${isRunning ? 'bg-brand' : 'bg-ink-muted'}`} aria-hidden="true" />
        {phase}
      </div>
    </div>
  )

  if (style === 'minimal') {
    return (
      <div className="flex w-full max-w-[760px] flex-col items-center px-6">
        {timeBlock}
        <div className="mt-10 h-px w-full max-w-[520px] overflow-hidden bg-depth-border">
          <div className="h-full origin-left bg-brand" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="mt-4 font-data text-[12px] text-ink-muted">
          {sessionCount} session{sessionCount === 1 ? '' : 's'} today
        </p>
      </div>
    )
  }

  if (style === 'panel') {
    return (
      <div className="w-full max-w-[760px] border-y border-depth-border px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">Current interval</p>
            <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-primary">{phase} session</p>
            <p className="mt-2 font-data text-[12px] text-ink-secondary">{sessionCount} completed today</p>
          </div>
          <span className="font-data text-[clamp(64px,9vw,112px)] font-semibold leading-none tracking-[-0.045em] text-ink-primary">
            {time}
          </span>
        </div>
        <div className="mt-10 h-1 overflow-hidden rounded-full bg-depth-raised">
          <div className="h-full origin-left rounded-full bg-brand" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    )
  }

  return (
    <ProgressRing progress={progress} isRunning={isRunning} size={orbitSize} strokeWidth={6} color={ringColor}>
      <div className="scale-[0.72] sm:scale-75">{timeBlock}</div>
    </ProgressRing>
  )
}

export function TimerFullscreen() {
  const isFullscreen     = useUiStore((s) => s.isFullscreen)
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen)
  const displayStyle     = useUiStore((s) => s.fullscreenTimerStyle)
  const setDisplayStyle  = useUiStore((s) => s.setFullscreenTimerStyle)

  const userId = useAuthStore(s => s.user?.id ?? '')
  const { selectedProjectId, selectedTaskId } = useTimerStore()

  const { data: projects = [] } = useQuery({
    queryKey: projectKeys.active,
    queryFn:  () => fetchProjects(userId),
    enabled:  !!userId,
  })

  const { data: tasks = [] } = useQuery({
    queryKey: taskKeys.byProject(selectedProjectId ?? ''),
    queryFn:  () => fetchTasksByProject(selectedProjectId!),
    enabled:  !!selectedProjectId,
  })

  const projectName = projects.find((p) => p.id === selectedProjectId)?.name ?? null
  const taskName    = tasks.find((t) => t.id === selectedTaskId)?.title ?? null

  // Keep store in sync when the user exits via Escape or browser controls
  useEffect(() => {
    const handleChange = () => {
      const nativeIsFullscreen = !!document.fullscreenElement
      if (!nativeIsFullscreen && isFullscreen) toggleFullscreen()
      if (nativeIsFullscreen  && !isFullscreen) toggleFullscreen()
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [isFullscreen, toggleFullscreen])

  if (!isFullscreen) return null

  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else toggleFullscreen() // fallback if native wasn't active
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-depth-bg"
      style={{ background: 'var(--color-surface-base)' }}
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-depth-border px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-depth-border text-brand">
            <Focus size={15} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink-primary">{taskName ?? projectName ?? 'Focus session'}</p>
            <p className="truncate text-[11px] text-ink-muted">{taskName && projectName ? projectName : 'Depthly fullscreen'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={exitFullscreen}
          className="flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-medium text-ink-secondary transition-colors duration-200 hover:bg-depth-raised hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Exit fullscreen"
        >
          <X size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Exit fullscreen</span>
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 px-4 py-5 sm:gap-9 sm:px-8">
        <FullscreenTimerFace style={displayStyle} />
        <TimerControls />
      </main>

      <footer className="flex shrink-0 items-center justify-center px-4 pb-5 sm:pb-6">
        <div className="flex items-center gap-1 rounded-xl border border-depth-border bg-depth-surface p-1" aria-label="Fullscreen timer style">
          {DISPLAY_STYLES.map(({ value, label, icon: Icon }) => {
            const selected = displayStyle === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setDisplayStyle(value)}
                aria-pressed={selected}
                title={`${label} timer style`}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  selected ? 'bg-depth-raised text-ink-primary' : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>
      </footer>
    </div>
  )
}
