import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { useProjects } from '@/hooks/useProjects'
import { useUpdateSession } from '@/hooks/useSessions'
import { useTasks } from '@/hooks/useTasks'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

interface SessionModalProps { open: boolean; onClose: () => void; session?: SessionWithRelations }

export function SessionModal({ open, onClose, session }: SessionModalProps) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const { data: projects } = useProjects()
  const { data: tasks } = useTasks(projectId ?? '')
  const update = useUpdateSession()

  useEffect(() => {
    if (!session) return
    setTitle(session.title ?? '')
    setNotes(session.notes ?? '')
    setProjectId(session.project_id)
    setTaskId(session.task_id)
  }, [session])

  if (!session) return null

  const save = () => update.mutate({ id: session.id, data: {
    title: title.trim() || null, notes: notes.trim() || null, project_id: projectId, task_id: taskId,
  } }, { onSuccess: onClose })

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <DialogContent className="max-w-md border-depth-border bg-depth-surface">
        <DialogHeader><DialogTitle className="text-ink-primary">Edit session details</DialogTitle></DialogHeader>
        <p className="text-[12px] text-ink-muted">Tracked time and dates are verified and cannot be changed.</p>
        <div className="flex flex-col gap-4">
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What did you focus on?" />
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-secondary">Project
            <select className="rounded-[8px] border border-depth-border bg-depth-raised px-3 py-2 text-[13px] text-ink-primary" value={projectId ?? ''}
              onChange={(event) => { setProjectId(event.target.value || null); setTaskId(null) }}>
              <option value="">No project</option>{projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-secondary">Task
            <select disabled={!projectId} className="rounded-[8px] border border-depth-border bg-depth-raised px-3 py-2 text-[13px] text-ink-primary disabled:opacity-50" value={taskId ?? ''} onChange={(event) => setTaskId(event.target.value || null)}>
              <option value="">No task</option>{tasks?.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-secondary">Notes
            <textarea className="min-h-24 resize-none rounded-[8px] border border-depth-border bg-depth-raised px-3 py-2 text-[13px] text-ink-primary focus:border-brand focus:outline-none" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          {update.isError ? <p className="text-[12px] text-red-400">Could not save session details.</p> : null}
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} isLoading={update.isPending}>Save changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
