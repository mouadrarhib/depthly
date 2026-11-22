import { ArrowRight, Clock3, LockKeyhole, Pencil } from 'lucide-react'

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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-xl border-border bg-card p-0 text-card-foreground shadow-modal sm:max-w-[540px] [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="shrink-0 px-5 pb-4 pt-5 text-left sm:px-6">
          <div className="flex flex-wrap items-center gap-3 pr-10">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Session details
            </DialogTitle>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${isBreak ? 'bg-muted text-muted-foreground' : 'bg-brand/10 text-brand'}`}
            >
              <Clock3 size={12} aria-hidden="true" />
              {isBreak ? 'Break' : 'Focus'}
            </span>
          </div>
          <DialogDescription className="text-xs leading-6 text-muted-foreground">
            {start.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto px-5 pb-5 sm:px-6">
          <section
            aria-label="Recorded session timing"
            className="flex flex-col items-start justify-between gap-5 border-y border-border py-5 min-[480px]:flex-row min-[480px]:items-center"
          >
            <div className="min-w-0">
              <p className="font-data break-words text-[38px] font-semibold leading-none tracking-tight text-foreground">
                {session.duration_mins < 60 ? <>{session.duration_mins}<span className="ml-1.5 text-lg font-normal text-muted-foreground">min</span></> : formatDuration(session.duration_mins)}
              </p>
              <p className="mt-2.5 text-xs text-muted-foreground">
                Recorded {isBreak ? 'break' : 'focus'} time
              </p>
            </div>
            <div className="grid w-full grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-start gap-x-4 min-[480px]:w-auto min-[480px]:grid-cols-[auto_20px_auto]">
            <div className="min-w-0">
              <h2 className="text-xs font-medium text-muted-foreground">Started</h2>
              <time
                dateTime={session.started_at}
                className="font-data mt-2 block whitespace-nowrap text-xs font-medium text-foreground"
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
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" className="mt-6 text-muted-foreground" />
            <div className="min-w-0">
              <h2 className="text-xs font-medium text-muted-foreground">Ended</h2>
              <time
                dateTime={session.ended_at}
                className="font-data mt-2 block whitespace-nowrap text-xs font-medium text-foreground"
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
            </div>
          </section>
          {!isBreak && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="min-w-0">
              <dt className="mb-1.5 text-xs text-muted-foreground">Project</dt>
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
              </div>
              <div className="min-w-0">
              <dt className="mb-1.5 text-xs text-muted-foreground">Task</dt>
              <dd className="min-w-0 break-words text-ink-primary">
                {session.tasks?.title ?? 'No task linked'}
              </dd>
              </div>
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
            <h2 className="text-xs font-medium text-muted-foreground">Notes</h2>
            <p className={`mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 ${session.notes?.trim() ? 'text-foreground' : 'text-muted-foreground'}`}>
              {session.notes?.trim() ? session.notes : 'No notes added.'}
            </p>
          </section>
          <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
            <LockKeyhole size={13} className="shrink-0" aria-hidden="true" />
            You can edit the details. Recorded time stays unchanged.
          </p>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-3 sm:px-6">
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
