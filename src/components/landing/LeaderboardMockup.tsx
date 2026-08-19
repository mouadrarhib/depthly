import { Copy, Target, Trophy, Users } from 'lucide-react'

const ENTRIES = [
  { rank: 1, initial: 'S', color: '#A78BFA', name: 'Sara', hours: '9h 40m', progress: 97 },
  {
    rank: 2,
    initial: 'M',
    color: '#4B9EFF',
    name: 'Mouad',
    hours: '8h 15m',
    progress: 83,
    you: true,
  },
  { rank: 3, initial: 'A', color: '#F472B6', name: 'Aya', hours: '6h 30m', progress: 65 },
  { rank: 4, initial: 'J', color: '#3DD68C', name: 'Jonas', hours: '5h 05m', progress: 51 },
]

const MEDALS: Record<number, string> = { 1: '#F5A623', 2: '#C0C0C0', 3: '#CD7F32' }

export function LeaderboardMockup() {
  return (
    <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-[16px] border border-depth-border bg-depth-surface">
      <div className="border-b border-depth-border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Users size={14} className="text-brand" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-brand">
                Private group
              </span>
            </div>
            <h3 className="text-[16px] font-medium text-ink-primary">Weekly focus circle</h3>
            <p className="mt-1 text-[11px] text-ink-muted">Weekly · 4 members</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg border border-depth-border bg-depth-raised px-2.5 py-2 text-[10px] text-ink-secondary">
            <Copy size={12} /> Invite
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-depth-raised px-3 py-2">
          <span className="flex items-center gap-2 text-[11px] text-ink-secondary">
            <Target size={13} className="text-brand" /> 10h goal per member
          </span>
          <span className="font-data text-[10px] text-ink-muted">2d 06:14:20</span>
        </div>
      </div>
      {ENTRIES.map((entry) => (
        <div
          key={entry.rank}
          className="grid grid-cols-[30px_1fr_auto] items-center gap-3 border-b border-depth-border px-4 py-3 last:border-0 sm:px-5"
        >
          <span className="font-data text-[12px] text-ink-muted">
            {MEDALS[entry.rank] ? (
              <Trophy size={15} style={{ color: MEDALS[entry.rank] }} />
            ) : (
              `#${entry.rank}`
            )}
          </span>
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: entry.color }}
            >
              {entry.initial}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[12px] font-medium ${entry.you ? 'text-brand' : 'text-ink-primary'}`}
              >
                {entry.name}
                {entry.you ? ' (You)' : ''}
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-depth-raised">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${entry.progress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-data text-[12px] text-ink-primary">{entry.hours}</p>
            <p className="font-data text-[9px] text-ink-muted">{entry.progress}% goal</p>
          </div>
        </div>
      ))}
      <div className="border-t border-depth-border px-4 py-3 text-center text-[10px] text-ink-muted">
        Free members compete here without making their profiles public.
      </div>
    </div>
  )
}
