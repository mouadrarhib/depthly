import { useMemo, useState } from 'react'

import { Check, ChevronLeft, ChevronRight, Clock3, Plus, Repeat2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button, Spinner } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useProjects } from '@/hooks/useProjects'
import { useSetTaskOccurrence, useTaskOccurrences } from '@/hooks/useTaskOccurrences'
import { useCreateTask, usePlannerTasks, useUpdateTask } from '@/hooks/useTasks'
import type { Task } from '@/lib/supabase/queries/tasks'
import {
  addDays,
  dateKey,
  fromDateKey,
  monthGrid,
  monthRange,
  shortDate,
  startOfWeek,
  weekRange,
} from '@/lib/utils/plannerDates'
import { daysInRange, entriesForDay } from '@/lib/utils/recurrence'
import type { PlannerEntry, OccurrenceState } from '@/lib/utils/recurrence'
import { PATHS } from '@/routes/paths'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'

type View = 'today' | 'week' | 'month'
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PRIORITY_SCORE = { urgent: 4, high: 3, medium: 2, low: 1 }

function compareTasks(a: Task, b: Task): number {
  const due = (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
  if (due !== 0) return due
  return PRIORITY_SCORE[b.priority] - PRIORITY_SCORE[a.priority] || a.title.localeCompare(b.title)
}

function TaskLine({
  entry,
  projectName,
  onFocus,
  onDone,
  onSchedule,
  onSkip,
}: {
  entry: PlannerEntry
  projectName: string
  onFocus: () => void
  onDone: () => void
  onSchedule?: (date: string | null) => void
  onSkip?: () => void
}) {
  const { task } = entry
  const done = entry.state === 'done'
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-depth-border px-4 py-4 last:border-b-0 sm:px-5">
      <button
        type="button"
        onClick={onDone}
        disabled={entry.state === 'skipped'}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className={`flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${done ? 'border-brand/60 bg-brand/15 text-brand' : 'border-depth-border text-ink-secondary hover:border-brand hover:text-brand'}`}
      >
        {done && <Check size={17} aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1 basis-40">
        <p
          className={`text-sm font-medium ${done ? 'text-ink-secondary line-through' : 'text-ink-primary'}`}
        >
          {task.title}
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          {projectName}
          {entry.recurring ? ' · Repeats' : ''}
          {task.due_date ? ` · Due ${shortDate(task.due_date)}` : ''}
        </p>
      </div>
      {entry.recurring && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="min-h-10 px-2 text-xs text-ink-secondary hover:text-ink-primary"
        >
          {entry.state === 'skipped' ? 'Undo skip' : 'Skip this day'}
        </button>
      )}
      {onSchedule && (
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Work day
          <input
            type="date"
            aria-label={`Work day for ${task.title}`}
            value={task.scheduled_date ?? ''}
            onChange={(event) => onSchedule(event.target.value || null)}
            className="h-10 rounded-md border border-depth-border bg-depth-raised px-2 text-xs text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
      )}
      {!done && entry.state !== 'skipped' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFocus}
          className="h-10 border-brand/40 bg-brand/10 text-brand hover:bg-brand/20 hover:text-brand"
        >
          <Clock3 size={15} /> Start focus
        </Button>
      )}
    </div>
  )
}

