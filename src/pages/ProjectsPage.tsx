import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useProjects,
  useArchiveProject,
  useDeleteProject,
  useProjectStats,
} from '@/hooks/useProjects'
import { PATHS } from '@/routes/paths'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>
type SortBy  = 'last_used' | 'alphabetical'

function ProjectCardWrapper({
  project,
  onEdit,
  onArchive,
  onDelete,
  onClick,
}: {
  project:   Project
  onEdit:    () => void
  onArchive: () => void
  onDelete:  () => void
  onClick:   () => void
}) {
  const { data: stats } = useProjectStats(project.id)
  return (
    <ProjectCard
      project={project}
      stats={stats ?? { total_focus_minutes: 0, total_tasks: 0, completed_tasks: 0 }}
      onEdit={onEdit}
      onArchive={onArchive}
      onDelete={onDelete}
      onClick={onClick}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-depth-border bg-depth-surface p-4 animate-pulse flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-depth-raised" />
          <div className="h-4 w-32 rounded bg-depth-raised" />
        </div>
        <div className="h-6 w-6 rounded bg-depth-raised" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-7 w-16 rounded bg-depth-raised" />
        <div className="h-3 w-20 rounded bg-depth-raised" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-24 rounded bg-depth-raised" />
        <div className="h-1.5 w-full rounded-full bg-depth-raised" />
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()

  const [sortBy,          setSortBy]          = useState<SortBy>('last_used')
  const [isCreateOpen,    setIsCreateOpen]    = useState(false)
  const [editingProject,  setEditingProject]  = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  const { data: projects = [], isLoading } = useProjects()
  const archiveProject = useArchiveProject()
  const deleteProject  = useDeleteProject()

  const sorted = [...projects].sort((a, b) => {
    if (sortBy === 'alphabetical') {
      return a.name.localeCompare(b.name)
    }
    // last_used: nulls go last
    if (!a.last_used_at && !b.last_used_at) return 0
    if (!a.last_used_at) return 1
    if (!b.last_used_at) return -1
    return b.last_used_at.localeCompare(a.last_used_at)
  })

  return (
    <div className="p-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-ink-primary font-medium" style={{ fontSize: 24 }}>
            Projects
          </h1>
          {!isLoading && (
            <Badge
              className="border-transparent bg-depth-raised text-ink-muted font-medium"
            >
              {projects.length}
            </Badge>
          )}
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={16} />
          New Project
        </Button>
      </div>

      {/* Sort pills */}
      {!isLoading && projects.length > 0 && (
        <div className="flex items-center gap-2">
          {(['last_used', 'alphabetical'] as const).map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: sortBy === option ? '#0D0D10' : '#222228',
                color:      sortBy === option ? '#4B9EFF' : '#7A7890',
              }}
            >
              {option === 'last_used' ? 'Last used' : 'Alphabetical'}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-ink-muted text-base font-medium">No projects yet</p>
          <p className="text-ink-muted text-sm max-w-xs">
            Create your first project to start tracking focus sessions
          </p>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            New Project
          </Button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && sorted.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(project => (
            <ProjectCardWrapper
              key={project.id}
              project={project}
              onClick={() => navigate(PATHS.project(project.id))}
              onEdit={() => setEditingProject(project)}
              onArchive={() => archiveProject.mutate(project.id)}
              onDelete={() => setDeletingProject(project)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <ProjectModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit modal */}
      <ProjectModal
        open={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject ?? undefined}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={() => {
          if (!deletingProject) return
          deleteProject.mutate(deletingProject.id, {
            onSuccess: () => setDeletingProject(null),
          })
        }}
        title="Delete project"
        description={`"${deletingProject?.name}" and all its data will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteProject.isPending}
        variant="danger"
      />
    </div>
  )
}
