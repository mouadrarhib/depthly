import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

interface SessionDetailModalProps {
  open: boolean
  onClose: () => void
  session: SessionWithRelations | null
  onEdit: () => void
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
}
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function SessionDetailModal({ open, onClose, session, onEdit }: SessionDetailModalProps) {
  if (!session) return null
  const isBreak = session.type === 'break'
  const start = new Date(session.started_at)
  const end = new Date(session.ended_at)
  const overnight = start.toDateString() !== end.toDateString()
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-depth-border bg-depth-surface p-0 sm:max-w-[600px] [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="shrink-0 px-5 pb-5 pt-6 text-left sm:px-8">
          <div className="flex flex-wrap items-center gap-3 pr-10">
            <DialogTitle className="text-xl font-medium tracking-tight text-ink-primary sm:text-2xl">
              Session details
            </DialogTitle>
            <span
              className={`rounded-md border px-2.5 py-1 text-xs ${isBreak ? 'border-depth-border bg-depth-raised text-ink-primary/75' : 'border-brand/25 bg-brand/10 text-brand'}`}
            >
              {isBreak ? 'Break' : 'Focus'}
            </span>
          </div>
          <DialogDescription className="text-sm leading-6 text-ink-primary/75">
            {start.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto px-5 pb-5 sm:px-8">
          <section
            aria-label="Recorded session timing"
            className="grid grid-cols-2 items-start gap-x-5 gap-y-4 border-b border-depth-border pb-5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <p className="font-data break-words text-3xl leading-tight tracking-tight text-ink-primary sm:text-4xl">
                {formatDuration(session.duration_mins)}
              </p>
              <p className="mt-2 text-xs text-ink-primary/70">
                Recorded {isBreak ? 'break' : 'focus'} time
              </p>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs text-ink-primary/70">Started</h2>
              <time
                dateTime={session.started_at}
                className="font-data mt-2 block text-sm text-ink-primary"
              >
                {formatTime(session.started_at)}
              </time>
              {overnight && (
                <p className="mt-1 text-xs text-ink-primary/70">
                  {start.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs text-ink-primary/70">Ended</h2>
              <time
                dateTime={session.ended_at}
                className="font-data mt-2 block text-sm text-ink-primary"
              >
                {formatTime(session.ended_at)}
              </time>
              {overnight && (
                <p className="mt-1 text-xs text-ink-primary/70">
                  {end.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </section>
          {!isBreak && (
            <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-4 gap-y-4 border-b border-depth-border pb-5 text-sm sm:grid-cols-[128px_minmax(0,1fr)]">
              <dt className="text-ink-primary/70">Project</dt>
              <dd className="flex min-w-0 items-start gap-2 text-ink-primary">
                {session.projects && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: session.projects.color }}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 break-words">
                  {session.projects?.name ?? 'No project'}
                </span>
              </dd>
              <dt className="text-ink-primary/70">Task</dt>
              <dd className="min-w-0 break-words text-ink-primary">
                {session.tasks?.title ?? 'No task linked'}
              </dd>
            </dl>
          )}
          {session.title && (
            <section aria-label="Session title">
              <h2 className="text-sm font-medium text-ink-primary">Title</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink-primary/85">
                {session.title}
              </p>
            </section>
          )}
          <section aria-label="Session notes">
            <h2 className="text-sm font-medium text-ink-primary">Notes</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink-primary/75">
              {session.notes?.trim() ? session.notes : 'No notes added.'}
            </p>
          </section>
          <div className="space-y-1 border-t border-depth-border pt-4 text-xs leading-5 text-ink-primary/70">
            <p>
              {isBreak ? 'Edit the title and notes.' : 'Edit the title, notes, project, or task.'}
            </p>
            <p>Recorded time stays unchanged.</p>
          </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-depth-border px-5 py-4 sm:px-8">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="primary" onClick={onEdit}>
            <Pencil size={15} />
            Edit details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
