const WEEK = [
  { day: 'M', height: 38 },
  { day: 'T', height: 62 },
  { day: 'W', height: 46 },
  { day: 'T', height: 82 },
  { day: 'F', height: 58 },
  { day: 'S', height: 92 },
  { day: 'S', height: 74 },
]

/** A static example of the image exported by Share Progress. */
export function ShareProgressMockup() {
  return (
    <figure className="mx-auto w-full max-w-[430px]">
      <div
        role="img"
        aria-label="Example Depthly share image for a week with 14 hours 20 minutes of focus, 18 sessions, and a seven-day focus chart."
        className="relative overflow-hidden rounded-[16px] border border-depth-border bg-depth-surface p-5 sm:p-6"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-brand" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[-0.02em] text-ink-primary">DEPTHLY</p>
            <p className="mt-1 text-[11px] text-ink-primary/70">Jul 13-19 analytics</p>
          </div>
          <span className="font-data text-[10px] text-ink-primary/70">WEEKLY</span>
        </div>

        <div className="mt-5 rounded-[12px] border border-depth-border bg-depth-bg p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-4 border-b border-depth-border pb-4">
            <div>
              <p className="text-[11px] text-ink-secondary">Focus time</p>
              <p className="font-data mt-1 text-xl font-medium text-ink-primary">14h 20m</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-secondary">Sessions</p>
              <p className="font-data mt-1 text-xl font-medium text-ink-primary">18</p>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-ink-primary">Focus by day</p>
              <p className="font-data text-[11px] text-brand">Goal 12h</p>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {WEEK.map(({ day, height }, index) => (
                <div key={index} className="min-w-0 text-center">
                  <div className="flex h-[76px] items-end">
                    <span
                      className="w-full rounded-t-[3px] bg-brand/80"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="font-data mt-2 block text-[10px] text-ink-secondary">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
          <p className="text-[10px] text-ink-primary/70">Focus deeply. Track your progress.</p>
          <p className="text-[10px] font-medium text-brand">getdepthly.com</p>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-secondary">
        Example share image
      </figcaption>
    </figure>
  )
}
