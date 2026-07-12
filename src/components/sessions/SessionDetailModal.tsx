import { Pencil, Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

interface SessionDetailModalProps {
  open:     boolean
  onClose:  () => void
  session:  SessionWithRelations | null
  onEdit:   () => void
  onDelete: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function SessionDetailModal({ open, onClose, session, onEdit, onDelete }: SessionDetailModalProps) {
  if (!session) return null

  const isBreak = session.type === 'break'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-depth-surface border-depth-border max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-ink-primary">Session details</DialogTitle>
            {isBreak ? (
              <Badge
                variant="outline"
                className="gap-1 border-depth-border bg-depth-raised text-ink-muted font-medium"
              >
                ☕ Break
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-brand/25 bg-brand/10 text-brand font-medium"
              >
                Focus
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">

          {/* Project + task */}
          {!isBreak && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-ink-muted">Project</p>
              {session.projects ? (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block shrink-0 rounded-full"
                    style={{ width: 10, height: 10, backgroundColor: session.projects.color }}
                  />
                  <span className="text-[14px] font-medium text-ink-primary">
                    {session.projects.name}
                  </span>
                </div>
              ) : (
                <span className="text-[14px] text-ink-muted">No project</span>
              )}
              {session.tasks && (
                <p className="text-[13px] text-ink-secondary">{session.tasks.title}</p>
              )}
            </div>
          )}

          {/* Date + time range */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-ink-muted">Date &amp; time</p>
            <p className="text-[14px] text-ink-primary">{formatDate(session.started_at)}</p>
            <p className="font-data text-[13px] text-ink-secondary">
              {formatTime(session.started_at)} &ndash; {formatTime(session.ended_at)}
            </p>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-ink-muted">Duration</p>
            <p className="font-data text-[15px] font-semibold text-ink-primary">
              {formatDuration(session.duration_mins)}
            </p>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-ink-muted">Notes</p>
            {session.notes ? (
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-depth-border bg-depth-raised px-3 py-2 text-[13px] text-ink-primary">
                {session.notes}
              </p>
            ) : (
              <p className="text-[13px] text-ink-muted">No notes for this session</p>
            )}
          </div>

        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="danger" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button type="button" variant="primary" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
