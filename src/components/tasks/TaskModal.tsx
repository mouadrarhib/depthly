import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
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
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/utils/tasks'
import type { Task } from '@/lib/supabase/queries/tasks'

interface TaskModalProps {
  open:      boolean
  onClose:   () => void
  projectId: string
  task?:     Task
}

type Status   = 'todo' | 'in_progress' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

export function TaskModal({ open, onClose, projectId, task }: TaskModalProps) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  const isEdit = !!task

  const { data: tasks = [] } = useTasks(projectId)

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [status,      setStatus]      = useState<Status>('todo')
  const [priority,    setPriority]    = useState<Priority>('medium')
  const [dueDate,     setDueDate]     = useState('')
  const [useEstimate, setUseEstimate] = useState(false)
  const [estimate,    setEstimate]    = useState(1)
  const [titleError,  setTitleError]  = useState('')

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const mutation   = isEdit ? updateTask : createTask
  const isPending  = mutation.isPending
  const mutationError = mutation.error instanceof Error
    ? mutation.error.message
    : mutation.error ? 'Something went wrong' : null

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '')
      setDescription(task?.description ?? '')
      setStatus((task?.status as Status) ?? 'todo')
      setPriority((task?.priority as Priority) ?? 'medium')
      setDueDate(task?.due_date ?? '')
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

    if (isEdit) {
      updateTask.mutate(
        {
          id:        task.id,
          projectId,
          data: {
            title:               trimmed,
            description:         description.trim() || undefined,
            status,
            priority,
            due_date:            dueDate || null,
            estimated_pomodoros: useEstimate ? estimate : null,
          },
        },
        { onSuccess: onClose },
      )
    } else {
      const list_order   = tasks.length + 1
      const kanban_order = tasks.filter(t => t.status === status).length + 1

      createTask.mutate(
        {
          user_id:             userId,
          project_id:          projectId,
          title:               trimmed,
          description:         description.trim() || undefined,
          status,
          priority,
          due_date:            dueDate || undefined,
          estimated_pomodoros: useEstimate ? estimate : undefined,
          list_order,
          kanban_order,
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
            {isEdit ? 'Edit task' : 'New task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">

          {/* Title */}
          <Input
            label="Task title"
            value={title}
            onChange={e => {
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
            <label className="text-sm font-medium text-text-muted">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full resize-none rounded border border-border bg-surface-overlay
                         px-3 py-2 text-sm text-text placeholder:text-text-faint
                         focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand
                         transition-colors"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Status</label>
              <Select value={status} onValueChange={v => setStatus(v as Status)}>
                <SelectTrigger className="border-border bg-surface-overlay text-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_CONFIG) as [Status, { label: string; color: string }][]).map(
                    ([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Priority</label>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger className="border-border bg-surface-overlay text-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, { label: string; color: string }][]).map(
                    ([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block shrink-0 rounded-full"
                            style={{ width: 8, height: 8, backgroundColor: cfg.color }}
                          />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">
              Due date (optional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="h-10 w-full rounded border border-border bg-surface-overlay
                           px-3 text-sm text-text
                           focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand
                           transition-colors"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  aria-label="Clear date"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted
                             transition-colors hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Estimated sessions */}
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-muted">
              <input
                type="checkbox"
                checked={useEstimate}
                onChange={e => setUseEstimate(e.target.checked)}
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
              {isEdit ? 'Save changes' : 'Create task'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
