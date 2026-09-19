import { sectionPad } from '@/components/landing/primitives'
import { TaskKanbanMockup } from '@/components/landing/TaskKanbanMockup'

export function ProjectsSupportSection() {
  return (
    <section
      data-reveal-group
      className="px-5 md:px-8"
      style={{ ...sectionPad, paddingTop: '3.5rem' }}
    >
      <div className="mx-auto grid max-w-[1040px] items-center gap-10 border-t border-depth-border pt-12 md:grid-cols-[0.85fr_1.15fr] md:gap-14">
        <div data-reveal>
          <h2 className="text-[clamp(26px,4vw,36px)] font-medium leading-[1.15] tracking-[-0.03em] text-ink-primary">
            Keep tasks and focus time together.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-ink-primary/70">
            Pick a project or task when you start the timer. After the session, you can see the time spent on that work.
          </p>
          <div className="mt-7 border-t border-depth-border pt-5 text-sm leading-6 text-ink-primary/70">
            Organize tasks in a list or board, with priorities and due dates when you need them.
          </div>
        </div>
        <div data-reveal className="min-w-0">
          <TaskKanbanMockup />
        </div>
      </div>
    </section>
  )
}
