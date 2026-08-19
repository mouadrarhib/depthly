import { useRef, useState, useEffect } from 'react'

import { getGoalProgress } from '@/lib/utils/analytics'

export function useGoalCelebration(
  focusMinutes: number,
  goalMinutes:  number | null,
  enabled:      boolean,
): { shouldCelebrate: boolean } {
  const { isComplete } = getGoalProgress(focusMinutes, goalMinutes)
  const previousRef = useRef<{ focusMinutes: number; goalMinutes: number | null } | null>(null)
  const [shouldCelebrate, setShouldCelebrate] = useState(false)

  // Celebrate only when focus increases across the configured goal. Initial
  // loads, goal edits, and navigating back to an already-complete day must not
  // look like a newly completed goal.
  useEffect(() => {
    if (!enabled) {
      previousRef.current = null
      setShouldCelebrate(false)
      return
    }

    const previous = previousRef.current
    const crossedGoal = previous !== null
      && goalMinutes !== null
      && previous.goalMinutes === goalMinutes
      && previous.focusMinutes < goalMinutes
      && focusMinutes >= goalMinutes
      && focusMinutes > previous.focusMinutes

    if (crossedGoal && isComplete) {
      setShouldCelebrate(true)
    }
    previousRef.current = { focusMinutes, goalMinutes }
  }, [enabled, focusMinutes, goalMinutes, isComplete])

  // Reset after one tick so ConfettiBurst only gets a pulse, not a stuck true
  useEffect(() => {
    if (!shouldCelebrate) return
    const id = setTimeout(() => setShouldCelebrate(false), 0)
    return () => clearTimeout(id)
  }, [shouldCelebrate])

  return { shouldCelebrate }
}
