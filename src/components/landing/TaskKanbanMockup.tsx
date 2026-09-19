import { Clock } from 'lucide-react'

import { PriorityBadge } from '@/components/ui/PriorityBadge'

type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Status = 'todo' | 'in_progress' | 'done'

interface PreviewTask {
  title: string
  priority: Priority
  focus?: string
}

// Match the real KanbanColumn status colors and tinted surfaces.
const STATUS_CONFIG: Record<Status, { bg: string; color: string; label: string }> = {
  todo: { bg: 'rgba(122, 120, 144, 0.06)', color: '#7A7890', label: 'To Do' },
  in_progress: { bg: 'rgba(75, 158, 255, 0.06)', color: '#4B9EFF', label: 'In Progress' },
  done: { bg: 'rgba(61, 214, 140, 0.06)', color: '#3DD68C', label: 'Done' },
}

const COLUMNS: { status: Status; tasks: PreviewTask[] }[] = [
  {
    status: 'todo',
    tasks: [
      { title: 'Review sources', priority: 'high' },
      { title: 'Draft conclusion', priority: 'medium' },
    ],
  },
  {
    status: 'in_progress',
    tasks: [{ title: 'Write outline', priority: 'medium', focus: '2h 15m' }],
  },
  {
    status: 'done',
    tasks: [{ title: 'Read papers', priority: 'low', focus: '1h 40m' }],
  },
]

/** Static, project-scoped preview using the real Kanban styling. */
export function TaskKanbanMockup() {
  return (
    <figure className="mx-auto w-full max-w-[540px]">
      <div
        role="img"
        aria-label="Example Research paper Kanban board with To Do, In Progress, and Done columns. Tasks show their priorities and recorded focus time."
        className="rounded-[16px] border border-depth-border bg-depth-bg p-4 sm:p-5"
      >
        <div className="flex items-end justify-between gap-4 border-b border-depth-border pb-4">
          <div>
            <p className="text-xs text-ink-secondary">Project</p>
            <h3 className="mt-1 text-base font-medium text-ink-primary">Research paper</h3>
          </div>
          <div className="text-right">
            <p className="font-data text-sm text-ink-primary">6h 45m</p>
            <p className="text-[11px] text-ink-secondary">focused</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {COLUMNS.map(({ status, tasks }) => {
            const cfg = STATUS_CONFIG[status]
            return (
              <div
                key={status}
                className="min-w-0 rounded-[14px] border p-3 sm:min-h-[225px]"
                style={{ borderColor: 'rgba(46, 46, 56, 0.8)', backgroundColor: cfg.bg }}
              >
                <div className="mb-3 flex items-start gap-1.5">
                  <div className="flex min-w-0 items-start gap-1.5">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="min-w-0 text-[11px] font-semibold leading-4" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span
                      className="font-data shrink-0 rounded-full px-1.5 text-[10px] font-semibold"
                      style={{ backgroundColor: `${cfg.color}26`, color: cfg.color }}
                    >
                      {tasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.title} className="rounded-[10px] border border-depth-border bg-depth-surface p-3">
                      <PriorityBadge priority={task.priority} dimmed={status === 'done'} />
                      <p
                        className={`mt-2 text-xs font-medium leading-5 text-ink-primary ${status === 'done' ? 'opacity-50 line-through' : ''}`}
                      >
                        {task.title}
                      </p>
                      {task.focus ? (
                        <p className="font-data mt-2 flex items-center gap-1.5 border-t border-depth-border pt-2 text-[11px] text-ink-secondary">
                          <Clock size={11} strokeWidth={1.75} /> {task.focus}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-secondary">
        Example project board
      </figcaption>
    </figure>
  )
}
