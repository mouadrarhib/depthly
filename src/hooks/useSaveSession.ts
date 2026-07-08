import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveSession } from '@/lib/supabase/queries/sessions'
import { useAuthStore } from '@/store'
import { MIN_SESSION_SECONDS, showSaveToast, useSaveToastStore, useTimerStore } from '@/store/timerStore'
import { useSessionMonthLimit } from '@/hooks/usePlanLimits'

export function useSaveSession() {
  const queryClient = useQueryClient()
  const { isAtLimit } = useSessionMonthLimit()
  const toastMessage = useSaveToastStore((s) => s.message)

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

    const { elapsed, mode, sessionType, selectedProjectId, selectedTaskId, sessionTitle, notes } =
      useTimerStore.getState()

    const now       = new Date()
    const startedAt = new Date(now.getTime() - elapsed * 1_000)
    const combined  = [sessionTitle.trim(), notes.trim()].filter(Boolean).join('\n\n')

    mutate({
      p_user_id:       user.id,
      p_project_id:    selectedProjectId,
      p_task_id:       selectedTaskId,
      p_type:          sessionType,
      p_duration_mins: Math.round(elapsed / 60),
      p_started_at:    startedAt.toISOString(),
      p_ended_at:      now.toISOString(),
      p_timer_mode:    mode,
      p_notes:         combined || null,
    }, {
      onSuccess: () => {
        useTimerStore.setState((s) => ({ sessionCount: s.sessionCount + 1, notes: '', sessionTitle: '' }))
        // Guard: skip startBreak if the user manually stopped the timer between
        // the save firing and the DB response coming back
        if (useTimerStore.getState().isRunning) {
          useTimerStore.getState().startBreak()
        }
      },
    })
  }

  // Manual early stop — resets UI immediately, saves in background if long
  // enough. Covers both focus sessions stopped early and breaks stopped mid-way.
  const handleSaveAndStop = () => {
    const { elapsed, mode, sessionType, selectedProjectId, selectedTaskId, sessionTitle, notes } =
      useTimerStore.getState()

    // Reset timer immediately so UI snaps back right away
    useTimerStore.getState().stop()

    // If a natural-completion save is already in-flight, let it handle the
    // session record — don't double-save the same session
    if (isPending) return

    if (elapsed < MIN_SESSION_SECONDS) {
      // Break sessions that are too short are dropped silently; only focus
      // gets a "too short" toast since it's the session the user was
      // actively trying to log.
      if (sessionType === 'focus') showSaveToast('Session too short to save')
      return
    }

    // The monthly session cap only counts focus sessions — never block a break save on it.
    if (sessionType === 'focus' && isAtLimit) return

    const user = useAuthStore.getState().user
    if (!user) return

    const now       = new Date()
    const startedAt = new Date(now.getTime() - elapsed * 1_000)
    const combined  = sessionType === 'focus'
      ? [sessionTitle.trim(), notes.trim()].filter(Boolean).join('\n\n')
      : ''
    const mins = Math.round(elapsed / 60)

    mutate({
      p_user_id:       user.id,
      p_project_id:    selectedProjectId,
      p_task_id:       selectedTaskId,
      p_type:          sessionType,
      p_duration_mins: mins,
      p_started_at:    startedAt.toISOString(),
      p_ended_at:      now.toISOString(),
      p_timer_mode:    mode,
      p_notes:         combined || null,
    }, {
      onSuccess: () => {
        if (sessionType === 'focus') {
          useTimerStore.setState((s) => ({ sessionCount: s.sessionCount + 1, notes: '', sessionTitle: '' }))
          showSaveToast(`Session saved — ${mins} minute${mins === 1 ? '' : 's'} of focus logged`)
        } else {
          showSaveToast(`Break saved — ${mins} minute${mins === 1 ? '' : 's'}`)
        }
      },
    })
  }

  return {
    saveSession:       handleSave,
    saveAndStop:       handleSaveAndStop,
    isSaving:          isPending,
    isSessionLimitReached: isAtLimit,
    toastMessage,
  }
}
