import { useRef, useState, useEffect } from 'react'

import { getGoalProgress } from '@/lib/utils/analytics'

export function useGoalCelebration(
  focusMinutes: number,
  goalMinutes:  number | null
): { shouldCelebrate: boolean } {
  const { isComplete } = getGoalProgress(focusMinutes, goalMinutes)
  const prevRef = useRef<boolean | null>(null)
  const [shouldCelebrate, setShouldCelebrate] = useState(false)

  // Detect the false → true transition
  useEffect(() => {
    if (prevRef.current === false && isComplete) {
      setShouldCelebrate(true)
    }
    prevRef.current = isComplete
  }, [isComplete])

  // Reset after one tick so ConfettiBurst only gets a pulse, not a stuck true
  useEffect(() => {
    if (!shouldCelebrate) return
    const id = setTimeout(() => setShouldCelebrate(false), 0)
    return () => clearTimeout(id)
  }, [shouldCelebrate])

  return { shouldCelebrate }
}
