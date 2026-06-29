import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, List, Columns } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskListView } from '@/components/tasks/TaskListView'
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProjectSessionsList } from '@/components/projects/ProjectSessionsList'
import { useProject, useProjectStats, useArchiveProject, useUpdateProject } from '@/hooks/useProjects'
import { useDeleteTask } from '@/hooks/useTasks'
import { PATHS } from '@/routes/paths'
import type { Task } from '@/lib/supabase/queries/tasks'

export function ProjectDetailPage() {
  const { id = '' }  = useParams<{ id: string }>()
  const navigate     = useNavigate()

  const [isEditOpen,      setIsEditOpen]      = useState(false)
  const [taskView,        setTaskView]        = useState<'list' | 'kanban'>('list')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask,     setEditingTask]     = useState<Task | null>(null)
  const [deletingTask,    setDeletingTask]    = useState<Task | null>(null)

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: stats,   isLoading: statsLoading   } = useProjectStats(id)
  const archiveProject = useArchiveProject()
  const updateProject  = useUpdateProject()
  const deleteTask     = useDeleteTask()

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

  const focusHours    = stats ? (stats.total_focus_minutes / 60).toFixed(1) : '—'
  const tasksCompleted = stats ? `${stats.completed_tasks} / ${stats.total_tasks}` : '—'
  const isArchived       = project.is_archived
  const archiveMutation  = isArchived ? updateProject : archiveProject
  const isArchivePending = archiveMutation.isPending

  function openCreateTask(status?: string) {
    setEditingTask(null)
    setIsTaskModalOpen(true)
  }

  function openEditTask(task: Task) {
    setEditingTask(task)
    setIsTaskModalOpen(true)
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false)
    setEditingTask(null)
  }

  return (
    <div className="flex flex-col gap-6 p-8">

      {/* Back button */}
      <button
        onClick={() => navigate(PATHS.projects)}
        className="flex w-fit items-center gap-1 text-sm text-ink-secondary
                   transition-colors hover:text-ink-primary"
      >
        <ChevronLeft size={16} />
        Projects
      </button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="shrink-0 rounded-full"
            style={{ width: 14, height: 14, backgroundColor: project.color }}
          />
          {project.icon && (
            <span style={{ fontSize: 22, lineHeight: 1 }}>{project.icon}</span>
          )}
          <h1
            className="truncate font-medium text-ink-primary"
            style={{ fontSize: 28 }}
          >
            {project.name}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
          <span className="font-data text-2xl text-ink-primary">
            {statsLoading ? '—' : focusHours + 'h'}
          </span>
          <span className="text-xs text-ink-muted">total focus</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-data text-2xl text-ink-primary">
            {statsLoading ? '—' : tasksCompleted}
          </span>
          <span className="text-xs text-ink-muted">tasks completed</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-data text-2xl text-ink-primary">
            {statsLoading ? '—' : stats!.session_count}
          </span>
          <span className="text-xs text-ink-muted">sessions</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="border border-depth-border bg-depth-raised">
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

        {/* ── Tasks tab ─────────────────────────────────────────────────── */}
        <TabsContent value="tasks" className="pt-4">

          {/* Tab toolbar */}
          <div className="mb-4 flex items-center justify-between">

            {/* View toggle */}
            <div className="flex items-center gap-0.5 rounded-lg border border-depth-border p-0.5">
              <button
                type="button"
                onClick={() => setTaskView('list')}
                aria-label="List view"
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                style={{ color: taskView === 'list' ? '#4B9EFF' : '#7A7890' }}
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setTaskView('kanban')}
                aria-label="Kanban view"
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                style={{ color: taskView === 'kanban' ? '#4B9EFF' : '#7A7890' }}
              >
                <Columns size={15} />
              </button>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => openCreateTask()}
            >
              Add task
            </Button>
          </div>

          {/* Views */}
          {taskView === 'list' ? (
            <TaskListView
              projectId={id}
              onEditTask={openEditTask}
              onCreateTask={() => openCreateTask()}
            />
          ) : (
            <TaskKanbanView
              projectId={id}
              onEditTask={openEditTask}
              onAddTask={openCreateTask}
            />
          )}
        </TabsContent>

        {/* ── Sessions tab ──────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="pt-4">
          <ProjectSessionsList projectId={id} />
        </TabsContent>
      </Tabs>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      <ProjectModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        project={project}
      />

      <TaskModal
        open={isTaskModalOpen}
        onClose={closeTaskModal}
        projectId={id}
        task={editingTask ?? undefined}
      />

      <ConfirmDialog
        open={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (!deletingTask) return
          deleteTask.mutate(
            { id: deletingTask.id, projectId: id },
            { onSuccess: () => setDeletingTask(null) },
          )
        }}
        title="Delete task"
        description="This task will be permanently deleted and cannot be recovered."
        isLoading={deleteTask.isPending}
      />

    </div>
  )
}
