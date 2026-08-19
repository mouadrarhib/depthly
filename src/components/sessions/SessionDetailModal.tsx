import { Calendar, Clock, FolderOpen, FileText, Pencil, RotateCcw, XCircle } from 'lucide-react'

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

// ── Section label — icon + uppercase micro-label, matches SessionModal/TaskDetailModal ──

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} style={{ color: '#7A7890' }} />
      <span
        style={{
          fontSize:      11,
          fontWeight:    600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         '#7A7890',
        }}
      >
        {children}
      </span>
    </div>
  )
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

          {/* Session time */}
          <div
            style={{
              display:      'flex',
              flexDirection: 'column',
              gap:          12,
              borderRadius: 10,
              padding:      14,
              border:       '1px solid #2E2E38',
              borderLeft:   '2px solid #4B9EFF',
              background:   'rgba(255,255,255,0.015)',
            }}
          >
            <SectionLabel icon={Clock}>Session time</SectionLabel>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-xs text-ink-secondary">
                <Calendar size={12} /> Date
              </label>
              <p className="text-[14px] text-ink-primary">{formatDate(session.started_at)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-secondary">Start – End</label>
                <p className="font-data text-[13px] text-ink-primary">
                  {formatTime(session.started_at)} &ndash; {formatTime(session.ended_at)}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-secondary">Duration</label>
                <p className="font-data text-[15px] font-semibold text-ink-primary">
                  {formatDuration(session.duration_mins)}
                </p>
              </div>
            </div>
          </div>

          {/* Project + task */}
          {!isBreak && (
            <div
              style={{
                display:       'flex',
                flexDirection: 'column',
                gap:           8,
                borderRadius:  10,
                padding:       14,
                border:        '1px solid #2E2E38',
                background:    'rgba(255,255,255,0.015)',
              }}
            >
              <SectionLabel icon={FolderOpen}>Project &amp; task</SectionLabel>
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

          {/* Notes */}
          {session.title ? <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-secondary">Title</label>
            <p className="text-[14px] font-medium text-ink-primary">{session.title}</p>
          </div> : null}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-xs text-ink-secondary">
              <FileText size={12} /> Notes
            </label>
            {session.notes ? (
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-depth-border bg-depth-bg px-3 py-2 text-[13px] text-ink-primary">
                {session.notes}
              </p>
            ) : (
              <span style={{ color: '#3D3B4E', fontStyle: 'italic', fontSize: 13 }}>
                No notes for this session
              </span>
            )}
          </div>

        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {session.is_trusted && !isBreak ? <Button type="button" variant={session.excluded_at ? 'ghost' : 'danger'} onClick={onDelete} style={{ gap: 6 }}>
            {session.excluded_at ? <RotateCcw size={14} /> : <XCircle size={14} />}
            {session.excluded_at ? 'Restore' : 'Exclude'}
          </Button> : null}
          <Button type="button" variant="primary" onClick={onEdit} style={{ gap: 6 }}>
            <Pencil size={14} />
            Edit
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
