import { useState, useEffect } from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/button'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import { useAuthStore } from '@/store/authStore'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>

const PRESET_COLORS = [
  '#4B9EFF', '#3DD68C', '#F5A623', '#F25C5C', '#C8FF64',
  '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#94A3B8',
]

const PRESET_ICONS = [
  '💼', '📚', '⚡', '🎨', '🔧', '🚀', '💡', '🎯',
  '📝', '🏆', '🔬', '💻', '🎵', '🌱', '📊', '⭐',
]

interface ProjectModalProps {
  open:      boolean
  onClose:   () => void
  project?:  Project
}

export function ProjectModal({ open, onClose, project }: ProjectModalProps) {
  const userId      = useAuthStore(s => s.user?.id ?? '')
  const isEdit      = !!project

  const [name,  setName]  = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon,  setIcon]  = useState(PRESET_ICONS[0])
  const [nameError, setNameError] = useState('')

  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const mutation      = isEdit ? updateProject : createProject
  const isPending     = mutation.isPending
  const mutationError = mutation.error instanceof Error
    ? mutation.error.message
    : mutation.error
      ? 'Something went wrong'
      : null

  useEffect(() => {
    if (open) {
      setName(project?.name  ?? '')
      setColor(project?.color ?? PRESET_COLORS[0])
      setIcon(project?.icon  ?? PRESET_ICONS[0])
      setNameError('')
      createProject.reset()
      updateProject.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Project name is required')
      return
    }
    if (trimmed.length > 50) {
      setNameError('Project name must be 50 characters or fewer')
      return
    }
    setNameError('')

    if (isEdit) {
      updateProject.mutate(
        { id: project.id, data: { name: trimmed, color, icon } },
        { onSuccess: onClose },
      )
    } else {
      createProject.mutate(
        { user_id: userId, name: trimmed, color, icon },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-depth-surface border-depth-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink-primary">
            {isEdit ? 'Edit project' : 'New project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">

          {/* Name */}
          <Input
            label="Project name"
            value={name}
            onChange={e => {
              setName(e.target.value)
              if (nameError) setNameError('')
            }}
            maxLength={50}
            placeholder="e.g. Client work"
            error={nameError}
            autoFocus
          />

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-secondary">Color</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    width:           28,
                    height:          28,
                    backgroundColor: c,
                    boxShadow:
                      color === c
                        ? `0 0 0 2px #141417, 0 0 0 4px #ffffff`
                        : undefined,
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-secondary">Icon</span>
            <div className="grid grid-cols-8 gap-1">
              {PRESET_ICONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className="flex items-center justify-center rounded-md transition-colors hover:bg-depth-raised focus:outline-none"
                  style={{
                    width:        32,
                    height:       32,
                    fontSize:     18,
                    background:   icon === emoji ? '#222228' : undefined,
                    border:       icon === emoji ? '1px solid #4B9EFF' : '1px solid transparent',
                  }}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
              {isEdit ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
