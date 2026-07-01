import { useState, useEffect } from 'react'

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

function toLocalDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD
}

function toLocalTimeStr(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5) // HH:MM
}

const inputCls =
  'h-10 w-full rounded border border-border bg-surface-overlay px-3 text-sm text-text ' +
  'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors'

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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">

          {/* Date + Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">
              Date &amp; time
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={date}
                onChange={e => {
                  setDate(e.target.value)
                  if (dateError) setDateError('')
                }}
                required
                className={inputCls}
              />
              <input
                type="time"
                value={time}
                onChange={e => {
                  setTime(e.target.value)
                  if (dateError) setDateError('')
                }}
                required
                className={inputCls}
              />
            </div>
            {dateError && (
              <p className="text-xs text-feedback-error">{dateError}</p>
            )}
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">
              Duration (minutes)
            </label>
            <Stepper
              value={durationMins}
              min={1}
              max={480}
              onChange={setDurationMins}
            />
          </div>

          {/* Project */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Project</label>
            <Select
              value={projectId}
              onValueChange={v => {
                setProjectId(v === '__none__' ? '' : v)
                setTaskId('')
              }}
            >
              <SelectTrigger className="border-border bg-surface-overlay text-text">
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

          {/* Task */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Task</label>
            <Select
              value={taskId}
              onValueChange={v => setTaskId(v === '__none__' ? '' : v)}
              disabled={!projectId}
            >
              <SelectTrigger className="border-border bg-surface-overlay text-text">
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

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this session..."
              rows={3}
              className="w-full resize-none rounded border border-border bg-surface-overlay
                         px-3 py-2 text-sm text-text placeholder:text-text-faint
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
            <Button type="submit" variant="primary" isLoading={isPending}>
              {isEdit ? 'Save changes' : 'Add session'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
