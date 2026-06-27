import { useQuery } from '@tanstack/react-query'

import { fetchActiveProjects, projectKeys } from '@/lib/supabase/queries/projects'
import { fetchTasksByProject, taskKeys } from '@/lib/supabase/queries/tasks'
import { useTimerStore } from '@/store/timerStore'
import { useUiStore } from '@/store'

import { TimerDisplay } from './TimerDisplay'
import { TimerControls } from './TimerControls'

export function TimerFullscreen() {
  const isFullscreen    = useUiStore((s) => s.isFullscreen)
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

  if (!isFullscreen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-surface-base">
      {/* Exit button */}
      <button
        onClick={toggleFullscreen}
        className="absolute right-6 top-6 rounded-md px-3 py-1.5 text-sm text-text-muted
          hover:bg-surface-overlay hover:text-text transition-colors"
        aria-label="Exit fullscreen"
      >
        Exit
      </button>

      {/* Project / task context */}
      {projectName ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-text">{projectName}</span>
          {taskName ? (
            <span className="text-xs text-text-muted">{taskName}</span>
          ) : null}
        </div>
      ) : null}

      <TimerDisplay />

      <TimerControls />
    </div>
  )
}
