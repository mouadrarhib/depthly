import { ArrowRight, BarChart3, CalendarDays, Circle, Repeat2, Timer } from 'lucide-react'

const WEEK_DAYS = [
  { day: 'M', date: '2' },
  { day: 'T', date: '3' },
  { day: 'W', date: '4' },
  { day: 'T', date: '5', selected: true },
  { day: 'F', date: '6' },
  { day: 'S', date: '7' },
  { day: 'S', date: '8' },
]

const WEEK_PROGRESS = [
  { day: 'M', minutes: 28 },
  { day: 'T', minutes: 42 },
  { day: 'W', minutes: 14 },
  { day: 'T', minutes: 58 },
  { day: 'F', minutes: 24 },
  { day: 'S', minutes: 46 },
  { day: 'S', minutes: 65, current: true },
]

export function OverviewSection() {
  return (
    <section
      id="features"
      data-focus-path
      className="scroll-mt-16 px-5 pb-10 pt-8 md:px-8 md:pb-10 md:pt-10"
    >
      <div className="mx-auto max-w-6xl">
        <div data-focus-path-header className="max-w-3xl">
          <h2 className="text-[clamp(28px,3.4vw,42px)] font-medium leading-[1.12] tracking-[-0.03em] text-ink-primary">
            Choose a task. Track your focus. See your progress.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-secondary sm:text-base">
            Plan tasks for the week or month. Depthly brings today’s work into view, keeps
            unfinished tasks in the Planner, and links each focus session to its task and project.
          </p>
        </div>

        <ol className="mt-8 grid grid-cols-1 gap-6 md:mt-9 lg:grid-cols-3 lg:gap-5 [&>li]:gap-y-1 [&>li]:pb-5">
          <li
            data-focus-step
            className="relative flex min-w-0 flex-col rounded-xl border border-depth-border bg-depth-surface p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-brand">
              <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
              <h3>Plan the work</h3>
            </div>

            <div className="mt-6 flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-lg font-medium text-ink-primary">
                Client website
              </p>
              <span className="shrink-0 text-xs text-ink-secondary">Project</span>
            </div>

            <div
              className="mt-4 grid grid-cols-7 gap-1.5"
              role="group"
              aria-label="Week of the 2nd, Thursday selected"
            >
              {WEEK_DAYS.map(({ day, date, selected }, index) => (
                <div
                  key={`${day}-${index}`}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-2 text-xs ${
                    selected
                      ? 'bg-brand/15 text-brand ring-1 ring-inset ring-brand/40'
                      : 'text-ink-secondary'
                  }`}
                >
                  <span>{day}</span>
                  <span className="font-data">{date}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-depth-border pt-4">
              <p className="text-xs font-medium text-ink-secondary">Thursday’s plan</p>
              <ul className="mt-3 space-y-2">
                <li
                  data-path-task
                  className="flex min-w-0 items-center gap-2.5 rounded-lg bg-brand/10 px-3 py-3"
                >
                  <Circle size={16} className="shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 truncate text-sm text-ink-primary">
                    Draft homepage copy
                  </span>
                </li>
                <li
                  data-path-task
                  className="flex min-w-0 items-center gap-2.5 rounded-lg bg-depth-bg/70 px-3 py-3"
                >
                  <Repeat2 size={16} className="shrink-0 text-ink-secondary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-primary">
                    Review client inbox
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-secondary">Weekdays</span>
                </li>
              </ul>
            </div>

            <p className="mt-auto border-t border-depth-border pt-5 text-xs leading-5 text-ink-secondary">
              Unfinished tasks stay visible in your Planner.
            </p>

            <span
              aria-hidden="true"
              className="absolute -bottom-[23px] left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center bg-depth-bg text-brand lg:-right-[21px] lg:bottom-auto lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0"
            >
              <ArrowRight data-focus-connector size={17} className="rotate-90 lg:rotate-0" />
            </span>
          </li>

          <li
            data-focus-step
            className="relative flex min-w-0 flex-col rounded-xl border border-depth-border bg-depth-surface p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-brand">
              <Timer size={17} strokeWidth={1.8} aria-hidden="true" />
              <h3>Focus on one task</h3>
            </div>

            <div className="mt-6">
              <p className="truncate text-lg font-medium text-ink-primary">Draft homepage copy</p>
              <p className="mt-1 truncate text-xs text-ink-secondary">
                Client website · Thursday’s plan
              </p>
            </div>

            <div className="my-5 border-t border-depth-border" />

            <div className="flex flex-col items-center py-3">
              <div className="relative flex items-center justify-center">
                <svg width="176" height="176" viewBox="0 0 200 200" fill="none" aria-hidden="true">
                  <circle
                    cx="100"
                    cy="100"
                    r="86"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-depth-border"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="86"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    data-path-timer
                    strokeDasharray="136 541"
                    transform="rotate(-90 100 100)"
                    className="text-brand"
                  />
                </svg>
                <div className="text-center">
                  <p className="font-data absolute inset-0 flex flex-col items-center justify-center text-[38px] font-medium leading-none tracking-[-0.04em] text-ink-primary">
                    25:00
                    <span className="mt-3 font-sans text-[10px] font-medium tracking-[0.16em] text-ink-secondary">
                      FOCUS SESSION
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-auto border-t border-depth-border pt-5 text-xs leading-5 text-ink-secondary">
              The session stays linked to this task.
            </p>

            <span
              aria-hidden="true"
              className="absolute -bottom-[23px] left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center bg-depth-bg text-brand lg:-right-[21px] lg:bottom-auto lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0"
            >
              <ArrowRight data-focus-connector size={17} className="rotate-90 lg:rotate-0" />
            </span>
          </li>

          <li
            data-focus-step
            className="flex min-w-0 flex-col rounded-xl border border-depth-border bg-depth-surface p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-brand">
              <BarChart3 size={17} strokeWidth={1.8} aria-hidden="true" />
              <h3>See the time add up</h3>
            </div>

            <div className="mt-6">
              <p className="text-lg font-medium text-ink-primary">25 min added</p>
              <p className="mt-1 truncate text-xs text-ink-secondary">To Draft homepage copy</p>
            </div>

            <div className="my-5 border-t border-depth-border" />

            <div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-ink-primary">Daily goal</p>
                <p className="font-data text-xs text-ink-secondary">75 / 120 min</p>
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-depth-border"
                role="img"
                aria-label="Daily goal: 75 of 120 minutes, 62.5 percent"
              >
                <div data-path-goal className="h-full w-[62.5%] rounded-full bg-brand" />
              </div>
            </div>

            <div className="mt-6 border-t border-depth-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-primary">Your week</p>
                <p className="font-data text-xs text-ink-secondary">5h focused</p>
              </div>
              <div
                className="mt-4 grid grid-cols-7 gap-3 sm:gap-4"
                role="img"
                aria-label="Illustrative focus time over seven days"
              >
                {WEEK_PROGRESS.map(({ day, minutes, current }, index) => (
                  <div key={`${day}-${index}`} className="flex min-w-0 flex-col items-center gap-2">
                    <div className="flex h-14 w-full items-end justify-center">
                      <div
                        data-path-bar
                        className={`w-full max-w-7 rounded-t-[4px] ${current ? 'bg-brand' : 'bg-brand/35'}`}
                        style={{ height: minutes === 0 ? 2 : `${(minutes / 65) * 100}%` }}
                      />
                    </div>
                    <span
                      className={`font-data text-[10px] ${current ? 'text-brand' : 'text-ink-secondary'}`}
                    >
                      {day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-auto border-t border-depth-border pt-5 text-xs leading-5 text-ink-secondary">
              Task time contributes to your goal and history.
            </p>
          </li>
        </ol>
      </div>
    </section>
  )
}
