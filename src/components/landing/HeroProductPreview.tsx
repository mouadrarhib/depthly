import { CheckCircle2, Timer } from 'lucide-react'

import { Card } from '@/components/ui/Card'

// Illustrative 25-minute sessions: 5 hours total, including 75 minutes on Sunday.
const WEEK = [
  { day: 'M', minutes: 25 },
  { day: 'T', minutes: 50 },
  { day: 'W', minutes: 0 },
  { day: 'T', minutes: 75 },
  { day: 'F', minutes: 25 },
  { day: 'S', minutes: 50 },
  { day: 'S', minutes: 75 },
]

/** A completed session and the personal progress it contributes to, not live data. */
export function HeroProductPreview() {
  return (
    <figure className="m-0 w-full min-w-0">
      <Card
        role="img"
        aria-label="Example Depthly progress: a completed 25-minute Research outline session in Project Alpha. Today's focus is 75 of a 120-minute daily goal. The seven-day chart totals five hours."
        className="overflow-hidden rounded-xl border-depth-border bg-depth-surface p-5 shadow-none sm:p-7"
      >
        <div className="flex items-center justify-between gap-3 text-sm text-ink-primary/80">
          <span className="flex items-center gap-2"><Timer size={16} className="text-brand" /> Focus session</span>
          <span className="flex items-center gap-1.5 text-brand">
            <CheckCircle2 size={14} /> Complete
          </span>
        </div>

        <div className="py-6 sm:py-7">
          <p className="font-data text-5xl font-medium leading-none tracking-tight text-ink-primary sm:text-6xl">
            25:00
          </p>
          <p className="mt-4 text-base font-medium text-ink-primary">Research outline</p>
          <p className="mt-1 text-sm text-ink-primary/75">Project Alpha</p>
        </div>

        <div data-hero-goal className="border-t border-depth-border py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
            <p className="text-sm text-ink-primary">Daily goal</p>
            <p className="font-data text-sm text-ink-primary">75 <span className="text-ink-primary/75">/ 120 min</span></p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-depth-raised">
            <div data-hero-goal-fill className="h-full rounded-full bg-brand" style={{ width: '62.5%' }} />
          </div>
          <p className="mt-2 text-sm text-ink-primary/75"><span className="font-data">25 min</span> added to your goal.</p>
        </div>

        <div data-hero-week className="border-t border-depth-border pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-ink-primary">Your week</p>
            <p className="font-data text-sm text-ink-primary">5h <span className="font-sans text-ink-primary/75">focused</span></p>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-3 sm:gap-4">
            {WEEK.map(({ day, minutes }, index) => (
              <div key={index} className="flex min-w-0 flex-col items-center gap-2">
                <div className="flex h-14 w-full items-end justify-center">
                  <div
                    data-hero-week-bar
                    className={`w-full max-w-8 rounded-t-sm ${index === WEEK.length - 1 ? 'bg-brand' : 'bg-brand/35'}`}
                    style={{ height: minutes === 0 ? 2 : `${(minutes / 75) * 100}%` }}
                  />
                </div>
                <span className={`font-data text-xs ${index === WEEK.length - 1 ? 'text-brand' : 'text-ink-primary/75'}`}>{day}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <figcaption className="mt-3 text-center text-xs text-ink-primary/75">Example session and progress</figcaption>
    </figure>
  )
}
