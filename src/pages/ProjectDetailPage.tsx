import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, List, Columns, Lock, Crown, Circle, Clock, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskListView } from '@/components/tasks/TaskListView'
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProjectSessionsList } from '@/components/projects/ProjectSessionsList'
import { useProject, useProjectStats, useArchiveProject, useUpdateProject } from '@/hooks/useProjects'
import { useDeleteTask } from '@/hooks/useTasks'
import { usePlan } from '@/hooks/usePlan'
import { PATHS } from '@/routes/paths'
import type { Task } from '@/lib/supabase/queries/tasks'

export function ProjectDetailPage() {
  const { id = '' }  = useParams<{ id: string }>()
  const navigate     = useNavigate()

  const [isEditOpen,      setIsEditOpen]      = useState(false)
  const [taskView,        setTaskView]        = useState<'list' | 'kanban' | 'kanban-locked'>('list')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask,     setEditingTask]     = useState<Task | null>(null)
  const [deletingTask,    setDeletingTask]    = useState<Task | null>(null)
  const [upgradeOpen,     setUpgradeOpen]     = useState(false)

  const { isPro } = usePlan()

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

          {/* Tab toolbar — hidden when lock screen is active */}
          {taskView !== 'kanban-locked' && (
            <div className="mb-4 flex items-center justify-between">

              {/* View toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-depth-border p-1">
                <button
                  type="button"
                  onClick={() => setTaskView('list')}
                  aria-label="List view"
                  className="flex items-center rounded-md text-sm font-medium transition-colors"
                  style={{
                    gap:             6,
                    padding:         '6px 12px',
                    backgroundColor: taskView === 'list' ? '#222228' : 'transparent',
                    color:           taskView === 'list' ? '#E8E6F0' : '#7A7890',
                  }}
                >
                  <List size={16} />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isPro) setTaskView('kanban')
                    else setTaskView('kanban-locked')
                  }}
                  aria-label="Kanban view"
                  className="flex items-center rounded-md text-sm font-medium transition-colors"
                  style={{
                    gap:             6,
                    padding:         '6px 12px',
                    backgroundColor: taskView === 'kanban' ? '#222228' : 'transparent',
                    color:           taskView === 'kanban' ? '#E8E6F0' : '#7A7890',
                  }}
                >
                  <Columns size={16} />
                  Kanban
                  {!isPro && <Lock size={12} style={{ color: '#7A7890' }} />}
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
          )}

          {/* List view */}
          {taskView === 'list' && (
            <TaskListView
              projectId={id}
              onEditTask={openEditTask}
              onCreateTask={() => openCreateTask()}
            />
          )}

          {/* Kanban view (Pro) */}
          {taskView === 'kanban' && (
            <TaskKanbanView
              projectId={id}
              onEditTask={openEditTask}
              onAddTask={openCreateTask}
            />
          )}

          {/* Kanban lock screen (free users) — full content area replacement */}
          {taskView === 'kanban-locked' && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

              {/* Toggle row — keep visible so user can switch back to list */}
              <div className="mb-6 flex items-center gap-1 self-start rounded-lg border border-depth-border p-1">
                <button
                  type="button"
                  onClick={() => setTaskView('list')}
                  aria-label="List view"
                  className="flex items-center rounded-md text-sm font-medium transition-colors"
                  style={{
                    gap:             6,
                    padding:         '6px 12px',
                    backgroundColor: 'transparent',
                    color:           '#7A7890',
                  }}
                >
                  <List size={16} />
                  List
                </button>
                <button
                  type="button"
                  aria-label="Kanban view (Pro)"
                  className="flex items-center rounded-md text-sm font-medium transition-colors"
                  style={{
                    gap:             6,
                    padding:         '6px 12px',
                    backgroundColor: '#222228',
                    color:           '#E8E6F0',
                  }}
                >
                  <Columns size={16} />
                  Kanban
                  <Lock size={12} style={{ color: '#7A7890' }} />
                </button>
              </div>

              {/* Header */}
              <div style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                marginBottom:  24,
              }}>
                <Crown size={28} style={{ color: '#F5A623' }} />
                <div style={{ fontSize: 26, fontWeight: 700, color: '#E8E6F0', marginTop: 10 }}>
                  Kanban Board
                </div>
                <p style={{
                  fontSize:   14,
                  color:      '#7A7890',
                  textAlign:  'center',
                  maxWidth:   500,
                  marginTop:  8,
                  lineHeight: 1.5,
                }}>
                  Upgrade to Depthly Pro to access the Kanban board and organize
                  your tasks with intuitive visual workflow.
                </p>
              </div>

              {/* Static kanban preview — fully visible, no blur */}
              <div style={{ display: 'flex', gap: 16, width: '100%', marginBottom: 28 }}>

                {/* To Do */}
                <div style={{
                  flex:       1,
                  minHeight:  200,
                  background: 'rgba(122,120,144,0.06)',
                  border:     '1px solid #2E2E38',
                  borderRadius: 10,
                  padding:    12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Circle size={14} style={{ color: '#7A7890' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#7A7890' }}>To Do</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#7A7890', background: 'rgba(122,120,144,0.15)', padding: '2px 6px', borderRadius: 999 }}>3</span>
                  </div>
                  {['Design homepage', 'Write API docs', 'Set up CI/CD'].map(t => (
                    <div key={t} style={{
                      background:   '#141417',
                      border:       '1px solid #2E2E38',
                      borderRadius: 8,
                      padding:      '10px 12px',
                      marginBottom: 8,
                      fontSize:     12,
                      color:        '#E8E6F0',
                    }}>{t}</div>
                  ))}
                </div>

                {/* In Progress */}
                <div style={{
                  flex:       1,
                  minHeight:  200,
                  background: 'rgba(75,158,255,0.06)',
                  border:     '1px solid #2E2E38',
                  borderRadius: 10,
                  padding:    12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Clock size={14} style={{ color: '#4B9EFF' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4B9EFF' }}>In Progress</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#4B9EFF', background: 'rgba(75,158,255,0.15)', padding: '2px 6px', borderRadius: 999 }}>2</span>
                  </div>
                  {['Build timer component', 'Integrate Supabase'].map(t => (
                    <div key={t} style={{
                      background:   '#141417',
                      border:       '1px solid #2E2E38',
                      borderRadius: 8,
                      padding:      '10px 12px',
                      marginBottom: 8,
                      fontSize:     12,
                      color:        '#E8E6F0',
                    }}>{t}</div>
                  ))}
                </div>

                {/* Done */}
                <div style={{
                  flex:       1,
                  minHeight:  200,
                  background: 'rgba(61,214,140,0.06)',
                  border:     '1px solid #2E2E38',
                  borderRadius: 10,
                  padding:    12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <CheckCircle size={14} style={{ color: '#3DD68C' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#3DD68C' }}>Done</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#3DD68C', background: 'rgba(61,214,140,0.15)', padding: '2px 6px', borderRadius: 999 }}>1</span>
                  </div>
                  {['Project setup', 'Auth flow'].map(t => (
                    <div key={t} style={{
                      background:     '#141417',
                      border:         '1px solid #2E2E38',
                      borderRadius:   8,
                      padding:        '10px 12px',
                      marginBottom:   8,
                      fontSize:       12,
                      color:          '#7A7890',
                      textDecoration: 'line-through',
                    }}>{t}</div>
                  ))}
                </div>

              </div>

              {/* Upgrade button */}
              <div style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           8,
              }}>
                <Button
                  variant="primary"
                  size="lg"
                  style={{ gap: 8 }}
                  onClick={() => setUpgradeOpen(true)}
                >
                  <Crown size={16} style={{ color: '#F5A623' }} />
                  Upgrade to Pro
                </Button>
                <span style={{ fontSize: 12, color: '#7A7890' }}>
                  From $5/month · Cancel anytime
                </span>
              </div>

            </div>
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

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        trigger="kanban"
      />

    </div>
  )
}
