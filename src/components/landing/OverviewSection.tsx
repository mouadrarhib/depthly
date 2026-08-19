import { BarChart2, Share2, Target, Timer, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { SectionHeader } from './primitives'

interface OverviewItem {
  Icon: LucideIcon
  title: string
  description: string
}

const ITEMS: OverviewItem[] = [
  {
    Icon: Timer,
    title: 'Focus',
    description: 'Start a trusted timer session.',
  },
  {
    Icon: Target,
    title: 'Set goals',
    description: 'Choose what a focused day means.',
  },
  {
    Icon: BarChart2,
    title: 'See progress',
    description: 'Read the pattern behind your hours.',
  },
  {
    Icon: Share2,
    title: 'Share',
    description: 'Turn the current view into an image.',
  },
  {
    Icon: Users,
    title: 'Focus together',
    description: 'Invite a private focus circle.',
  },
]

export function OverviewSection() {
  return (
    <section id="features" data-focus-path className="px-5 pb-12 pt-[5.5rem] md:px-8 md:pb-4">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <div data-focus-path-header>
          <SectionHeader
            eyebrow="Your focus path"
            title="Start alone. Add accountability when it helps."
            subtext="Depthly keeps personal progress at the center. Sharing and competition are optional layers, not the product you have to work around."
          />
        </div>

        <div
          className="relative grid grid-cols-1 gap-3 md:grid-cols-5"
          style={{ marginTop: 56, perspective: 900 }}
        >
          {ITEMS.map(({ Icon, title, description }, index) => (
            <div
              key={title}
              data-focus-step
              className="relative flex items-center gap-4 rounded-xl border border-depth-border bg-depth-surface p-4 md:flex-col md:items-start md:gap-3"
            >
              <span
                data-focus-step-icon
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
              <div className="min-w-0 flex-1 md:min-h-[76px]">
                <span className="font-data text-[10px] text-[#555266]">0{index + 1}</span>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#E8E6F0',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: '#848198', lineHeight: 1.6 }}>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
