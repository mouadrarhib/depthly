import { BarChart2, FolderKanban, Timer, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { SectionHeader, sectionPad } from './primitives'

interface OverviewItem {
  Icon: LucideIcon
  title: string
  description: string
}

const ITEMS: OverviewItem[] = [
  {
    Icon: Timer,
    title: 'Focus timer',
    description:
      'Pomodoro or stopwatch sessions with breaks that keep you fresh. Start a session in one click.',
  },
  {
    Icon: FolderKanban,
    title: 'Projects & tasks',
    description:
      'Organize work into projects, plan in list or kanban view, and tie every session to what mattered.',
  },
  {
    Icon: BarChart2,
    title: 'Analytics',
    description:
      'Daily, weekly, monthly, and yearly views of your focus time — with heatmaps, trends, and totals.',
  },
  {
    Icon: Trophy,
    title: 'Leaderboard',
    description:
      'Compete on weekly focus hours, follow friends, and let a little accountability keep you going.',
  },
]

export function OverviewSection() {
  return (
    <section id="features" data-reveal-group className="px-5 md:px-8" style={sectionPad}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <SectionHeader
          eyebrow="How it works"
          title="Everything you need to focus"
          subtext="Depthly is more than a timer — it's a lightweight system for building a deep work habit and understanding where your time goes."
        />

        <div
          className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2"
          style={{ marginTop: 56, maxWidth: 880, marginLeft: 'auto', marginRight: 'auto' }}
        >
          {ITEMS.map(({ Icon, title, description }) => (
            <div key={title} data-reveal className="flex items-start gap-4">
              <span
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#222228',
                  border: '1px solid #2E2E38',
                }}
              >
                <Icon size={19} style={{ color: '#4B9EFF' }} strokeWidth={1.75} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#E8E6F0', letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: '#7A7890', lineHeight: 1.6 }}>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
