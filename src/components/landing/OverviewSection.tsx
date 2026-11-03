import { ArrowRight, BarChart3, Check, FolderKanban, ListTodo, Timer } from 'lucide-react'

const FLOW_STEPS = [
  {
    title: 'Group related work',
    description: 'Keep study or client work in a project.',
    eyebrow: 'Project',
    preview: 'Project Alpha',
    detail: 'One place for related work',
    icon: FolderKanban,
  },
  {
    title: 'Choose one task',
    description: 'Focus on one thing you want to finish.',
    eyebrow: 'Task',
    preview: 'Research outline',
    detail: 'Inside Project Alpha',
    icon: ListTodo,
  },
  {
    title: 'Focus for a while',
    description: 'Start a countdown or stopwatch for your task.',
    eyebrow: 'Session',
    preview: '25:00',
    detail: 'Research outline',
    icon: Timer,
  },
  {
    title: 'See your time add up',
    description: 'Your session stays with the task and adds to your progress.',
    eyebrow: 'Progress',
    preview: '25 min added',
    detail: 'Daily goal · Weekly history',
    icon: BarChart3,
  },
]

export function OverviewSection() {
  return (
    <section
      id="features"
      data-focus-path
      className="scroll-mt-16 px-5 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24"
    >
      <div className="mx-auto max-w-6xl">
        <div data-focus-path-header className="max-w-3xl">
          <h2 className="text-[clamp(28px,3.4vw,42px)] font-medium leading-[1.12] tracking-[-0.03em] text-ink-primary">
            One session connects your work to your progress.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-secondary sm:text-base">
            Projects keep tasks together. Choose a task when you focus, and Depthly tracks the time
            you spend on it.
          </p>
        </div>

        <ol className="mt-9 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-4 lg:gap-5">
          {FLOW_STEPS.map(({ title, description, eyebrow, preview, detail, icon: Icon }, index) => (
            <li
              key={title}
              data-focus-step
              className="relative flex min-w-0 flex-col rounded-xl border border-depth-border bg-depth-surface px-5 py-5 sm:px-6 lg:min-h-[272px] lg:px-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-brand">
                  <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  <span>{eyebrow}</span>
                </div>
                <span className="font-data text-xs text-ink-secondary">0{index + 1}</span>
              </div>
              <div className="mt-7 flex min-h-[52px] items-center gap-3">
                {index === 3 && (
                  <Check size={19} className="shrink-0 text-emerald-400" aria-hidden="true" />
                )}
                <p
                  className={`min-w-0 text-xl font-medium leading-tight text-ink-primary ${index >= 2 ? 'font-data' : ''}`}
                >
                  {preview}
                </p>
              </div>
              <p className="mt-1 text-xs text-ink-secondary">{detail}</p>
              {index === 3 && (
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-depth-border"
                  aria-hidden="true"
                >
                  <div className="h-full w-[62.5%] rounded-full bg-brand" />
                </div>
              )}
              <h3 className="mt-auto pt-8 text-[15px] font-medium tracking-[-0.01em] text-ink-primary">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-secondary">{description}</p>
              {index < FLOW_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[23px] left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center bg-depth-bg text-brand lg:-right-[21px] lg:bottom-auto lg:left-auto lg:top-[74px] lg:translate-x-0"
                >
                  <ArrowRight data-focus-connector size={17} className="rotate-90 lg:rotate-0" />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
