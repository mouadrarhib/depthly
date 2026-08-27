import { useEffect } from 'react'

import { supabase } from '@/lib/supabase/client'
import type { ActiveTimerRun } from '@/lib/supabase/queries/sessions'
import { useAuthStore } from '@/store/authStore'
import { TIMER_SETTINGS_STORAGE_KEY, useTimerStore } from '@/store/timerStore'

export function useActiveTimerRealtime() {
  const userId = useAuthStore((state) => state.user?.id ?? '')

  useEffect(() => {
    if (!userId) return

    const syncTimerSettings = (event: StorageEvent) => {
      if (event.key === TIMER_SETTINGS_STORAGE_KEY) {
        // Persisted settings include the idle display duration. Do not let a
        // different tab overwrite the target of a server-authoritative run.
        if (useTimerStore.getState().activeRunId) return
        void useTimerStore.persist.rehydrate()
      }
    }
    window.addEventListener('storage', syncTimerSettings)

    let deleteTimer: ReturnType<typeof setTimeout> | undefined
    const channel = supabase
      .channel(`active-timer:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_timer_runs', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const removed = payload.old as Partial<ActiveTimerRun>
            // Give the tab that initiated Finish a moment to run its success
            // transition. Other tabs still hold this run id and stop here.
            deleteTimer = setTimeout(() => {
              if (useTimerStore.getState().activeRunId === removed.id) {
                useTimerStore.getState().stop()
                useTimerStore.setState({ activeRunId: null })
              }
            }, 400)
            return
          }

          const run = payload.new as ActiveTimerRun
          if (run.user_id === userId) useTimerStore.getState().restoreRun(run)
        },
      )
      .subscribe()

    return () => {
      clearTimeout(deleteTimer)
      window.removeEventListener('storage', syncTimerSettings)
      void supabase.removeChannel(channel)
    }
  }, [userId])
}
