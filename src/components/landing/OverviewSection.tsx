interface OverviewItem {
  title: string
  description: string
}

const ITEMS: OverviewItem[] = [
  { title: 'Focus', description: 'Start a countdown or stopwatch.' },
  { title: 'Set goals', description: 'Choose how much focus time to aim for.' },
  { title: 'See progress', description: 'See your sessions, streaks, and trends.' },
  { title: 'Share', description: 'Turn your Analytics view into an image.' },
  { title: 'Focus together', description: 'Invite friends into a private group.' },
]

export function OverviewSection() {
  return (
    <section id="features" data-focus-path className="px-5 pb-12 pt-20 md:px-8 md:pb-4 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div data-focus-path-header className="max-w-xl">
          <h2 className="text-[clamp(28px,3.4vw,42px)] font-medium leading-[1.15] tracking-[-0.03em] text-ink-primary">
            From focused sessions to visible progress
          </h2>
        </div>

        <ol className="mt-10 grid grid-cols-1 border-t border-depth-border md:mt-14 md:grid-cols-5">
          {ITEMS.map(({ title, description }, index) => (
            <li
              key={title}
              data-focus-step
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 border-b border-depth-border py-5 last:border-b-0 md:block md:border-b-0 md:border-r md:px-5 md:py-6 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
            >
              <span aria-hidden="true" className="font-data text-xs text-brand">
                0{index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-medium tracking-[-0.01em] text-ink-primary md:mt-5">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
