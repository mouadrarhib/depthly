import { cn } from '@/lib/utils/cn'

interface StreakBadgeProps {
  /** Current streak count in days */
  days: number
  className?: string
}

/**
 * Depthly's streak indicator — the only place the loud accent color appears.
 * Per brand spec: reserved exclusively for streaks, habit indicators, and
 * earned/Pro states. Never use color-streak decoratively elsewhere.
 *
 * Usage:
 *   <StreakBadge days={14} />
 */
export function StreakBadge({ days, className }: StreakBadgeProps) {
  if (days <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex animate-streak-pop items-center gap-1.5 rounded-full px-2.5 py-1',
        'bg-streak/10 text-streak',
        className
      )}
    >
      <span aria-hidden="true">🔥</span>
      <span className="font-data text-xs font-medium">{days}-day streak</span>
    </span>
  )
}
