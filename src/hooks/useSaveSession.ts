import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveSession } from '@/lib/supabase/queries/sessions'
import { useAuthStore } from '@/store'
import { useTimerStore } from '@/store/timerStore'

export function useSaveSession() {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: saveSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['daily-summaries'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })

      useTimerStore.getState().reset()
      useTimerStore.setState((s) => ({ sessionCount: s.sessionCount + 1 }))
    },
  })

  const handleSave = () => {
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
    })
  }

  return { saveSession: handleSave, isSaving: isPending }
}
