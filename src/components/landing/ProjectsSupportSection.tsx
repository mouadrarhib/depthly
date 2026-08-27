import { FolderKanban, Link2 } from 'lucide-react'

import { sectionPad } from '@/components/landing/primitives'
import { TaskKanbanMockup } from '@/components/landing/TaskKanbanMockup'

export function ProjectsSupportSection() {
  return (
    <section
      data-reveal-group
      className="px-5 md:px-8"
      style={{ ...sectionPad, paddingTop: '3.5rem' }}
    >
      <div className="mx-auto grid max-w-[980px] items-center gap-8 rounded-2xl border border-depth-border bg-depth-surface p-5 sm:p-8 md:grid-cols-[0.85fr_1.15fr]">
        <div data-reveal>
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-depth-border bg-depth-raised text-brand">
            <FolderKanban size={19} />
          </span>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Supporting your focus
          </p>
          <h2 className="mt-2 text-[clamp(24px,4vw,32px)] font-medium leading-tight tracking-[-0.03em] text-ink-primary">
            Give every focused hour somewhere to go.
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-ink-secondary">
            Projects and tasks keep study plans, client work, and personal goals organized. Pick one
            when the timer starts, then see the time build on the work itself.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[12px] text-ink-secondary">
            <Link2 size={14} className="text-brand" /> List or kanban · priorities · due dates
          </div>
        </div>
        <div data-reveal className="min-w-0">
          <TaskKanbanMockup />
        </div>
      </div>
    </section>
  )
}
