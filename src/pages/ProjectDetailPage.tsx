import { ProjectIcon } from '@/components/projects/ProjectIcon'
import { useState } from 'react'

import {
  ChevronLeft,
  List,
  Columns,
  Lock,
  Crown,
  Circle,
  Clock,
  CheckCircle,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Plus,
  X,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'

import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { ProjectSessionsList } from '@/components/projects/ProjectSessionsList'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView'
import { TaskListView } from '@/components/tasks/TaskListView'
import { TaskModal } from '@/components/tasks/TaskModal'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { usePlan } from '@/hooks/usePlan'
import {
  useProject,
  useProjectStats,
  useArchiveProject,
  useUpdateProject,
} from '@/hooks/useProjects'
import { useDeleteTask, useTaskSessionMins } from '@/hooks/useTasks'
import type { Task } from '@/lib/supabase/queries/tasks'
import { PATHS } from '@/routes/paths'
import { useTimerStore, showSaveToast } from '@/store/timerStore'

function formatFocusDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

export function ProjectDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [taskView, setTaskView] = useState<'list' | 'kanban' | 'kanban-locked'>('list')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [createStatus, setCreateStatus] = useState<string | undefined>(undefined)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [activeTab, setActiveTab] = useState('tasks')
  const scrollTaskList = activeTab === 'tasks' && taskView === 'list'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filters = { search, status, priority }
  function clearFilters() {
    setSearch('')
    setStatus('all')
    setPriority('all')
  }

  const { isPro } = usePlan()

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: stats, isLoading: statsLoading } = useProjectStats(id)
  const { data: sessionMinsMap } = useTaskSessionMins(id)
  const archiveProject = useArchiveProject()
  const updateProject = useUpdateProject()
  const deleteTask = useDeleteTask()

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

  const tasksCompleted = stats ? `${stats.completed_tasks} / ${stats.total_tasks}` : '—'
  const isArchived = project.is_archived
  const archiveMutation = isArchived ? updateProject : archiveProject
  const isArchivePending = archiveMutation.isPending

  function openCreateTask(status?: string) {
    setEditingTask(null)
    setCreateStatus(status)
    setIsTaskModalOpen(true)
  }

  function openEditTask(task: Task) {
    setEditingTask(task)
    setIsTaskModalOpen(true)
  }

  function openTaskDetail(task: Task) {
    setViewingTask(task)
    setIsDetailOpen(true)
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false)
    setEditingTask(null)
    setCreateStatus(undefined)
  }

  function handleStartTimerFromTask(task: Task) {
    const { isRunning, isPaused } = useTimerStore.getState()
    if (isRunning || isPaused) {
      showSaveToast('Finish or stop your current session before starting a new one')
    } else {
      useTimerStore.getState().setSelectedProject(project!.id)
      useTimerStore.getState().setSelectedTask(task.id)
      showSaveToast('Task selected — start the timer when you are ready')
    }
    setIsDetailOpen(false)
    navigate(PATHS.timer)
  }

  function handleArchiveToggle() {
    if (isArchived) {
      updateProject.mutate(
        { id, data: { is_archived: false } },
        { onSuccess: () => navigate(PATHS.projects) }
      )
    } else {
      archiveProject.mutate(id, {
        onSuccess: () => navigate(PATHS.projects),
      })
    }
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-8 ${scrollTaskList ? 'lg:h-full lg:min-h-0 lg:overflow-hidden' : ''}`}
    >
      <button
        onClick={() => navigate(PATHS.projects)}
        className="flex min-h-11 w-fit shrink-0 items-center gap-1 text-sm text-ink-primary/75 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ChevronLeft size={16} />
        Projects
      </button>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <ProjectIcon icon={project.icon} className="text-ink-primary/80" />
            <h1 className="min-w-0 break-words text-2xl font-medium tracking-tight text-ink-primary sm:text-[28px]">
              {project.name}
            </h1>
          </div>
          <p className="mt-2 text-sm text-ink-primary/75">
            {isArchived
              ? 'Archived project · tasks and session history are preserved.'
              : 'Keep related tasks and their focus time together.'}
          </p>
        </div>
        <div className="order-last grid w-full grid-cols-3 gap-4 sm:order-none sm:w-auto sm:gap-8">
          {[
            {
              value: stats ? formatFocusDuration(stats.total_focus_minutes) : '—',
              label: 'Total focus',
            },
            { value: tasksCompleted, label: 'Tasks completed' },
            { value: stats?.session_count ?? '—', label: 'Focus sessions' },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-data text-lg text-ink-primary sm:text-2xl">
                {statsLoading ? '—' : item.value}
              </p>
              <p className="mt-1 text-xs text-ink-primary/70">{item.label}</p>
            </div>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isArchivePending}
            aria-label="Project actions"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-depth-border text-ink-primary/75 hover:bg-depth-raised"
          >
            <MoreHorizontal size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>Edit project</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleArchiveToggle}>
              {isArchived ? 'Unarchive project' : 'Archive project'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={scrollTaskList ? 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col' : undefined}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-y border-depth-border py-2">
          <TabsList className="bg-transparent">
            <TabsTrigger
              value="tasks"
              className="min-h-11 text-ink-primary/70 data-[state=active]:bg-depth-raised data-[state=active]:text-brand"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="min-h-11 text-ink-primary/70 data-[state=active]:bg-depth-raised data-[state=active]:text-brand"
            >
              Sessions
            </TabsTrigger>
          </TabsList>
          <p className="max-w-lg text-xs leading-5 text-ink-primary/70">
            Check a task when the work is finished. Sessions record time separately.
          </p>
        </div>
        <TabsContent
          value="tasks"
          className={`pt-5 data-[state=inactive]:hidden ${scrollTaskList ? 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col' : ''}`}
        >
          {taskView !== 'kanban-locked' && (
            <div className="mb-5 shrink-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1 basis-48">
                  <Search
                    size={16}
                    className="absolute left-3 top-3.5 text-ink-primary/60"
                    aria-hidden="true"
                  />
                  <input
                    aria-label="Search tasks"
                    placeholder="Search tasks"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 w-full rounded-lg border border-depth-border bg-depth-surface pl-9 pr-11 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  {search && (
                    <button
                      aria-label="Clear task search"
                      onClick={() => setSearch('')}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-ink-primary/75"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  aria-expanded={filtersOpen}
                  aria-controls="task-workspace-filters"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-depth-border px-3 text-sm text-ink-primary/80"
                >
                  <SlidersHorizontal size={16} />
                  Filters
                  {(status !== 'all' || priority !== 'all') && (
                    <span className="font-data text-brand">
                      {Number(status !== 'all') + Number(priority !== 'all')}
                    </span>
                  )}
                </button>
                <div
                  className="flex rounded-lg border border-depth-border p-1"
                  role="group"
                  aria-label="Task view"
                >
                  <button
                    aria-pressed={taskView === 'list'}
                    onClick={() => setTaskView('list')}
                    className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm ${taskView === 'list' ? 'bg-depth-raised text-ink-primary' : 'text-ink-primary/70'}`}
                  >
                    <List size={16} />
                    List
                  </button>
                  <button
                    aria-pressed={taskView === 'kanban'}
                    onClick={() => setTaskView(isPro ? 'kanban' : 'kanban-locked')}
                    className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm ${taskView === 'kanban' ? 'bg-depth-raised text-ink-primary' : 'text-ink-primary/70'}`}
                  >
                    <Columns size={16} />
                    Kanban{!isPro && <Lock size={12} />}
                  </button>
                </div>
                <Button variant="primary" onClick={() => openCreateTask()}>
                  <Plus size={16} />
                  Add task
                </Button>
              </div>
              {filtersOpen && (
                <div
                  id="task-workspace-filters"
                  className="flex flex-wrap items-end gap-4 rounded-xl border border-depth-border bg-depth-surface p-4"
                >
                  <label className="flex flex-col gap-2 text-xs text-ink-primary/75">
                    Status
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="min-h-11 rounded-md border border-depth-border bg-depth-raised px-3 text-sm text-ink-primary"
                    >
                      <option value="all">All statuses</option>
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-ink-primary/75">
                    Priority
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="min-h-11 rounded-md border border-depth-border bg-depth-raised px-3 text-sm text-ink-primary"
                    >
                      <option value="all">All priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              )}
              {(status !== 'all' || priority !== 'all') && (
                <p className="text-xs text-ink-primary/75" aria-live="polite">
                  Status: {status.replace('_', ' ')} · Priority: {priority}{' '}
                  <button
                    onClick={clearFilters}
                    className="ml-2 min-h-11 text-brand underline underline-offset-4"
                  >
                    Clear
                  </button>
                </p>
              )}
            </div>
          )}
          {taskView === 'list' && (
            <TaskListView
              projectId={id}
              filters={filters}
              onClearFilters={clearFilters}
              onOpenTask={openTaskDetail}
              onEditTask={openEditTask}
              onCreateTask={() => openCreateTask()}
            />
          )}
          {taskView === 'kanban' && (
            <TaskKanbanView
              projectId={id}
              filters={filters}
              onClearFilters={clearFilters}
              onOpenTask={openTaskDetail}
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
                    gap: 6,
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-muted)',
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
                    gap: 6,
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-surface-overlay)',
                    color: 'var(--color-text)',
                  }}
                >
                  <Columns size={16} />
                  Kanban
                  <Lock size={12} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <Crown size={28} style={{ color: '#F5A623' }} />
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', marginTop: 10 }}>
                  Kanban Board
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    maxWidth: 500,
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Upgrade to Depthly Pro to access the Kanban board and organize your tasks with
                  intuitive visual workflow.
                </p>
              </div>

              {/* Static kanban preview — fully visible, no blur */}
              <div className="mb-7 flex w-full flex-col gap-4 sm:flex-row">
                {/* To Do */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 200,
                    background: 'rgba(122,120,144,0.06)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Circle size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>To Do</span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        background: 'rgba(122,120,144,0.15)',
                        padding: '2px 6px',
                        borderRadius: 999,
                      }}
                    >
                      3
                    </span>
                  </div>
                  {['Design homepage', 'Write API docs', 'Set up CI/CD'].map((t) => (
                    <div
                      key={t}
                      style={{
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        marginBottom: 8,
                        fontSize: 12,
                        color: 'var(--color-text)',
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>

                {/* In Progress */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 200,
                    background: 'rgba(75,158,255,0.06)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Clock size={14} style={{ color: '#4B9EFF' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4B9EFF' }}>
                        In Progress
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#4B9EFF',
                        background: 'rgba(75,158,255,0.15)',
                        padding: '2px 6px',
                        borderRadius: 999,
                      }}
                    >
                      2
                    </span>
                  </div>
                  {['Build timer component', 'Integrate Supabase'].map((t) => (
                    <div
                      key={t}
                      style={{
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        marginBottom: 8,
                        fontSize: 12,
                        color: 'var(--color-text)',
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>

                {/* Done */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 200,
                    background: 'rgba(61,214,140,0.06)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <CheckCircle size={14} style={{ color: '#3DD68C' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#3DD68C' }}>Done</span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#3DD68C',
                        background: 'rgba(61,214,140,0.15)',
                        padding: '2px 6px',
                        borderRadius: 999,
                      }}
                    >
                      1
                    </span>
                  </div>
                  {['Project setup', 'Auth flow'].map((t) => (
                    <div
                      key={t}
                      style={{
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        marginBottom: 8,
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                        textDecoration: 'line-through',
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgrade button */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  style={{ gap: 8 }}
                  onClick={() => setUpgradeOpen(true)}
                >
                  <Crown size={16} style={{ color: '#F5A623' }} />
                  Upgrade to Pro
                </Button>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
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

      <ProjectModal open={isEditOpen} onClose={() => setIsEditOpen(false)} project={project} />

      <TaskModal
        open={isTaskModalOpen}
        onClose={closeTaskModal}
        projectId={id}
        task={editingTask ?? undefined}
        defaultStatus={createStatus as 'todo' | 'in_progress' | 'done' | undefined}
      />

      <TaskDetailModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        task={viewingTask}
        sessionMins={viewingTask ? sessionMinsMap?.[viewingTask.id] : undefined}
        onEdit={(task) => {
          setIsDetailOpen(false)
          openEditTask(task)
        }}
        onStartTimer={handleStartTimerFromTask}
      />

      <ConfirmDialog
        open={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (!deletingTask) return
          deleteTask.mutate(
            { id: deletingTask.id, projectId: id },
            { onSuccess: () => setDeletingTask(null) }
          )
        }}
        title="Delete task"
        description="This task will be permanently deleted and cannot be recovered."
        isLoading={deleteTask.isPending}
      />

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="kanban" />
    </div>
  )
}
