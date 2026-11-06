import { useState, useEffect, useId } from 'react'
import { Check } from 'lucide-react'
import { ProjectIcon, PROJECT_ICONS } from '@/components/projects/ProjectIcon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>
const COLORS = [
  { value: '#4B9EFF', name: 'Blue' },
  { value: '#3DD68C', name: 'Green' },
  { value: '#F5A623', name: 'Amber' },
  { value: '#F25C5C', name: 'Red' },
  { value: '#B3CA78', name: 'Olive' },
  { value: '#A78BFA', name: 'Purple' },
  { value: '#F472B6', name: 'Pink' },
  { value: '#FB923C', name: 'Orange' },
  { value: '#34D399', name: 'Mint' },
  { value: '#94A3B8', name: 'Slate' },
]
interface ProjectModalProps {
  open: boolean
  onClose: () => void
  project?: Project
}
export function ProjectModal({ open, onClose, project }: ProjectModalProps) {
  const isEdit = !!project
  const inputId = useId()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0].value)
  const [icon, setIcon] = useState<string | null>(PROJECT_ICONS[0].value)
  const [nameError, setNameError] = useState('')
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const mutation = isEdit ? updateProject : createProject
  const isPending = mutation.isPending
  const mutationError =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? 'We couldn’t save this project. Please try again.'
        : null
  const colorName =
    COLORS.find((item) => item.value.toLowerCase() === color.toLowerCase())?.name ??
    'Existing color'
  const iconName =
    PROJECT_ICONS.find((item) => item.value === icon)?.label ?? (icon ? 'Existing icon' : 'No icon')
  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setColor(project?.color ?? COLORS[0].value)
    setIcon(project ? project.icon : PROJECT_ICONS[0].value)
    setNameError('')
    createProject.reset()
    updateProject.reset()
    // Reset only when opening the form or switching the project being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id])
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
        { onSuccess: onClose }
      )
    } else {
      createProject.mutate({ name: trimmed, color, icon }, { onSuccess: onClose })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !isPending) onClose()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-depth-border bg-depth-surface p-0 sm:max-w-[560px]">
        <DialogHeader className="shrink-0 px-5 pb-5 pt-6 text-left sm:px-8">
          <DialogTitle className="pr-8 text-2xl font-medium tracking-tight text-ink-primary">
            {isEdit ? 'Edit project' : 'Create a project'}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-ink-primary/75">
            {isEdit
              ? 'Update the name and appearance of this project.'
              : 'Group related tasks under one clear name.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
          aria-busy={isPending}
        >
          <div className="min-h-0 space-y-6 overflow-y-auto px-5 pb-6 sm:px-8">
            <div
              className="flex items-center gap-3 border-y border-depth-border py-5"
              aria-label="Project appearance preview"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <ProjectIcon icon={icon} size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-base font-medium text-ink-primary">
                  {name.trim() || 'Your project name'}
                </p>
                <p className="mt-1 text-xs text-ink-primary/70">Project appearance preview</p>
              </div>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={inputId} className="text-sm font-medium text-ink-primary">
                  Project name
                </label>
                <span className="font-data text-xs text-ink-primary/65">{name.length} / 50</span>
              </div>
              <input
                id={inputId}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameError('')
                }}
                maxLength={50}
                autoFocus
                disabled={isPending}
                placeholder="e.g. Client website"
                aria-required="true"
                aria-invalid={!!nameError}
                aria-describedby={`${inputId}-hint${nameError ? ` ${inputId}-error` : ''}`}
                className="h-12 w-full rounded-lg border border-depth-border bg-depth-bg px-3 text-sm text-ink-primary placeholder:text-ink-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
              />
              <p id={`${inputId}-hint`} className="mt-2 text-xs leading-5 text-ink-primary/70">
                Name the outcome, client, or course you’re working on.
              </p>
              {nameError && (
                <p
                  id={`${inputId}-error`}
                  role="alert"
                  className="mt-2 text-sm text-feedback-error"
                >
                  {nameError}
                </p>
              )}
            </div>
            <fieldset disabled={isPending}>
              <legend className="mb-3 w-full">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-primary">Project color</span>
                  <span className="text-xs text-ink-primary/70">{colorName} selected</span>
                </span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-label={item.name}
                    aria-pressed={color.toLowerCase() === item.value.toLowerCase()}
                    onClick={() => setColor(item.value)}
                    className={`flex h-11 w-11 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 ${color.toLowerCase() === item.value.toLowerCase() ? 'border-brand bg-brand/10' : 'border-transparent hover:bg-depth-raised'}`}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: item.value }}
                    >
                      {color.toLowerCase() === item.value.toLowerCase() && (
                        <Check size={15} className="text-depth-bg" strokeWidth={2.5} />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset disabled={isPending}>
              <legend className="mb-3 w-full">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-primary">Project icon</span>
                  <span className="text-xs text-ink-primary/70">
                    {iconName}
                    {icon ? ' selected' : ''}
                  </span>
                </span>
              </legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {PROJECT_ICONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-label={item.label}
                    title={item.label}
                    aria-pressed={icon === item.value}
                    onClick={() => setIcon(item.value)}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 ${icon === item.value ? 'border-brand bg-brand/10 text-brand' : 'border-depth-border text-ink-primary/80 hover:bg-depth-raised'}`}
                  >
                    <ProjectIcon icon={item.value} size={21} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIcon(null)}
                aria-pressed={icon === null}
                className="mt-2 min-h-11 text-xs text-ink-primary/75 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-brand"
              >
                No icon
              </button>
            </fieldset>
            <p className="text-xs leading-5 text-ink-primary/75">
              {isEdit
                ? 'Your existing tasks and sessions stay connected.'
                : 'You can add tasks after creating your project.'}
            </p>
            {mutationError && (
              <p role="alert" className="text-sm text-feedback-error">
                {mutationError}
              </p>
            )}
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-depth-border px-5 py-4 sm:px-8">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
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
