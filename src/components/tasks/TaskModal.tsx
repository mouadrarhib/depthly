import { useState, useEffect } from 'react'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Stepper } from '@/components/ui/Stepper'
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import type { Task } from '@/lib/supabase/queries/tasks'
import { monthRange, weekRange , dateKey } from '@/lib/utils/plannerDates'
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/utils/tasks'
import { useAuthStore } from '@/store/authStore'

type Status = 'todo' | 'in_progress' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface TaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  task?: Task
  defaultStatus?: Status
}

export function TaskModal({ open, onClose, projectId, task, defaultStatus }: TaskModalProps) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const isEdit = !!task

  const { data: tasks = [] } = useTasks(projectId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('todo')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [repeatStart, setRepeatStart] = useState(() => dateKey(new Date()))
  const [repeatEnd, setRepeatEnd] = useState('')
  const [planningError, setPlanningError] = useState('')
  const [useEstimate, setUseEstimate] = useState(false)
  const [estimate, setEstimate] = useState(1)
  const [titleError, setTitleError] = useState('')

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const mutation = isEdit ? updateTask : createTask
  const isPending = mutation.isPending
  const mutationError =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong'
        : null

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '')
      setDescription(task?.description ?? '')
      setStatus((task?.status as Status) ?? defaultStatus ?? 'todo')
      setPriority((task?.priority as Priority) ?? 'medium')
      setDueDate(task?.due_date ?? '')
      setPlannedStart(task?.planned_start_date ?? '')
      setPlannedEnd(task?.planned_end_date ?? '')
      setScheduledDate(task?.scheduled_date ?? '')
      setRepeatDays(task?.repeat_days ?? [])
      setRepeatStart(task?.repeat_start_date ?? dateKey(new Date()))
      setRepeatEnd(task?.repeat_end_date ?? '')
      setPlanningError('')
      setUseEstimate(task?.estimated_pomodoros != null)
      setEstimate(task?.estimated_pomodoros ?? 1)
      setTitleError('')
      createTask.reset()
      updateTask.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Title is required')
      return
    }
    if (trimmed.length > 100) {
      setTitleError('Title must be 100 characters or fewer')
      return
    }
    setTitleError('')

    if (
      repeatDays.length === 0 &&
      (Boolean(plannedStart) !== Boolean(plannedEnd) ||
        (plannedStart && plannedEnd && plannedStart > plannedEnd))
    ) {
      setPlanningError('Choose a valid start and end date for the plan.')
      return
    }
    setPlanningError('')

    if (repeatDays.length && (!repeatStart || (repeatEnd && repeatEnd < repeatStart))) {
      setPlanningError('Choose a valid start and end date for this repeat.')
      return
    }
    const repeating = repeatDays.length > 0
    const repeatFields = {
      repeat_days: repeating ? repeatDays : null,
      repeat_start_date: repeating ? repeatStart : null,
      repeat_end_date: repeating ? repeatEnd || null : null,
    }

    if (isEdit) {
      updateTask.mutate(
        {
          id: task.id,
          projectId,
          data: {
            title: trimmed,
            description: description.trim() || undefined,
            status,
            priority,
            due_date: dueDate || null,
            planned_start_date: repeating ? null : plannedStart || null,
            planned_end_date: repeating ? null : plannedEnd || null,
            scheduled_date: repeating ? null : scheduledDate || null,
            ...repeatFields,
            estimated_pomodoros: useEstimate ? estimate : null,
          },
        },
        { onSuccess: onClose }
      )
    } else {
      const list_order = tasks.length + 1
      const kanban_order = tasks.filter((t) => t.status === status).length + 1

      createTask.mutate(
        {
          user_id: userId,
          project_id: projectId,
          title: trimmed,
          description: description.trim() || undefined,
          status,
          priority,
          due_date: dueDate || undefined,
          planned_start_date: repeating ? null : plannedStart || null,
          planned_end_date: repeating ? null : plannedEnd || null,
          scheduled_date: repeating ? null : scheduledDate || null,
          ...repeatFields,
          estimated_pomodoros: useEstimate ? estimate : undefined,
          list_order,
          kanban_order,
        },
        { onSuccess: onClose }
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-md border-depth-border bg-depth-surface">
        <DialogHeader>
          <DialogTitle className="text-ink-primary">
            {isEdit ? 'Edit task' : 'New task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {/* Title */}
          <Input
            label="Task title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError('')
            }}
            placeholder="Task title"
            maxLength={100}
            error={titleError}
            autoFocus
          />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full resize-none rounded border border-border bg-surface-overlay px-3 py-2 text-sm text-text transition-colors placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="border-border bg-surface-overlay text-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(STATUS_CONFIG) as [Status, { label: string; color: string }][]
                  ).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="border-border bg-surface-overlay text-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(PRIORITY_CONFIG) as [
                      Priority,
                      { label: string; color: string },
                    ][]
                  ).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block shrink-0 rounded-full"
                          style={{ width: 8, height: 8, backgroundColor: cfg.color }}
                        />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Due date (optional)</label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded border border-border bg-surface-overlay px-3 text-sm text-text transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  aria-label="Clear date"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-depth-border pt-4">
            <div>
              <p className="text-sm font-medium text-ink-primary">Repeat</p>
              <p className="mt-1 text-xs text-ink-secondary">
                Add this task to each selected day. Each day gets its own completion.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Never', days: [] },
                { label: 'Every day', days: [1, 2, 3, 4, 5, 6, 7] },
                { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setRepeatDays(option.days)}
                  aria-pressed={repeatDays.join(',') === option.days.join(',')}
                  className={`min-h-10 rounded-md border px-3 text-xs transition-colors ${repeatDays.join(',') === option.days.join(',') ? 'border-brand bg-brand/15 text-brand' : 'border-depth-border text-ink-secondary hover:text-ink-primary'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Repeat on these days">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => {
                const day = index + 1
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setRepeatDays((current) =>
                        current.includes(day)
                          ? current.filter((item) => item !== day)
                          : [...current, day].sort()
                      )
                    }
                    aria-label={`Repeat on ${label}`}
                    aria-pressed={repeatDays.includes(day)}
                    className={`size-10 rounded-md border text-xs font-medium ${repeatDays.includes(day) ? 'border-brand bg-brand/20 text-brand' : 'border-depth-border text-ink-secondary hover:text-ink-primary'}`}
                  >
                    {label.slice(0, 2)}
                  </button>
                )
              })}
            </div>
            {repeatDays.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-ink-secondary">
                  Starts
                  <input
                    type="date"
                    value={repeatStart}
                    onChange={(event) => setRepeatStart(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-depth-border bg-depth-raised px-2 text-sm text-ink-primary"
                  />
                </label>
                <label className="text-xs text-ink-secondary">
                  Ends (optional)
                  <input
                    type="date"
                    min={repeatStart}
                    value={repeatEnd}
                    onChange={(event) => setRepeatEnd(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-depth-border bg-depth-raised px-2 text-sm text-ink-primary"
                  />
                </label>
              </div>
            )}
            {repeatDays.length > 0 && (
              <p className="text-xs text-ink-secondary">
                The project keeps one task. Focus time stays linked to it.
              </p>
            )}
          </div>

          {repeatDays.length === 0 && (
            <div className="space-y-3 border-t border-depth-border pt-4">
              <div>
                <p className="text-sm font-medium text-ink-primary">Work plan</p>
                <p className="mt-1 text-xs text-ink-secondary">
                  Choose when to work on this task. The due date above stays its deadline.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const [start, end] = weekRange(new Date())
                    setPlannedStart(start)
                    setPlannedEnd(end)
                  }}
                  className="min-h-10 rounded-md border border-depth-border px-3 text-xs text-ink-primary hover:bg-depth-raised"
                >
                  This week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const [start, end] = monthRange(new Date())
                    setPlannedStart(start)
                    setPlannedEnd(end)
                  }}
                  className="min-h-10 rounded-md border border-depth-border px-3 text-xs text-ink-primary hover:bg-depth-raised"
                >
                  This month
                </button>
                {(plannedStart || plannedEnd) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlannedStart('')
                      setPlannedEnd('')
                    }}
                    className="min-h-10 px-2 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    Clear plan
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-ink-secondary">
                  Plan starts
                  <input
                    type="date"
                    value={plannedStart}
                    onChange={(event) => setPlannedStart(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-depth-border bg-depth-raised px-2 text-sm text-ink-primary"
                  />
                </label>
                <label className="text-xs text-ink-secondary">
                  Plan ends
                  <input
                    type="date"
                    value={plannedEnd}
                    onChange={(event) => setPlannedEnd(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-depth-border bg-depth-raised px-2 text-sm text-ink-primary"
                  />
                </label>
              </div>
              <label className="block text-xs text-ink-secondary">
                Work on a specific day (optional)
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-depth-border bg-depth-raised px-2 text-sm text-ink-primary"
                />
              </label>
              {planningError && (
                <p role="alert" className="text-xs text-red-400">
                  {planningError}
                </p>
              )}
            </div>
          )}

          {/* Estimated sessions */}
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-muted">
              <input
                type="checkbox"
                checked={useEstimate}
                onChange={(e) => setUseEstimate(e.target.checked)}
                className="rounded border-border accent-brand"
              />
              Set estimate
            </label>
            {useEstimate && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-muted">Estimated sessions</span>
                <Stepper value={estimate} min={1} max={20} onChange={setEstimate} />
              </div>
            )}
          </div>

          {/* Mutation error */}
          {mutationError && <p className="text-xs text-feedback-error">{mutationError}</p>}

          <DialogFooter className="pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              {isEdit ? 'Save changes' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
