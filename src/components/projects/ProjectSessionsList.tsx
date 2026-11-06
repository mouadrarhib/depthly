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
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center justify-between px-4 py-3">
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
  const { data: sessions = [], isLoading, isError, refetch } = useSessionsByProject(projectId)
  const [viewingSession, setViewingSession] = useState<SessionWithRelations | null>(null)
  const [editingSession, setEditingSession] = useState<SessionWithRelations | null>(null)

  function handleEditFromDetail() {
    if (!viewingSession) return
    setEditingSession(viewingSession)
    setViewingSession(null)
  }

  if (isLoading)
    return (
      <div aria-label="Loading sessions">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    )
  if (isError)
    return (
      <div role="alert" className="py-10 text-center text-sm text-ink-primary">
        <p>We couldn’t load session history.</p>
        <button onClick={() => void refetch()} className="mt-3 min-h-11 px-4 text-brand">
          Retry
        </button>
      </div>
    )
  if (!sessions.length)
    return (
      <div className="py-12 text-center">
        <h2 className="text-base font-medium text-ink-primary">No sessions yet</h2>
        <p className="mt-2 text-sm text-ink-primary/75">
          Choose this project in the timer to record your first focus session.
        </p>
        <a href="/timer" className="mt-3 inline-flex min-h-11 items-center text-sm text-brand">
          Open timer →
        </a>
      </div>
    )
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-ink-primary">Session history</h2>
          <p className="mt-1 text-xs text-ink-primary/75">
            Showing {sessions.length} recent focus sessions · up to 50
          </p>
        </div>
        <p className="font-data text-sm text-ink-primary">
          Shown {formatDuration(sessions.reduce((sum, session) => sum + session.duration_mins, 0))}
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-depth-border">
        <div className="hidden grid-cols-[minmax(0,1fr)_240px_100px] gap-4 border-b border-depth-border bg-depth-surface px-4 py-3 text-xs text-ink-primary/70 md:grid">
          <span>Task</span>
          <span>Date &amp; start time</span>
          <span className="text-right">Duration</span>
        </div>
        <div className="divide-y divide-depth-border">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setViewingSession(session)}
              aria-label={`View session: ${session.tasks?.title ?? 'No task'}, ${formatDate(session.started_at)}, ${formatDuration(session.duration_mins)}`}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 text-left transition-colors hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand md:grid-cols-[minmax(0,1fr)_240px_100px]"
            >
              <span className="min-w-0 break-words text-sm text-ink-primary">
                {session.tasks?.title ?? 'No task'}
              </span>
              <span className="col-start-1 row-start-2 text-xs text-ink-primary/75 md:col-start-2 md:row-start-1">
                {formatDate(session.started_at)} · {formatTime(session.started_at)}
              </span>
              <span className="font-data col-start-2 row-span-2 row-start-1 text-right text-sm text-ink-primary md:col-start-3 md:row-span-1">
                {formatDuration(session.duration_mins)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-primary/70">
        Open a session to review its details. “No task” means the session is linked only to this
        project.
      </p>

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
