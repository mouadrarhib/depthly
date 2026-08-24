import { useState } from 'react'

import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { SessionModal } from '@/components/sessions/SessionModal'
import { useSessionsByProject } from '@/hooks/useSessions'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

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
  const [viewingSession, setViewingSession] = useState<SessionWithRelations | null>(null)
  const [editingSession, setEditingSession] = useState<SessionWithRelations | null>(null)

  function handleEditFromDetail() {
    if (!viewingSession) return
    setEditingSession(viewingSession)
    setViewingSession(null)
  }

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
    <>
      <div className="flex flex-col divide-y divide-depth-border overflow-hidden rounded-xl border border-depth-border bg-depth-surface sm:rounded-none sm:border-0 sm:bg-transparent">
        {sessions.map(session => (
          <button
            key={session.id}
            type="button"
            onClick={() => setViewingSession(session)}
            aria-label={`View session from ${formatDate(session.started_at)}, ${formatDuration(session.duration_mins)}`}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-3 py-3 text-left transition-colors hover:bg-depth-raised focus-visible:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:px-4"
          >
            <div className="flex min-w-0 flex-col gap-0.5 sm:w-32">
              <span className="font-data text-ink-secondary" style={{ fontSize: 13 }}>
                {formatDate(session.started_at)}
              </span>
              <span className="text-ink-muted" style={{ fontSize: 12 }}>
                {formatTime(session.started_at)}
              </span>
            </div>

            <div className="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1 sm:self-center sm:px-4">
              <span className="block truncate text-ink-muted" style={{ fontSize: 13 }}>
                {session.tasks?.title ?? 'No task'}
              </span>
            </div>

            <span
              className="font-data col-start-2 row-span-2 row-start-1 self-center text-ink-primary sm:col-start-3"
              style={{ fontSize: 14 }}
            >
              {formatDuration(session.duration_mins)}
            </span>
          </button>
        ))}
      </div>

      <SessionDetailModal
        open={!!viewingSession}
        onClose={() => setViewingSession(null)}
        session={viewingSession}
        onEdit={handleEditFromDetail}
      />

      <SessionModal
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession ?? undefined}
      />
    </>
  )
}