export function PlannerPage() {
  const navigate = useNavigate()
  const userId = useAuthStore((state) => state.user?.id ?? '')
  const setSelectedProject = useTimerStore((state) => state.setSelectedProject)
  const setSelectedTask = useTimerStore((state) => state.setSelectedTask)
  const { data: tasks = [], isLoading, isError, refetch } = usePlannerTasks()
  const { data: projects = [] } = useProjects()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const setOccurrence = useSetTaskOccurrence()
  const [view, setView] = useState<View>('month')
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [planWindow, setPlanWindow] = useState<'week' | 'month'>('week')
  const [scheduleOnDay, setScheduleOnDay] = useState(true)
  const [showAllUnplanned, setShowAllUnplanned] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [repeatStart, setRepeatStart] = useState(() => dateKey(new Date()))
  const [repeatEnd, setRepeatEnd] = useState('')

  const selected = useMemo(() => fromDateKey(selectedDate), [selectedDate])
  const today = dateKey(new Date())
  const occurrenceStart = dateKey(addDays(selected, -45))
  const occurrenceEnd = dateKey(addDays(selected, 45))
  const {
    data: occurrences = [],
    isLoading: occurrencesLoading,
    isError: occurrencesError,
    refetch: refetchOccurrences,
  } = useTaskOccurrences(occurrenceStart, occurrenceEnd)
  const occurrenceStates = useMemo(
    () =>
      new Map(
        occurrences.map((row) => [
          `${row.task_id}:${row.occurrence_date}`,
          row.state as OccurrenceState,
        ])
      ),
    [occurrences]
  )
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects]
  )
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks])
  const scheduled = useMemo(
    () =>
      entriesForDay(tasks, occurrenceStates, selectedDate).sort((a, b) =>
        compareTasks(a.task, b.task)
      ),
    [tasks, occurrenceStates, selectedDate]
  )
  const unfinished = useMemo(() => {
    const cutoff = selectedDate < today ? selectedDate : today
    const oneOff = activeTasks
      .filter((task) => !task.repeat_days && task.scheduled_date && task.scheduled_date < cutoff)
      .map(
        (task): PlannerEntry => ({
          task,
          date: task.scheduled_date!,
          recurring: false,
          state: 'open',
        })
      )
    const recentDays = daysInRange(
      dateKey(addDays(fromDateKey(cutoff), -7)),
      dateKey(addDays(fromDateKey(cutoff), -1))
    )
    const recurring = activeTasks.flatMap((task): PlannerEntry[] => {
      if (!task.repeat_days) return []
      const missed = [...recentDays]
        .reverse()
        .find((day) =>
          entriesForDay([task], occurrenceStates, day).some((entry) => entry.state === 'open')
        )
      return missed ? [{ task, date: missed, recurring: true, state: 'open' }] : []
    })
    return [...oneOff, ...recurring].sort((a, b) => compareTasks(a.task, b.task))
  }, [activeTasks, selectedDate, today, occurrenceStates])
  const suggested = useMemo(
    () =>
      activeTasks
        .filter(
          (task) =>
            !task.scheduled_date &&
            !task.repeat_days &&
            task.planned_start_date &&
            task.planned_end_date &&
            task.planned_start_date <= selectedDate &&
            task.planned_end_date >= selectedDate
        )
        .sort(compareTasks)
        .slice(0, 3),
    [activeTasks, selectedDate]
  )
  const unplanned = useMemo(
    () =>
      activeTasks
        .filter((task) => !task.scheduled_date && !task.planned_start_date && !task.repeat_days)
        .sort(compareTasks),
    [activeTasks]
  )

  const gridDays = useMemo(() => monthGrid(selected), [selected])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selected), index)),
    [selected]
  )

  function schedule(task: Task, date: string | null) {
    updateTask.mutate({ id: task.id, projectId: task.project_id, data: { scheduled_date: date } })
  }

  function plan(task: Task, window: 'week' | 'month') {
    const [planned_start_date, planned_end_date] =
      window === 'week' ? weekRange(selected) : monthRange(selected)
    updateTask.mutate({
      id: task.id,
      projectId: task.project_id,
      data: { planned_start_date, planned_end_date },
    })
  }

  function toggleDone(entry: PlannerEntry) {
    if (entry.recurring) {
      setOccurrence.mutate({
        taskId: entry.task.id,
        date: entry.date,
        state: entry.state === 'done' ? 'open' : 'done',
      })
      return
    }
    const task = entry.task
    const done = task.status === 'done'
    updateTask.mutate({
      id: task.id,
      projectId: task.project_id,
      data: {
        status: done ? 'todo' : 'done',
        completed_at: done ? null : new Date().toISOString(),
      },
    })
  }

  function skip(entry: PlannerEntry) {
    setOccurrence.mutate({
      taskId: entry.task.id,
      date: entry.date,
      state: entry.state === 'skipped' ? 'open' : 'skipped',
    })
  }

  function focus(task: Task) {
    setSelectedProject(task.project_id)
    setSelectedTask(task.id)
    navigate(PATHS.timer)
  }

  function movePeriod(amount: number) {
    if (view === 'month')
      setSelectedDate(
        dateKey(
          new Date(
            selected.getFullYear(),
            selected.getMonth() + amount,
            Math.min(selected.getDate(), 28)
          )
        )
      )
    else setSelectedDate(dateKey(addDays(selected, amount * (view === 'week' ? 7 : 1))))
  }

  function createPlannedTask(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !projectId || !userId) return
    const [planned_start_date, planned_end_date] =
      planWindow === 'week' ? weekRange(selected) : monthRange(selected)
    if (repeatDays.length && (!repeatStart || (repeatEnd && repeatEnd < repeatStart))) return
    const projectTasks = tasks.filter((task) => task.project_id === projectId)
    createTask.mutate(
      {
        project_id: projectId,
        user_id: userId,
        title: title.trim().slice(0, 100),
        planned_start_date: repeatDays.length ? null : planned_start_date,
        planned_end_date: repeatDays.length ? null : planned_end_date,
        scheduled_date: repeatDays.length ? null : scheduleOnDay ? selectedDate : null,
        repeat_days: repeatDays.length ? repeatDays : null,
        repeat_start_date: repeatDays.length ? repeatStart : null,
        repeat_end_date: repeatDays.length ? repeatEnd || null : null,
        list_order: projectTasks.length + 1,
        kanban_order: projectTasks.filter((task) => task.status === 'todo').length + 1,
      },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setTitle('')
          setRepeatDays([])
        },
      }
    )
  }

  const visibleDays = view === 'month' ? gridDays : weekDays
  const periodLabel =
    view === 'month'
      ? selected.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${shortDate(dateKey(weekDays[0]))} – ${shortDate(dateKey(weekDays[6]))}`
        : selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 py-2 sm:py-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-ink-primary">
            Plan your focus
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Give your tasks a place in the week, then choose what to focus on today.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Planner view"
          className="flex rounded-lg border border-depth-border bg-depth-surface p-1"
        >
          {(['today', 'week', 'month'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => {
                setView(option)
                if (option === 'today') setSelectedDate(today)
              }}
              className={`min-h-10 rounded-md px-4 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${view === option ? 'bg-brand/20 text-brand' : 'text-ink-secondary hover:text-ink-primary'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </header>

      {isLoading || occurrencesLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Spinner />
        </div>
      ) : isError || occurrencesError ? (
        <div className="rounded-xl border border-depth-border bg-depth-surface p-6 text-sm text-ink-primary">
          Couldn’t load your tasks.{' '}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void refetch()
              void refetchOccurrences()
            }}
            className="text-brand"
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          {setOccurrence.isError && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              Couldn’t update this repeat day. Please try again.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink-primary">
                {periodLabel}
              </h2>
              <button
                type="button"
                onClick={() => movePeriod(-1)}
                aria-label={`Previous ${view}`}
                className="flex size-10 items-center justify-center rounded-md text-ink-secondary hover:bg-depth-raised hover:text-ink-primary focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => movePeriod(1)}
                aria-label={`Next ${view}`}
                className="flex size-10 items-center justify-center rounded-md text-ink-secondary hover:bg-depth-raised hover:text-ink-primary focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className="min-h-10 rounded-md px-2 text-sm text-ink-secondary hover:text-ink-primary focus-visible:ring-2 focus-visible:ring-brand"
              >
                Today
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setProjectId(projects[0]?.id ?? '')
                setRepeatStart(selectedDate)
                setDialogOpen(true)
              }}
              className="h-11 bg-brand text-depth-bg hover:bg-brand/90"
            >
              <Plus size={16} /> Add task
            </Button>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              {view === 'today' ? (
                <div className="rounded-xl border border-depth-border bg-depth-surface">
                  <div className="border-b border-depth-border px-5 py-4">
                    <h3 className="font-semibold text-ink-primary">
                      {selectedDate === today ? 'Today’s plan' : 'Plan for this day'}
                    </h3>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {scheduled.length} tasks scheduled
                    </p>
                  </div>
                  {scheduled.length ? (
                    scheduled.map((entry) => (
                      <TaskLine
                        key={`${entry.task.id}:${entry.date}`}
                        entry={entry}
                        projectName={projectNames.get(entry.task.project_id) ?? 'Project'}
                        onFocus={() => focus(entry.task)}
                        onDone={() => toggleDone(entry)}
                        onSchedule={
                          entry.recurring ? undefined : (date) => schedule(entry.task, date)
                        }
                        onSkip={entry.recurring ? () => skip(entry) : undefined}
                      />
                    ))
                  ) : (
                    <p className="px-5 py-8 text-sm text-ink-secondary">
                      No tasks planned for this day. Add a task or choose one from your suggestions.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-depth-border bg-depth-surface">
                  <div className="grid min-w-[700px] grid-cols-7 border-b border-depth-border">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="px-3 py-3 text-xs font-medium text-ink-secondary">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid min-w-[700px] grid-cols-7">
                    {visibleDays.map((day) => {
                      const key = dateKey(day)
                      const dayTasks = entriesForDay(tasks, occurrenceStates, key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDate(key)}
                          aria-label={`${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, ${dayTasks.length} tasks`}
                          aria-pressed={key === selectedDate}
                          className={`flex min-h-36 min-w-0 flex-col items-stretch border-b border-r border-border p-2 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${view === 'week' ? 'min-h-72' : ''} ${key === selectedDate ? 'bg-brand/5 ring-1 ring-inset ring-brand' : 'hover:bg-muted/60'} ${day.getMonth() !== selected.getMonth() && view === 'month' ? 'opacity-45' : ''}`}
                        >
                          <span className={`font-data flex size-7 items-center justify-center rounded-full text-xs font-medium ${key === today ? 'bg-brand text-white' : 'text-foreground'}`}>
                            {day.getDate()}
                          </span>
                          <span className="mt-2 block min-w-0 space-y-1.5">
                            {dayTasks.slice(0, view === 'week' ? 5 : 2).map((entry) => (
                              <span
                                key={entry.task.id}
                                title={`${entry.task.title} · ${projectNames.get(entry.task.project_id) ?? 'Project'}${entry.recurring ? ' · Repeats' : ''}`}
                                className={`flex min-w-0 items-start gap-1.5 rounded-md border border-border px-1.5 py-1.5 text-[11px] font-medium leading-4 ${entry.state === 'done' ? 'bg-muted text-muted-foreground line-through' : entry.state === 'skipped' ? 'bg-muted text-muted-foreground' : 'bg-card text-foreground'}`}
                              >
                                {entry.state === 'done' ? <Check size={11} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /> : entry.recurring ? <Repeat2 size={11} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /> : <span className="mt-1 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: projects.find((project) => project.id === entry.task.project_id)?.color ?? 'var(--color-brand)' }} aria-hidden="true" />}
                                <span className="line-clamp-2 min-w-0 break-words">{entry.task.title}</span>
                              </span>
                            ))}
                            {dayTasks.length > (view === 'week' ? 5 : 2) && (
                              <span className="block px-1 text-[11px] font-medium text-muted-foreground">
                                +{dayTasks.length - (view === 'week' ? 5 : 2)} more
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-depth-border bg-depth-surface p-4">
                <h3 className="font-semibold text-ink-primary">
                  {selected.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h3>
                <p className="mt-1 text-xs text-ink-secondary">
                  {scheduled.length
                    ? `${scheduled.length} tasks on this day`
                    : 'No tasks on this day yet'}
                </p>
                {view !== 'today' &&
                  scheduled.map((entry) => (
                    <div key={entry.task.id} className="mt-4 border-t border-depth-border pt-4">
                      <p className="flex items-center gap-1 text-sm font-medium text-ink-primary">
                        {entry.recurring && <Repeat2 size={14} aria-hidden="true" />}
                        {entry.task.title}
                      </p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {projectNames.get(entry.task.project_id) ?? 'Project'}
                        {entry.state === 'skipped'
                          ? ' · Skipped'
                          : entry.state === 'done'
                            ? ' · Complete'
                            : ''}
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDone(entry)}
                          disabled={entry.state === 'skipped'}
                          className="mt-2 min-h-10 text-sm text-brand hover:underline"
                        >
                          {entry.state === 'done' ? 'Reopen' : 'Complete'}
                        </button>
                        {entry.recurring && (
                          <button
                            type="button"
                            onClick={() => skip(entry)}
                            className="mt-2 min-h-10 text-sm text-ink-secondary hover:text-ink-primary"
                          >
                            {entry.state === 'skipped' ? 'Undo skip' : 'Skip day'}
                          </button>
                        )}
                        {entry.state !== 'skipped' && (
                          <button
                            type="button"
                            onClick={() => focus(entry.task)}
                            className="mt-2 min-h-10 text-sm text-brand hover:underline"
                          >
                            Start focus →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              {unfinished.length > 0 && (
                <div className="rounded-xl border border-depth-border bg-depth-surface p-4">
                  <h3 className="font-semibold text-ink-primary">Still to do</h3>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Unfinished work stays visible. Repeats show the latest missed day from this
                    week.
                  </p>
                  {unfinished.map((entry) => (
                    <div
                      key={`${entry.task.id}:${entry.date}`}
                      className="mt-4 border-t border-depth-border pt-3"
                    >
                      <p className="text-sm text-ink-primary">{entry.task.title}</p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        Planned {shortDate(entry.date)}
                      </p>
                      {entry.recurring ? (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => toggleDone(entry)}
                            className="mt-2 min-h-10 text-xs font-medium text-brand hover:underline"
                          >
                            Mark done
                          </button>
                          <button
                            type="button"
                            onClick={() => skip(entry)}
                            className="mt-2 min-h-10 text-xs text-ink-secondary hover:text-ink-primary"
                          >
                            Skip missed day
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => schedule(entry.task, selectedDate)}
                          className="mt-2 min-h-10 text-xs font-medium text-brand hover:underline"
                        >
                          Move to this day
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-depth-border bg-depth-surface p-4">
                <h3 className="font-semibold text-ink-primary">Suggested from your plan</h3>
                <p className="mt-1 text-xs text-ink-secondary">
                  Tasks in this week or month without a work day.
                </p>
                {suggested.length ? (
                  suggested.map((task) => (
                    <div key={task.id} className="mt-4 border-t border-depth-border pt-3">
                      <p className="text-sm text-ink-primary">{task.title}</p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {projectNames.get(task.project_id) ?? 'Project'}
                        {task.due_date ? ` · Due ${shortDate(task.due_date)}` : ''}
                      </p>
                      <button
                        type="button"
                        onClick={() => schedule(task, selectedDate)}
                        className="mt-2 min-h-10 text-xs font-medium text-brand hover:underline"
                      >
                        Add to this day
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="mt-4 text-sm text-ink-secondary">
                    Plan a task for this week or month to see suggestions here.
                  </p>
                )}
              </div>
            </aside>
          </div>

          <section className="rounded-xl border border-depth-border bg-depth-surface p-5">
            <h2 className="font-semibold text-ink-primary">Unplanned tasks</h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Bring existing project tasks into your week or month.
            </p>
            {unplanned.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(showAllUnplanned ? unplanned : unplanned.slice(0, 8)).map((task) => (
                  <div key={task.id} className="rounded-lg border border-depth-border p-3">
                    <p className="text-sm font-medium text-ink-primary">{task.title}</p>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {projectNames.get(task.project_id) ?? 'Project'}
                    </p>
                    <div className="mt-2 flex gap-4">
                      <button
                        type="button"
                        onClick={() => plan(task, 'week')}
                        className="min-h-10 text-xs text-brand hover:underline"
                      >
                        Plan this week
                      </button>
                      <button
                        type="button"
                        onClick={() => plan(task, 'month')}
                        className="min-h-10 text-xs text-brand hover:underline"
                      >
                        Plan this month
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-secondary">
                Every open task has a place in your plan.
              </p>
            )}
            {unplanned.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllUnplanned((value) => !value)}
                className="mt-3 min-h-10 text-sm text-brand hover:underline"
              >
                {showAllUnplanned ? 'Show fewer tasks' : `Show all ${unplanned.length} tasks`}
              </button>
            )}
            {!projects.length && (
              <Link
                to={PATHS.projects}
                className="mt-3 inline-flex min-h-10 items-center text-sm text-brand hover:underline"
              >
                Create your first project →
              </Link>
            )}
          </section>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md border-depth-border bg-depth-surface text-ink-primary">
          <DialogHeader>
            <DialogTitle>Plan a task</DialogTitle>
          </DialogHeader>
          <form onSubmit={createPlannedTask} className="mt-2 space-y-4">
            <label className="block text-sm">
              Task name
              <input
                required
                maxLength={100}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-depth-border bg-depth-raised px-3 text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                placeholder="What will you work on?"
              />
            </label>
            <label className="block text-sm">
              Project
              <select
                required
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-depth-border bg-depth-raised px-3 text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">Choose a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2 border-t border-depth-border pt-4">
              <p className="text-sm font-medium">Repeat</p>
              <p className="text-xs text-ink-secondary">Add this task to each selected day.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Never', days: [] },
                  { label: 'Every day', days: [1, 2, 3, 4, 5, 6, 7] },
                  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setRepeatDays(option.days)}
                    aria-pressed={repeatDays.join(',') === option.days.join(',')}
                    className={`min-h-10 rounded-md border px-3 text-xs ${repeatDays.join(',') === option.days.join(',') ? 'border-brand bg-brand/15 text-brand' : 'border-depth-border text-ink-secondary hover:text-ink-primary'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5" aria-label="Repeat on these days">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => {
                  const day = index + 1
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-label={`Repeat on ${label}`}
                      aria-pressed={repeatDays.includes(day)}
                      onClick={() =>
                        setRepeatDays((current) =>
                          current.includes(day)
                            ? current.filter((item) => item !== day)
                            : [...current, day].sort()
                        )
                      }
                      className={`size-10 rounded-md border text-xs ${repeatDays.includes(day) ? 'border-brand bg-brand/20 text-brand' : 'border-depth-border text-ink-secondary hover:text-ink-primary'}`}
                    >
                      {label.slice(0, 2)}
                    </button>
                  )
                })}
              </div>
              {repeatDays.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-ink-secondary">
                    Starts
                    <input
                      required
                      type="date"
                      value={repeatStart}
                      onChange={(event) => setRepeatStart(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-depth-border bg-depth-raised px-2 text-sm text-ink-primary"
                    />
                  </label>
                  <label className="text-xs text-ink-secondary">
                    Ends (optional)
                    <input
                      type="date"
                      min={repeatStart}
                      value={repeatEnd}
                      onChange={(event) => setRepeatEnd(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-depth-border bg-depth-raised px-2 text-sm text-ink-primary"
                    />
                  </label>
                </div>
              )}
            </div>
            {repeatDays.length === 0 && (
              <label className="block text-sm">
                Plan for
                <select
                  value={planWindow}
                  onChange={(event) => setPlanWindow(event.target.value as 'week' | 'month')}
                  className="mt-1.5 h-11 w-full rounded-md border border-depth-border bg-depth-raised px-3 text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="week">This selected week</option>
                  <option value="month">This selected month</option>
                </select>
              </label>
            )}
            {repeatDays.length === 0 && (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={scheduleOnDay}
                  onChange={(event) => setScheduleOnDay(event.target.checked)}
                  className="size-4 accent-brand"
                />
                Schedule for {shortDate(selectedDate)}
              </label>
            )}
            {repeatDays.length > 0 && repeatEnd && repeatEnd < repeatStart && (
              <p role="alert" className="text-xs text-red-400">
                End date must be after the start date.
              </p>
            )}
            {createTask.isError && (
              <p role="alert" className="text-sm text-red-400">
                Couldn’t create the task. Please try again.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!projects.length}
                isLoading={createTask.isPending}
                className="bg-brand text-depth-bg hover:bg-brand/90"
              >
                Add task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
