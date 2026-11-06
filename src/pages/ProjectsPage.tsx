import { ProjectIcon } from '@/components/projects/ProjectIcon'
import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  ArrowRight,
  FolderKanban,
  ListTodo,
  Timer,
  MoreHorizontal,
  Plus,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectLimit } from '@/hooks/usePlanLimits'
import {
  useArchivedProjects,
  useArchiveProject,
  useDeleteProject,
  useProjects,
  useUnarchiveProject,
} from '@/hooks/useProjects'
import { useProjectsTour } from '@/hooks/useProjectsTour'
import { projectKeys } from '@/lib/queryKeys'
import { getProjectStats } from '@/lib/supabase/queries/projects'
import { PATHS } from '@/routes/paths'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>
type SortBy = 'last_used' | 'alphabetical' | 'newest' | 'oldest' | 'focus'
const field =
  'min-h-11 rounded-lg border border-depth-border bg-depth-surface px-3 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
function duration(minutes: number) {
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [layout, setLayout] = useState<'list' | 'cards'>('list')
  const [sortBy, setSortBy] = useState<SortBy>('last_used')
  const [searchQuery, setSearchQuery] = useState('')
  const [tasks, setTasks] = useState('any')
  const [activity, setActivity] = useState('any')
  const [created, setCreated] = useState('any')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const active = useProjects()
  const archived = useArchivedProjects()
  const activeProjects = active.data ?? []
  const archivedProjects = archived.data ?? []
  const projects = view === 'active' ? activeProjects : archivedProjects
  const collection = view === 'active' ? active : archived
  const archiveProject = useArchiveProject()
  const unarchiveProject = useUnarchiveProject()
  const deleteProject = useDeleteProject()
  const { isAtLimit, count: projectCount, max: projectMax, isPro } = useProjectLimit()
  const statsQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: projectKeys.stats(project.id),
      queryFn: () => getProjectStats(project.id),
    })),
  })
  const stats = new Map(projects.map((project, index) => [project.id, statsQueries[index]]))
  const needsStats = tasks !== 'any' || activity !== 'any' || sortBy === 'focus'
  const statsPending = statsQueries.some((query) => query.isPending)
  const statsError = statsQueries.some((query) => query.isError)
  const filterCount =
    Number(tasks !== 'any') + Number(activity !== 'any') + Number(created !== 'any')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const rangeInvalid = created === 'custom' && !!from && !!to && from > to
  function clearFilters() {
    setTasks('any')
    setActivity('any')
    setCreated('any')
    setFrom('')
    setTo('')
  }
  function handleNewProject() {
    if (isAtLimit) setUpgradeOpen(true)
    else setIsCreateOpen(true)
  }
  function handleRestore(id: string) {
    if (isAtLimit) setUpgradeOpen(true)
    else unarchiveProject.mutate(id)
  }
  const sorted = projects
    .filter((project) => {
      if (!project.name.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()))
        return false
      const data = stats.get(project.id)?.data
      if (tasks !== 'any') {
        if (!data) return false
        if (tasks === 'unfinished' && data.total_tasks <= data.completed_tasks) return false
        if (
          tasks === 'completed' &&
          (!data.total_tasks || data.total_tasks !== data.completed_tasks)
        )
          return false
        if (tasks === 'none' && data.total_tasks !== 0) return false
      }
      if (activity !== 'any') {
        if (!data) return false
        const focused = data.last_focused_at ? new Date(data.last_focused_at) : null
        if (activity === 'week' && (!focused || focused < weekStart)) return false
        if (activity === 'inactive' && focused && focused >= weekStart) return false
        if (activity === 'never' && focused) return false
      }
      const date = new Date(project.created_at)
      if (created === 'custom') {
        if (rangeInvalid) return false
        if (from && date < new Date(`${from}T00:00:00`)) return false
        if (to && date > new Date(`${to}T23:59:59.999`)) return false
      } else if (created !== 'any') {
        const start = new Date(today)
        start.setDate(start.getDate() - (Number(created) - 1))
        if (date < start) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') return a.name.localeCompare(b.name)
      if (sortBy === 'newest') return b.created_at.localeCompare(a.created_at)
      if (sortBy === 'oldest') return a.created_at.localeCompare(b.created_at)
      if (sortBy === 'focus')
        return (
          (stats.get(b.id)?.data?.total_focus_minutes ?? 0) -
            (stats.get(a.id)?.data?.total_focus_minutes ?? 0) || a.name.localeCompare(b.name)
        )
      return (
        (b.last_used_at ?? '').localeCompare(a.last_used_at ?? '') || a.name.localeCompare(b.name)
      )
    })
  useProjectsTour(sorted.length > 0, active.isLoading || archived.isLoading)
  const loading = collection.isPending || (needsStats && statsPending)
  const error = collection.isError || (needsStats && statsError)
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-8 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Your projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-primary/75">
            Keep related tasks together and see the time you spend on each project.
          </p>
          {!isPro && (
            <p className="mt-1 text-xs text-ink-secondary">
              {projectCount} / {projectMax} active projects · Free plan
            </p>
          )}
        </div>
        <Button data-project-tour="new-project" variant="primary" onClick={handleNewProject}>
          <Plus size={16} />
          Create project
        </Button>
      </header>
      {guideOpen ? (
        <section
          aria-label="How projects work"
          className="shrink-0 rounded-xl border border-depth-border bg-depth-surface p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-primary">How your work connects</h2>
            <button
              className="min-h-11 px-2 text-xs text-ink-primary/75 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() => setGuideOpen(false)}
            >
              Hide guide
            </button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: FolderKanban,
                title: 'Create a project',
                description: 'A home for a client, course, or goal.',
              },
              {
                icon: ListTodo,
                title: 'Add tasks inside it',
                description: 'Break the work into things you can finish.',
              },
              {
                icon: Timer,
                title: 'Focus on a task',
                description: 'Sessions keep time linked to your work.',
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3">
                <Icon size={19} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-medium text-ink-primary">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-ink-primary/75">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <button
          className="self-start text-xs text-brand underline underline-offset-4"
          onClick={() => setGuideOpen(true)}
        >
          How do projects work?
        </button>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div
            className="flex rounded-lg border border-depth-border bg-depth-surface p-1"
            aria-label="Project status"
          >
            {(['active', 'archived'] as const).map((value) => (
              <button
                key={value}
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={`min-h-11 rounded-md px-3 text-sm ${view === value ? 'bg-depth-raised text-ink-primary' : 'text-ink-primary/75'}`}
              >
                {value === 'active' ? 'Active' : 'Archived'}{' '}
                <span className="font-data ml-1 text-xs">
                  {value === 'active' ? activeProjects.length : archivedProjects.length}
                </span>
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 basis-48">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-3.5 text-ink-secondary"
              aria-hidden="true"
            />
            <input
              className={`${field} w-full pl-9 pr-11`}
              aria-label="Search projects"
              placeholder="Search projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-ink-primary/75"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            aria-expanded={filtersOpen}
            aria-controls="project-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`${field} flex items-center gap-2`}
          >
            <SlidersHorizontal size={16} />
            Filters{filterCount > 0 && <span className="font-data text-brand">{filterCount}</span>}
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span id="project-sort-label" className="shrink-0 text-xs text-ink-primary/75">
              Sort
            </span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger
                aria-labelledby="project-sort-label"
                className="h-11 w-48 gap-3 border-depth-border bg-depth-surface text-ink-primary focus:ring-brand [&>svg]:shrink-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="end"
                className="border-depth-border bg-depth-surface text-ink-primary"
              >
                {[
                  ['last_used', 'Last focused'],
                  ['alphabetical', 'Name A–Z'],
                  ['newest', 'Newest created'],
                  ['oldest', 'Oldest created'],
                  ['focus', 'Most focus time'],
                ].map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="min-h-11 focus:bg-depth-raised focus:text-ink-primary"
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtersOpen && (
          <div
            id="project-filters"
            className="grid shrink-0 gap-4 rounded-xl border border-depth-border bg-depth-surface p-4 sm:grid-cols-3"
          >
            <label className="flex flex-col gap-2 text-xs text-ink-primary/75">
              Tasks
              <select className={field} value={tasks} onChange={(e) => setTasks(e.target.value)}>
                <option value="any">Any tasks</option>
                <option value="unfinished">Has unfinished tasks</option>
                <option value="completed">All tasks completed</option>
                <option value="none">No tasks</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs text-ink-primary/75">
              Focus activity
              <select
                className={field}
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                <option value="any">Any activity</option>
                <option value="week">Focused this week</option>
                <option value="inactive">Not focused this week</option>
                <option value="never">Never focused</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs text-ink-primary/75">
              Created
              <select
                className={field}
                value={created}
                onChange={(e) => setCreated(e.target.value)}
              >
                <option value="any">Any time</option>
                <option value="1">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="custom">Custom date range</option>
              </select>
            </label>
            {created === 'custom' && (
              <div className="flex flex-wrap gap-3 sm:col-span-3">
                <label className="flex flex-col gap-2 text-xs text-ink-primary/75">
                  From
                  <input
                    type="date"
                    className={field}
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs text-ink-primary/75">
                  To
                  <input
                    type="date"
                    className={field}
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
                {rangeInvalid && (
                  <p role="alert" className="text-sm text-destructive">
                    The end date must be on or after the start date.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {filterCount > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
            {[
              {
                value: tasks,
                clear: () => setTasks('any'),
                label:
                  tasks === 'unfinished'
                    ? 'Has unfinished tasks'
                    : tasks === 'completed'
                      ? 'All tasks completed'
                      : 'No tasks',
              },
              {
                value: activity,
                clear: () => setActivity('any'),
                label:
                  activity === 'week'
                    ? 'Focused this week'
                    : activity === 'inactive'
                      ? 'Not focused this week'
                      : 'Never focused',
              },
              {
                value: created,
                clear: () => setCreated('any'),
                label: `Created: ${created === '1' ? 'Today' : created === 'custom' ? `${from || 'Any start'} – ${to || 'Any end'}` : `Last ${created} days`}`,
              },
            ]
              .filter((item) => item.value !== 'any')
              .map((item) => (
                <button
                  key={item.label}
                  onClick={item.clear}
                  className="flex min-h-11 items-center gap-2 rounded-md bg-depth-raised px-3 text-ink-primary"
                >
                  {item.label}
                  <X size={13} />
                  <span className="sr-only">Remove filter</span>
                </button>
              ))}
            <button className="min-h-11 px-2 text-brand" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
        <div
          className="flex shrink-0 items-center gap-1 self-end rounded-lg border border-depth-border bg-depth-surface p-1"
          role="group"
          aria-label="Project view"
        >
          {(['list', 'cards'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={layout === option}
              onClick={() => setLayout(option)}
              className={`min-h-11 rounded-md px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${layout === option ? 'bg-depth-raised text-ink-primary' : 'text-ink-primary/75 hover:text-brand'}`}
            >
              {option === 'list' ? 'List' : 'Cards'}
            </button>
          ))}
        </div>
        <div
          className="min-h-0 flex-1 overflow-visible rounded-xl border border-depth-border bg-depth-surface lg:overflow-y-auto"
          role="region"
          aria-label={layout === 'list' ? 'Project list' : 'Project cards'}
          tabIndex={0}
        >
          {layout === 'list' && (
            <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,2fr)_1.2fr_1fr_1fr_44px] gap-4 border-b border-depth-border bg-depth-surface px-5 py-4 text-xs text-ink-primary/75 md:grid">
              <span>Project</span>
              <span>Tasks completed</span>
              <span>Total focus</span>
              <span>Last focused</span>
              <span className="sr-only">Actions</span>
            </div>
          )}
          {error ? (
            <div role="alert" className="p-8 text-center text-sm text-ink-primary">
              <p>We couldn’t load project activity. Try again.</p>
              <Button
                variant="ghost"
                onClick={() => {
                  void collection.refetch()
                  statsQueries.forEach((query) => void query.refetch())
                }}
              >
                Retry
              </Button>
            </div>
          ) : loading ? (
            <div aria-label="Loading projects" className="space-y-5 p-5">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-depth-raised" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <FolderKanban className="text-brand" size={28} />
              <h2 className="text-base font-medium text-ink-primary">
                {projects.length
                  ? 'No matching projects'
                  : view === 'archived'
                    ? 'No archived projects'
                    : 'Create your first project'}
              </h2>
              <p className="max-w-sm text-sm text-ink-primary/75">
                {projects.length
                  ? 'Try another name or remove a filter to see more projects.'
                  : view === 'archived'
                    ? 'Archived projects keep their tasks and focus history here.'
                    : 'Group related tasks in a project, then focus on one task at a time.'}
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  if (projects.length) {
                    clearFilters()
                    setSearchQuery('')
                  } else if (view === 'archived') setView('active')
                  else handleNewProject()
                }}
              >
                {projects.length
                  ? 'Clear search and filters'
                  : view === 'archived'
                    ? 'View active projects'
                    : 'Create project'}
              </Button>
            </div>
          ) : layout === 'cards' ? (
            <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((project) => {
                const query = stats.get(project.id)
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    stats={
                      query?.data ?? {
                        total_focus_minutes: 0,
                        total_tasks: 0,
                        completed_tasks: 0,
                        session_count: 0,
                        last_focused_at: null,
                      }
                    }
                    isStatsLoading={!query?.data}
                    onClick={() => navigate(PATHS.project(project.id))}
                    onEdit={() => setEditingProject(project)}
                    onArchive={() => archiveProject.mutate(project.id)}
                    onRestore={() => handleRestore(project.id)}
                    onDelete={() => setDeletingProject(project)}
                  />
                )
              })}
            </div>
          ) : (
            sorted.map((project) => {
              const query = stats.get(project.id)
              const data = query?.data
              const pct = data?.total_tasks
                ? Math.round((data.completed_tasks / data.total_tasks) * 100)
                : 0
              return (
                <article
                  key={project.id}
                  data-project-tour="project-card"
                  className="relative grid gap-4 border-b border-depth-border p-5 last:border-b-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand hover:bg-depth-raised/40 md:grid-cols-[minmax(0,2fr)_1.2fr_1fr_1fr_44px] md:items-center"
                >
                  <button
                    onClick={() => navigate(PATHS.project(project.id))}
                    aria-label={`Open ${project.name}`}
                    className="absolute inset-0 rounded-lg focus:outline-none"
                  />
                  <div className="pointer-events-none min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <ProjectIcon icon={project.icon} className="text-ink-primary/80" />
                      <h2 className="truncate text-base font-medium text-ink-primary">
                        {project.name}
                      </h2>
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-brand">
                      {data?.total_tasks === 0 && !project.is_archived
                        ? 'Add your first task'
                        : 'Open project'}
                      <ArrowRight size={13} />
                    </span>
                    <p className="mt-1 text-[11px] text-ink-primary/60">
                      Created{' '}
                      {new Date(project.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="pointer-events-none min-w-0">
                    <span className="mb-1 block text-xs text-ink-primary/60 md:hidden">
                      Tasks completed
                    </span>
                    <p className="text-sm text-ink-primary/80">
                      {query?.isError
                        ? 'Activity unavailable'
                        : !data
                          ? '—'
                          : data.total_tasks
                            ? `${data.completed_tasks} of ${data.total_tasks} tasks`
                            : 'No tasks yet'}
                    </p>
                    <div
                      className="mt-2 h-1 max-w-40 rounded-full bg-depth-raised"
                      role="img"
                      aria-label={`${pct}% of tasks completed`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: project.color }}
                      />
                    </div>
                  </div>
                  <div className="pointer-events-none">
                    <span className="mb-1 block text-xs text-ink-primary/60 md:hidden">
                      Total focus
                    </span>
                    <p className="font-data text-base text-ink-primary">
                      {data ? duration(data.total_focus_minutes) : '—'}
                    </p>
                  </div>
                  <div className="pointer-events-none">
                    <span className="mb-1 block text-xs text-ink-primary/60 md:hidden">
                      Last focused
                    </span>
                    <p className="text-xs text-ink-primary/75">
                      {data
                        ? data.last_focused_at
                          ? new Date(data.last_focused_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No sessions'
                        : '—'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      data-project-tour="project-actions"
                      aria-label={`Project actions for ${project.name}`}
                      className="relative z-[1] flex h-11 w-11 items-center justify-center rounded-md text-ink-primary/75 hover:bg-depth-raised"
                    >
                      <MoreHorizontal size={18} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditingProject(project)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          project.is_archived
                            ? handleRestore(project.id)
                            : archiveProject.mutate(project.id)
                        }
                      >
                        {project.is_archived ? 'Restore' : 'Archive'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => setDeletingProject(project)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </article>
              )
            })
          )}
        </div>
        <p className="shrink-0 text-xs text-ink-primary/65" aria-live="polite">
          {!loading && !error
            ? `${sorted.length} of ${projects.length} ${view} projects`
            : 'Loading project list'}{' '}
          · Open a project for its tasks and sessions. Plan task dates in the Planner.
        </p>
      </div>
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
