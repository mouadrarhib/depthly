import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchActiveProjects, projectKeys } from '@/lib/supabase/queries/projects'
import { fetchTasksByProject, taskKeys } from '@/lib/supabase/queries/tasks'
import { useTimerStore } from '@/store/timerStore'
import { useUiStore } from '@/store'

import { TimerDisplay } from './TimerDisplay'
import { TimerControls } from './TimerControls'

export function TimerFullscreen() {
  const isFullscreen     = useUiStore((s) => s.isFullscreen)
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen)

  const { selectedProjectId, selectedTaskId } = useTimerStore()

  const { data: projects = [] } = useQuery({
    queryKey: projectKeys.active,
    queryFn:  fetchActiveProjects,
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
      style={{ background: 'var(--color-surface-base)' }}
    >
      {/* Exit button */}
      <button
        onClick={exitFullscreen}
        className="absolute right-6 top-6 rounded-md px-3 py-1.5 text-sm transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'var(--color-surface-overlay)'
          el.style.color      = 'var(--color-text)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'transparent'
          el.style.color      = 'var(--color-text-muted)'
        }}
        aria-label="Exit fullscreen"
      >
        Exit fullscreen
      </button>

      {/* Project / task context */}
      {projectName ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {projectName}
          </span>
          {taskName ? (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {taskName}
            </span>
          ) : null}
        </div>
      ) : null}

      <TimerDisplay />

      <TimerControls />
    </div>
  )
}
