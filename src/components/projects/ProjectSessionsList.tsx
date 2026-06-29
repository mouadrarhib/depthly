import { useSessionsByProject } from '@/hooks/useSessions'

interface ProjectSessionsListProps {
  projectId: string
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3 animate-pulse">
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-24 rounded bg-depth-raised" />
        <div className="h-3 w-16 rounded bg-depth-raised" />
      </div>
      <div className="h-3.5 w-20 rounded bg-depth-raised" />
      <div className="h-4 w-12 rounded bg-depth-raised" />
    </div>
  )
}

export function ProjectSessionsList({ projectId }: ProjectSessionsListProps) {
  const { data: sessions = [], isLoading } = useSessionsByProject(projectId)

  if (isLoading) {
    return (
      <div className="flex flex-col divide-y divide-depth-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-muted text-sm">
          No sessions recorded for this project yet
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-depth-border">
      {sessions.map(session => (
        <div
          key={session.id}
          className="flex items-center justify-between px-4 py-3 hover:bg-depth-raised transition-colors"
        >
          {/* Date + time */}
          <div className="flex flex-col gap-0.5 w-32 shrink-0">
            <span className="font-data text-ink-secondary" style={{ fontSize: 13 }}>
              {formatDate(session.started_at)}
            </span>
            <span className="text-ink-muted" style={{ fontSize: 12 }}>
              {formatTime(session.started_at)}
            </span>
          </div>

          {/* Task name — title join added in Phase 4 when tasks are built */}
          <div className="flex-1 px-4">
            <span className="text-ink-muted" style={{ fontSize: 13 }}>
              No task
            </span>
          </div>

          {/* Duration */}
          <span
            className="font-data text-ink-primary shrink-0"
            style={{ fontSize: 14 }}
          >
            {formatDuration(session.duration_mins)}
          </span>
        </div>
      ))}
    </div>
  )
}
