import { useState, useEffect } from 'react'
import { Calendar, ChevronDown, Clock, FolderOpen, CheckSquare, FileText, Plus, Check } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/Stepper'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useUpdateSession, useCreateManualSession } from '@/hooks/useSessions'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

interface SessionModalProps {
  open:     boolean
  onClose:  () => void
  session?: SessionWithRelations
}

const DURATION_PRESETS = [15, 25, 30, 45, 60]

function toLocalDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD
}

function toLocalTimeStr(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5) // HH:MM
}

// ── Section label — icon + uppercase micro-label, matches TimerSettings/TaskDetailModal ──

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

// ── Native date/time inputs, restyled to match the app's own fields ─────────
// color-scheme:dark tells the browser to render its native calendar/clock
// picker glyph and popover in a dark-appropriate tone instead of assuming a
// light page — the default (unset) is what made these look like a raw OS
// widget dropped onto a dark UI rather than part of it.

const nativeFieldCls =
  'font-data h-10 w-full rounded-lg border border-depth-border bg-depth-raised px-3 text-sm text-ink-primary ' +
  'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors'

const selectTriggerCls = 'border-depth-border bg-depth-raised text-ink-primary h-10 rounded-lg'

export function SessionModal({ open, onClose, session }: SessionModalProps) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  const isEdit = !!session

  const [date,         setDate]         = useState('')
  const [time,         setTime]         = useState('')
  const [durationMins, setDurationMins] = useState(25)
  const [projectId,    setProjectId]    = useState('')
  const [taskId,       setTaskId]       = useState('')
  const [notes,        setNotes]        = useState('')
  const [dateError,    setDateError]    = useState('')

  const { data: projects = [] } = useProjects()
  const { data: tasks = [] }    = useTasks(projectId)

  const updateSession       = useUpdateSession()
  const createManualSession = useCreateManualSession()
  const mutation            = isEdit ? updateSession : createManualSession
  const isPending           = mutation.isPending

  const mutationError =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong'
        : null

  useEffect(() => {
    if (!open) return
    if (session) {
      setDate(toLocalDateStr(session.started_at))
      setTime(toLocalTimeStr(session.started_at))
      setDurationMins(session.duration_mins)
      setProjectId(session.project_id ?? '')
      setTaskId(session.task_id ?? '')
      setNotes(session.notes ?? '')
    } else {
      const now = new Date()
      setDate(now.toLocaleDateString('en-CA'))
      setTime(now.toTimeString().slice(0, 5))
      setDurationMins(25)
      setProjectId('')
      setTaskId('')
      setNotes('')
    }
    setDateError('')
    updateSession.reset()
    createManualSession.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // "Ends at" preview — quiet confirmation that date + time + duration add
  // up to what the user expects, without making them do the math.
  const endTimeLabel = (() => {
    if (!date || !time) return null
    const start = new Date(`${date}T${time}`)
    if (Number.isNaN(start.getTime())) return null
    const end = new Date(start.getTime() + durationMins * 60_000)
    return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  })()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!date || !time) {
      setDateError('Date and time are required')
      return
    }
    setDateError('')

    const startMs  = new Date(`${date}T${time}`).getTime()
    const startedAt = new Date(startMs).toISOString()
    const endedAt   = new Date(startMs + durationMins * 60_000).toISOString()
    const notesTrimmed = notes.trim() || null

    if (isEdit) {
      updateSession.mutate(
        {
          id:   session.id,
          data: {
            project_id:    projectId || null,
            task_id:       taskId || null,
            duration_mins: durationMins,
            started_at:    startedAt,
            ended_at:      endedAt,
            notes:         notesTrimmed,
          },
        },
        { onSuccess: onClose },
      )
    } else {
      createManualSession.mutate(
        {
          user_id:       userId,
          project_id:    projectId || null,
          task_id:       taskId || null,
          duration_mins: durationMins,
          started_at:    startedAt,
          ended_at:      endedAt,
          notes:         notesTrimmed,
          local_date:    date,
        },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-depth-surface border-depth-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink-primary">
            {isEdit ? 'Edit session' : 'Add session'}
          </DialogTitle>
          <p style={{ fontSize: 13, color: '#7A7890' }}>
            {isEdit
              ? 'Update the time, duration, or project for this session.'
              : 'Log a focus session you tracked outside the timer.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs text-ink-secondary">
                  <Calendar size={12} /> Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={e => {
                      setDate(e.target.value)
                      if (dateError) setDateError('')
                    }}
                    required
                    style={{ colorScheme: 'dark' }}
                    className={`${nativeFieldCls} pr-9`}
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary opacity-50" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs text-ink-secondary">
                  <Clock size={12} /> Start time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={time}
                    onChange={e => {
                      setTime(e.target.value)
                      if (dateError) setDateError('')
                    }}
                    required
                    style={{ colorScheme: 'dark' }}
                    className={`${nativeFieldCls} pr-9`}
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary opacity-50" />
                </div>
              </div>
            </div>
            {dateError && (
              <p className="text-xs text-feedback-error">{dateError}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-secondary">Duration</label>
              <div className="flex flex-wrap items-center gap-2">
                <Stepper
                  value={durationMins}
                  min={1}
                  max={480}
                  onChange={setDurationMins}
                />
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMins(mins)}
                      className="transition-colors"
                      style={{
                        padding:      '4px 10px',
                        fontSize:     12,
                        fontWeight:   500,
                        borderRadius: 999,
                        border:       '1px solid',
                        borderColor:  durationMins === mins ? 'rgba(75,158,255,0.4)' : '#2E2E38',
                        background:   durationMins === mins ? 'rgba(75,158,255,0.12)' : 'transparent',
                        color:        durationMins === mins ? '#4B9EFF' : '#7A7890',
                      }}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {endTimeLabel && (
              <p className="font-data text-xs" style={{ color: '#7A7890' }}>
                Ends at {endTimeLabel}
              </p>
            )}
          </div>

          {/* Link to work */}
          <div
            style={{
              display:       'flex',
              flexDirection: 'column',
              gap:           10,
              borderRadius:  10,
              padding:       14,
              border:        '1px solid #2E2E38',
              background:    'rgba(255,255,255,0.015)',
            }}
          >
            <SectionLabel icon={FolderOpen}>Link to work (optional)</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs text-ink-secondary">
                  <FolderOpen size={12} /> Project
                </label>
                <Select
                  value={projectId}
                  onValueChange={v => {
                    setProjectId(v === '__none__' ? '' : v)
                    setTaskId('')
                  }}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs text-ink-secondary">
                  <CheckSquare size={12} /> Task
                </label>
                <Select
                  value={taskId}
                  onValueChange={v => setTaskId(v === '__none__' ? '' : v)}
                  disabled={!projectId}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="No task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No task</SelectItem>
                    {tasks.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-xs text-ink-secondary">
              <FileText size={12} /> Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this session..."
              rows={3}
              className="w-full resize-none rounded-lg border border-depth-border bg-depth-raised
                         px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted
                         focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand
                         transition-colors"
            />
          </div>

          {/* Mutation error */}
          {mutationError && (
            <p className="text-xs text-feedback-error">{mutationError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending} style={{ gap: 6 }}>
              {isEdit ? <Check size={14} /> : <Plus size={14} />}
              {isEdit ? 'Save changes' : 'Add session'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
