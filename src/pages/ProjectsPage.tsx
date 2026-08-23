import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import {
  useArchivedProjects,
  useArchiveProject,
  useDeleteProject,
  useProjectStats,
  useProjects,
  useUnarchiveProject,
} from '@/hooks/useProjects'
import { useProjectLimit } from '@/hooks/usePlanLimits'
import { PATHS } from '@/routes/paths'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>
type ProjectView = 'active' | 'archived'
type SortBy = 'last_used' | 'alphabetical'

function ProjectCardWrapper({
  project,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onClick,
}: {
  project: Project
  onEdit: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onClick: () => void
}) {
  const { data: stats, isLoading } = useProjectStats(project.id)
  return (
    <ProjectCard
      project={project}
      stats={
        stats ?? {
          total_focus_minutes: 0,
          total_tasks: 0,
          completed_tasks: 0,
          session_count: 0,
          last_focused_at: null,
        }
      }
      isStatsLoading={isLoading}
      onEdit={onEdit}
      onArchive={onArchive}
      onRestore={onRestore}
      onDelete={onDelete}
      onClick={onClick}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-xl border border-depth-border bg-depth-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-depth-raised" />
          <div className="h-4 w-32 rounded bg-depth-raised" />
        </div>
        <div className="h-6 w-6 rounded bg-depth-raised" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-7 w-24 rounded bg-depth-raised" />
        <div className="h-3 w-20 rounded bg-depth-raised" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-24 rounded bg-depth-raised" />
        <div className="h-1.5 w-full rounded-full bg-depth-raised" />
      </div>
      <div className="h-7 border-t border-depth-border pt-3">
        <div className="h-3 w-32 rounded bg-depth-raised" />
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()

  const [view, setView] = useState<ProjectView>('active')
  const [sortBy, setSortBy] = useState<SortBy>('last_used')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const { data: activeProjects = [], isLoading: activeLoading } = useProjects()
  const { data: archivedProjects = [], isLoading: archivedLoading } = useArchivedProjects()
  const archiveProject = useArchiveProject()
  const unarchiveProject = useUnarchiveProject()
  const deleteProject = useDeleteProject()
  const { isAtLimit, count: projectCount, max: projectMax, isPro } = useProjectLimit()

  const projects = view === 'active' ? activeProjects : archivedProjects
  const isLoading = view === 'active' ? activeLoading : archivedLoading
  const hasAnyProjects = activeProjects.length > 0 || archivedProjects.length > 0

  function handleNewProject() {
    if (isAtLimit) setUpgradeOpen(true)
    else setIsCreateOpen(true)
  }

  function handleRestore(projectId: string) {
    if (isAtLimit) setUpgradeOpen(true)
    else unarchiveProject.mutate(projectId)
  }

  const sorted = [...projects].sort((a, b) => {
    if (sortBy === 'alphabetical') return a.name.localeCompare(b.name)
    if (!a.last_used_at && !b.last_used_at) return a.name.localeCompare(b.name)
    if (!a.last_used_at) return 1
    if (!b.last_used_at) return -1
    return b.last_used_at.localeCompare(a.last_used_at)
  })

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1
              className="text-ink-primary"
              style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.03em' }}
            >
              Projects
            </h1>
            {!isLoading ? (
              <Badge className="border-transparent bg-depth-raised font-medium text-ink-muted">
                {projects.length}
              </Badge>
            ) : null}
          </div>

          <Button variant="primary" onClick={handleNewProject}>
            <Plus size={16} />
            New Project
          </Button>
        </div>

        {!isPro ? (
          <span className="text-[11px] text-ink-secondary">
            {projectCount} / {projectMax} active projects · Free plan
          </span>
        ) : null}
      </div>

      {!activeLoading && !archivedLoading && hasAnyProjects ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center rounded-lg border border-depth-border bg-depth-surface p-1"
            aria-label="Project status"
          >
            {(
              [
                ['active', 'Active', activeProjects.length],
                ['archived', 'Archived', archivedProjects.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-pressed={view === value}
                className={`flex h-7 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
                  view === value
                    ? 'bg-depth-raised text-ink-primary'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {label}
                <span className="font-data text-[10px] text-ink-muted">{count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-ink-secondary">Sort by</span>
            <div className="flex items-center rounded-lg border border-depth-border bg-depth-surface p-1">
              {(['last_used', 'alphabetical'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSortBy(option)}
                  aria-pressed={sortBy === option}
                  className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
                    sortBy === option
                      ? 'bg-depth-raised text-ink-primary'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {option === 'last_used' ? 'Last used' : 'Alphabetical'}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : null}

      {!isLoading && projects.length === 0 && view === 'active' ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-base font-medium text-ink-muted">No active projects yet</p>
          <p className="max-w-xs text-sm text-ink-muted">
            Create a project to organize tasks and track where your focus time goes.
          </p>
          <Button variant="primary" onClick={handleNewProject}>
            <Plus size={16} />
            New Project
          </Button>
        </div>
      ) : null}

      {!isLoading && projects.length === 0 && view === 'archived' ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Archive size={28} className="text-ink-muted" />
          <div>
            <p className="text-base font-medium text-ink-primary">No archived projects</p>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              Projects you archive stay here with their tasks and focus history intact.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setView('active')}>
            View active projects
          </Button>
        </div>
      ) : null}

      {!isLoading && sorted.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((project) => (
            <ProjectCardWrapper
              key={project.id}
              project={project}
              onClick={() => navigate(PATHS.project(project.id))}
              onEdit={() => setEditingProject(project)}
              onArchive={() => archiveProject.mutate(project.id)}
              onRestore={() => handleRestore(project.id)}
              onDelete={() => setDeletingProject(project)}
            />
          ))}
        </div>
      ) : null}

      <ProjectModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="projects" />

      <ProjectModal
        open={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject ?? undefined}
      />

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
