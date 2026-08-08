import { useState, useEffect } from 'react'
import { Calendar, Clock, FolderOpen, CheckSquare, FileText, Plus, Check } from 'lucide-react'

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
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useUpdateSession, useCreateManualSession } from '@/hooks/useSessions'
import { STATUS_CONFIG } from '@/lib/utils/tasks'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

// No "Done" filter — logging a new session against a task that's already
// complete isn't a workflow worth a dedicated shortcut. Done tasks are still
// shown (and selectable) under "All" for the rare case of logging forgotten
// time; see the strikethrough styling below.
type TaskStatusFilter = 'all' | 'todo' | 'in_progress'

const TASK_STATUS_FILTERS: { value: TaskStatusFilter; label: string }[] = [
  { value: 'all',         label: 'All'         },
  { value: 'todo',        label: 'To Do'       },
  { value: 'in_progress', label: 'In Progress' },
]

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
  'font-data h-10 w-full min-w-0 max-w-full rounded-lg border border-depth-border bg-depth-raised px-3 text-sm text-ink-primary ' +
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
  // Task lists can run long once a project accumulates finished work —
  // without this, finding one specific task (especially an already-done one
  // buried among active tasks) meant scrolling a long undifferentiated list.
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('all')

  const { data: projects = [] } = useProjects()
  const { data: tasks = [] }    = useTasks(projectId)
  const filteredTasks = taskStatusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === taskStatusFilter)
  // Looked up from the full list, not filteredTasks — the selected task must
  // still resolve and display correctly even if the user picks a status
  // filter that would otherwise hide it from the open dropdown.
  const selectedProject = projects.find(p => p.id === projectId)
  const selectedTask    = tasks.find(t => t.id === taskId)

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
    setTaskStatusFilter('all')
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
      <DialogContent className="bg-depth-surface border-depth-border max-w-md overflow-x-hidden">
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

            {/* flex, not grid — native date/time inputs don't reliably respect
                CSS Grid's track-sizing constraints on WebKit (unlike the plain
                custom-styled Select triggers in "Link to work" below), and can
                overflow their grid cell even with width:100% set. Flexbox's
                shrink algorithm is honored properly for native form controls. */}
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs text-ink-secondary">
                  <Calendar size={12} /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => {
                    setDate(e.target.value)
                    if (dateError) setDateError('')
                  }}
                  required
                  style={{ colorScheme: 'dark' }}
                  className={nativeFieldCls}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs text-ink-secondary">
                  <Clock size={12} /> Start time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => {
                    setTime(e.target.value)
                    if (dateError) setDateError('')
                  }}
                  required
                  style={{ colorScheme: 'dark' }}
                  className={nativeFieldCls}
                />
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
                    setTaskStatusFilter('all')
                  }}
                >
                  <SelectTrigger className={cn(selectTriggerCls, '[&>span]:min-w-0 [&>span]:flex-1')}>
                    {/* Explicit children instead of letting SelectValue mirror
                        the full SelectItem content — that has no truncation,
                        so a long name would grow the closed trigger instead of
                        clipping. */}
                    <SelectValue placeholder="No project">
                      {selectedProject && (
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: selectedProject.color }}
                          />
                          <span className="truncate">{selectedProject.name}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex max-w-[240px] items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="truncate">{p.name}</span>
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

                {/* Status filter — only worth showing once there's actually
                    a list long enough to need narrowing down. */}
                {projectId && tasks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {TASK_STATUS_FILTERS.map(f => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setTaskStatusFilter(f.value)}
                        className="transition-colors"
                        style={{
                          padding:      '2px 8px',
                          fontSize:     11,
                          fontWeight:   500,
                          borderRadius: 999,
                          border:       '1px solid',
                          borderColor:  taskStatusFilter === f.value ? 'rgba(75,158,255,0.4)' : '#2E2E38',
                          background:   taskStatusFilter === f.value ? 'rgba(75,158,255,0.12)' : 'transparent',
                          color:        taskStatusFilter === f.value ? '#4B9EFF' : '#7A7890',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                <Select
                  value={taskId}
                  onValueChange={v => setTaskId(v === '__none__' ? '' : v)}
                  disabled={!projectId}
                >
                  <SelectTrigger className={cn(selectTriggerCls, '[&>span]:min-w-0 [&>span]:flex-1')}>
                    {/* Same reasoning as the Project trigger above — explicit,
                        truncated children instead of SelectValue's default
                        full-content mirroring. A long task title was the
                        original bug report: the closed trigger would grow to
                        6 lines tall and blow out the rest of the form. */}
                    <SelectValue placeholder="No task">
                      {selectedTask && (
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: STATUS_CONFIG[(selectedTask.status ?? 'todo') as 'todo' | 'in_progress' | 'done'].color }}
                          />
                          <span
                            className="truncate"
                            style={{
                              textDecoration: selectedTask.status === 'done' ? 'line-through' : 'none',
                              opacity:        selectedTask.status === 'done' ? 0.7 : 1,
                            }}
                          >
                            {selectedTask.title}
                          </span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No task</SelectItem>
                    {filteredTasks.map(t => {
                      const statusCfg = STATUS_CONFIG[(t.status ?? 'todo') as 'todo' | 'in_progress' | 'done']
                      const done = t.status === 'done'
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex max-w-[240px] items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: statusCfg.color }}
                            />
                            <span className="truncate" style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
                              {t.title}
                            </span>
                          </span>
                        </SelectItem>
                      )
                    })}
                    {filteredTasks.length === 0 && (
                      <p className="px-2 py-4 text-center text-xs text-ink-muted">
                        No {taskStatusFilter === 'all' ? '' : STATUS_CONFIG[taskStatusFilter].label.toLowerCase() + ' '}tasks
                      </p>
                    )}
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
