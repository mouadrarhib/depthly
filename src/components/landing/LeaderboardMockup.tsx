import { Target } from 'lucide-react'

const ENTRIES = [
  { rank: 1, initial: 'S', name: 'Sara', hours: '9h 40m', goal: 97, sessions: 5, creator: true },
  { rank: 2, initial: 'M', name: 'Mouad', hours: '8h 15m', goal: 83, sessions: 4, you: true },
  { rank: 3, initial: 'A', name: 'Aya', hours: '6h 30m', goal: 65, sessions: 3 },
  { rank: 4, initial: 'J', name: 'Jonas', hours: '5h 05m', goal: 51, sessions: 2 },
]

/** Static example using the real group-detail header, target, and ranking patterns. */
export function LeaderboardMockup() {
  return (
    <figure className="mx-auto w-full" style={{ maxWidth: 480 }}>
      <div
        role="img"
        aria-label="Example active weekly group leaderboard with four members. Mouad is ranked second. A shared ten-hour target and each member's goal progress, session count, and trusted focus time are shown."
      >
        <div className="overflow-hidden rounded-[16px] border border-depth-border bg-depth-surface">
          <div className="border-b border-depth-border p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] text-brand">
                Active
              </span>
              <span className="text-xs text-ink-secondary">Weekly leaderboard</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-ink-primary">
              Weekly focus circle
            </h3>
          </div>
          <div className="grid grid-cols-2 divide-x divide-depth-border">
            <div className="px-4 py-3 sm:px-5">
              <p className="text-[11px] text-ink-secondary">Members</p>
              <p className="font-data mt-1 text-lg text-ink-primary">4</p>
            </div>
            <div className="px-4 py-3 sm:px-5">
              <p className="text-[11px] text-ink-secondary">Your rank</p>
              <p className="font-data mt-1 text-lg text-brand">#2</p>
            </div>
          </div>
        </div>

        <div className="my-3 flex items-center gap-2 rounded-xl border border-depth-border bg-depth-raised px-4 py-3 text-xs text-ink-primary/70">
          <Target size={15} className="shrink-0 text-brand" />
          <span>Shared target: <span className="font-data text-ink-primary">10h</span> per member this round</span>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-depth-border bg-depth-surface">
          <div className="flex items-center border-b border-depth-border px-4 py-2.5 text-[10px] uppercase tracking-wider text-ink-secondary">
            <span className="w-9 shrink-0">Rank</span>
            <span className="min-w-0 flex-1">Member</span>
            <span className="hidden w-20 shrink-0 sm:block">Goal</span>
            <span className="shrink-0 text-right" style={{ width: 70 }}>Focus</span>
          </div>
          {ENTRIES.map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center border-b border-depth-border px-4 py-3 last:border-0"
            >
              <span className={`font-data w-9 shrink-0 text-sm ${entry.you ? 'text-brand' : 'text-ink-secondary'}`}>
                #{entry.rank}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="font-data flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-depth-raised text-xs text-ink-secondary">
                  {entry.initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink-primary">
                    {entry.name}{entry.you ? ' (You)' : ''}
                  </p>
                  <p className="text-[11px] text-ink-secondary">
                    {entry.creator ? 'Creator' : `${entry.sessions} sessions`}
                  </p>
                </div>
              </div>
              <div className="hidden w-20 shrink-0 pr-3 sm:block">
                <div className="h-1.5 overflow-hidden rounded-full bg-depth-raised">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${entry.goal}%` }} />
                </div>
                <p className="font-data mt-1 text-[10px] text-ink-secondary">{entry.goal}%</p>
              </div>
              <div className="shrink-0 text-right" style={{ width: 70 }}>
                <p className="font-data text-xs text-ink-primary">{entry.hours}</p>
                <p className="font-data text-[10px] text-ink-secondary sm:hidden">{entry.goal}% goal</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-secondary">
        Example private group
      </figcaption>
    </figure>
  )
}
