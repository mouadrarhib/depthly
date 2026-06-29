import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProjectSessionsList } from '@/components/projects/ProjectSessionsList'
import { useProject, useProjectStats, useArchiveProject, useUpdateProject } from '@/hooks/useProjects'
import { PATHS } from '@/routes/paths'

export function ProjectDetailPage() {
  const { id = '' }  = useParams<{ id: string }>()
  const navigate     = useNavigate()

  const [isEditOpen, setIsEditOpen] = useState(false)

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: stats,   isLoading: statsLoading   } = useProjectStats(id)
  const archiveProject  = useArchiveProject()
  const updateProject   = useUpdateProject()

  if (projectLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-ink-muted">Project not found.</p>
      </div>
    )
  }

  const focusHours      = stats ? (stats.total_focus_minutes / 60).toFixed(1) : '—'
  const tasksCompleted  = stats ? `${stats.completed_tasks} / ${stats.total_tasks}` : '—'
  const isArchived         = project.is_archived
  const archiveMutation    = isArchived ? updateProject : archiveProject
  const isArchivePending   = archiveMutation.isPending

  return (
    <div className="p-8 flex flex-col gap-6">

      {/* Back button */}
      <button
        onClick={() => navigate(PATHS.projects)}
        className="flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary transition-colors w-fit"
      >
        <ChevronLeft size={16} />
        Projects
      </button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="shrink-0 rounded-full"
            style={{ width: 14, height: 14, backgroundColor: project.color }}
          />
          {project.icon && (
            <span style={{ fontSize: 22, lineHeight: 1 }}>{project.icon}</span>
          )}
          <h1
            className="text-ink-primary font-medium truncate"
            style={{ fontSize: 28 }}
          >
            {project.name}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={isArchivePending}
            onClick={() => {
              if (isArchived) {
                updateProject.mutate(
                  { id: project.id, data: { is_archived: false } },
                  { onSuccess: () => navigate(PATHS.projects) },
                )
              } else {
                archiveProject.mutate(project.id, {
                  onSuccess: () => navigate(PATHS.projects),
                })
              }
            }}
          >
            {isArchived ? 'Unarchive' : 'Archive'}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-8">
        <div className="flex flex-col gap-0.5">
          <span className="font-data text-ink-primary text-2xl">
            {statsLoading ? '—' : focusHours + 'h'}
          </span>
          <span className="text-ink-muted text-xs">total focus</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-data text-ink-primary text-2xl">
            {statsLoading ? '—' : tasksCompleted}
          </span>
          <span className="text-ink-muted text-xs">tasks completed</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-data text-ink-primary text-2xl">
            {statsLoading ? '—' : stats!.session_count}
          </span>
          <span className="text-ink-muted text-xs">sessions</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="bg-depth-raised border border-depth-border">
          <TabsTrigger
            value="tasks"
            className="data-[state=active]:bg-depth-bg data-[state=active]:text-ink-primary text-ink-muted"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="data-[state=active]:bg-depth-bg data-[state=active]:text-ink-primary text-ink-muted"
          >
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="pt-4">
          <p className="text-ink-muted text-sm">Tasks coming in Phase 4</p>
        </TabsContent>

        <TabsContent value="sessions" className="pt-4">
          <ProjectSessionsList projectId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit modal */}
      <ProjectModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        project={project}
      />
    </div>
  )
}
