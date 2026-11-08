import { Check, Clock3, Repeat2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Spinner } from '@/components/ui'
import { shortDate } from '@/lib/utils/plannerDates'
import type { PlannerEntry } from '@/lib/utils/recurrence'
import { PATHS } from '@/routes/paths'

type Props = {
  entries: PlannerEntry[]
  missed: PlannerEntry | null
  upcoming: PlannerEntry[]
  projectNames: Map<string, string>
  isLoading: boolean
  isError: boolean
  isSaving: boolean
  saveError: boolean
  canSelectTask: boolean
  onSelectTask: (entry: PlannerEntry) => void
  onToggleDone: (entry: PlannerEntry) => void
}

export function TodayPlanCard({
  entries,
  missed,
  upcoming,
  projectNames,
  isLoading,
  isError,
  isSaving,
  saveError,
  canSelectTask,
  onSelectTask,
  onToggleDone,
}: Props) {
  const visible = entries.filter((entry) => entry.state !== 'skipped').slice(0, 3)
  const remaining = entries.filter((entry) => entry.state !== 'skipped').length - visible.length

  return (
    <section
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground lg:min-h-[396px]"
      aria-labelledby="today-plan-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="today-plan-heading" className="text-base font-semibold text-foreground">
            Today’s plan
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">One next step at a time.</p>
        </div>
        <Link
          to={PATHS.planner}
          className="inline-flex min-h-10 shrink-0 items-center text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Open Planner →
        </Link>
      </div>

      {saveError && (
        <p role="alert" className="mt-3 text-xs text-red-300">
          Couldn’t update the task. Please try again.
        </p>
      )}

      {isLoading ? (
        <div className="flex min-h-44 items-center justify-center">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="mt-5 border-t border-border pt-5">
          <p role="alert" className="text-sm text-muted-foreground">
            Your plan couldn’t load.
          </p>
          <Link
            to={PATHS.planner}
            className="mt-2 inline-flex min-h-10 items-center text-sm text-brand hover:underline"
          >
            Open Planner →
          </Link>
        </div>
      ) : visible.length ? (
        <div className="mt-4 divide-y divide-border border-t border-border">
          {visible.map((entry) => {
            const done = entry.state === 'done'
            return (
              <div
                key={`${entry.task.id}:${entry.date}`}
                className="flex min-h-[68px] items-center gap-3 py-3"
              >
                <button
                  type="button"
                  onClick={() => onToggleDone(entry)}
                  disabled={isSaving}
                  aria-label={`${done ? 'Reopen' : 'Complete'} ${entry.task.title} for today`}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${done ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'border-border text-muted-foreground hover:border-brand hover:text-brand'}`}
                >
                  {done && <Check size={16} aria-hidden="true" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                  >
                    {entry.task.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    {entry.recurring && (
                      <Repeat2 size={12} className="shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">
                      {projectNames.get(entry.task.project_id) ?? 'Project'}
                      {entry.recurring ? ' · Repeats' : ''}
                      {done ? ' · Complete' : ''}
                    </span>
                  </p>
                </div>
                {!done && canSelectTask && (
                  <button
                    type="button"
                    onClick={() => onSelectTask(entry)}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md bg-brand/15 px-2 text-xs font-medium text-brand hover:bg-brand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Clock3 size={13} aria-hidden="true" /> Select
                  </button>
                )}
              </div>
            )
          })}
          {remaining > 0 && (
            <p className="py-3 text-xs text-muted-foreground">+{remaining} more in your plan</p>
          )}
        </div>
      ) : (
        <div className="mt-5 border-t border-border py-6">
          <p className="text-sm text-muted-foreground">
            No tasks planned for today. Add a task or choose one from your project.
          </p>
          <Link
            to={PATHS.planner}
            className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-brand hover:underline"
          >
            Plan today →
          </Link>
        </div>
      )}

      {missed && !isLoading && !isError && (
        <div className="mt-3 rounded-lg bg-muted px-3 py-3">
          <p className="text-xs font-semibold text-foreground">Still to do</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {missed.task.title} was planned {shortDate(missed.date)}.
          </p>
          <Link
            to={PATHS.planner}
            className="mt-1 inline-flex min-h-9 items-center text-xs font-medium text-brand hover:underline"
          >
            Review missed task →
          </Link>
        </div>
      )}
      {!isLoading && !isError && visible.length === 1 && !missed && (
        <div className="mt-auto border-t border-border pt-4">
          <h3 className="text-xs font-semibold text-foreground">Coming up</h3>
          {upcoming.length ? (
            <div className="mt-2 space-y-2">
              {upcoming.map((entry) => (
                <p
                  key={`${entry.task.id}:${entry.date}`}
                  className="flex min-w-0 items-center justify-between gap-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1 truncate text-muted-foreground">
                    {entry.recurring && (
                      <Repeat2 size={12} className="shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{entry.task.title}</span>
                  </span>
                  <span className="font-data shrink-0 text-muted-foreground">
                    {shortDate(entry.date)}
                  </span>
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Nothing else planned this week.</p>
          )}
          <Link
            to={PATHS.planner}
            className="mt-2 inline-flex min-h-9 items-center text-xs font-medium text-brand hover:underline"
          >
            Plan your week →
          </Link>
        </div>
      )}
    </section>
  )
}
