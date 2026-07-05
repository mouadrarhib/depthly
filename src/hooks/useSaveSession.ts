import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveSession } from '@/lib/supabase/queries/sessions'
import { useAuthStore } from '@/store'
import { useTimerStore } from '@/store/timerStore'
import { useSessionMonthLimit } from '@/hooks/usePlanLimits'

const MIN_SAVE_SECONDS = 60 // don't save sessions shorter than 1 minute

export function useSaveSession() {
  const queryClient = useQueryClient()
  const { isAtLimit } = useSessionMonthLimit()

  const { mutate, isPending } = useMutation({
    mutationFn: saveSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  // Natural completion — save focus session then transition to break
  const handleSave = () => {
    if (isAtLimit) return

    const user = useAuthStore.getState().user
    if (!user) return

    const { elapsed, mode, sessionType, selectedProjectId, selectedTaskId } =
      useTimerStore.getState()

    const now       = new Date()
    const startedAt = new Date(now.getTime() - elapsed * 1_000)

    mutate({
      p_user_id:       user.id,
      p_project_id:    selectedProjectId,
      p_task_id:       selectedTaskId,
      p_type:          sessionType,
      p_duration_mins: Math.round(elapsed / 60),
      p_started_at:    startedAt.toISOString(),
      p_ended_at:      now.toISOString(),
      p_timer_mode:    mode,
      p_notes:         null,
    }, {
      onSuccess: () => {
        useTimerStore.setState((s) => ({ sessionCount: s.sessionCount + 1 }))
        // Guard: skip startBreak if the user manually stopped the timer between
        // the save firing and the DB response coming back
        if (useTimerStore.getState().isRunning) {
          useTimerStore.getState().startBreak()
        }
      },
    })
  }

  // Manual early stop — resets UI immediately, saves in background if >= 1 min focus
  const handleSaveAndStop = () => {
    const { elapsed, mode, sessionType, selectedProjectId, selectedTaskId } =
      useTimerStore.getState()

    // Reset timer immediately so UI snaps back right away
    useTimerStore.getState().stop()

    // If a natural-completion save is already in-flight, let it handle the
    // session record — don't double-save the same session
    if (isPending) return

    // Only save focus sessions that ran long enough to be meaningful
    if (sessionType !== 'focus' || elapsed < MIN_SAVE_SECONDS || isAtLimit) return

    const user = useAuthStore.getState().user
    if (!user) return

    const now       = new Date()
    const startedAt = new Date(now.getTime() - elapsed * 1_000)

    mutate({
      p_user_id:       user.id,
      p_project_id:    selectedProjectId,
      p_task_id:       selectedTaskId,
      p_type:          sessionType,
      p_duration_mins: Math.round(elapsed / 60),
      p_started_at:    startedAt.toISOString(),
      p_ended_at:      now.toISOString(),
      p_timer_mode:    mode,
      p_notes:         null,
    }, {
      onSuccess: () => {
        useTimerStore.setState((s) => ({ sessionCount: s.sessionCount + 1 }))
      },
    })
  }

  return {
    saveSession:       handleSave,
    saveAndStop:       handleSaveAndStop,
    isSaving:          isPending,
    isSessionLimitReached: isAtLimit,
  }
}
