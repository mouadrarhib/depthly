import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cancelTimerRun, fetchActiveTimerRun, finishTimerRun, pauseTimerRun, resumeTimerRun, startTimerRun } from '@/lib/supabase/queries/sessions'
import { useAuthStore } from '@/store'
import { MIN_SESSION_SECONDS, showSaveToast, useSaveToastStore, useTimerStore } from '@/store/timerStore'
import { useSessionMonthLimit } from '@/hooks/usePlanLimits'

const TIMER_QUERY_KEY = ['timer', 'active'] as const

export function useSaveSession() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const { isAtLimit } = useSessionMonthLimit()
  const toastMessage = useSaveToastStore((s) => s.message)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const activeQuery = useQuery({ queryKey: [...TIMER_QUERY_KEY, userId], queryFn: () => fetchActiveTimerRun(userId), enabled: !!userId, staleTime: 15_000 })

  useEffect(() => { if (activeQuery.data) useTimerStore.getState().restoreRun(activeQuery.data) }, [activeQuery.data])

  const refreshAfterFinish = useCallback(() => {
    for (const key of [['sessions'], ['analytics'], ['profile'], ['goals'], ['projects'], ['tasks'], ['leaderboard']]) qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: TIMER_QUERY_KEY })
  }, [qc])

  const action = useMutation({
    mutationFn: async (kind: 'start' | 'pause' | 'resume' | 'finish' | 'cancel') => {
      const state = useTimerStore.getState()
      if (kind === 'start') {
        if (state.sessionType === 'focus' && isAtLimit) throw new Error('Monthly session limit reached')
        return startTimerRun({ type: state.sessionType, timer_mode: state.mode === 'free' ? 'free' : 'pomodoro',
          target_seconds: state.mode === 'free' ? null : state.duration,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, project_id: state.selectedProjectId,
          task_id: state.selectedTaskId, title: state.sessionType === 'focus' ? state.sessionTitle : null,
          notes: state.sessionType === 'focus' ? state.notes : null })
      }
      if (!state.activeRunId) throw new Error('No active timer')
      if (kind === 'pause') return pauseTimerRun(state.activeRunId)
      if (kind === 'resume') return resumeTimerRun(state.activeRunId)
      if (kind === 'cancel') { await cancelTimerRun(state.activeRunId); return null }
      return finishTimerRun(state.activeRunId, { project_id: state.selectedProjectId, task_id: state.selectedTaskId,
        title: state.sessionType === 'focus' ? state.sessionTitle : null,
        notes: state.sessionType === 'focus' ? state.notes : null })
    },
  })

  const runAction = useCallback((kind: 'start' | 'pause' | 'resume' | 'finish' | 'cancel', natural = false) => {
    setErrorMessage(null)
    action.mutate(kind, { onSuccess: (result) => {
      const state = useTimerStore.getState()
      if (kind === 'start' || kind === 'pause' || kind === 'resume') {
        if (result && 'accumulated_seconds' in result) state.restoreRun(result)
        return
      }
      const savedType = state.sessionType
      const savedMinutes = Math.round(state.elapsed / 60)
      useTimerStore.setState({ activeRunId: null })
      refreshAfterFinish()
      if (kind === 'cancel') { state.stop(); return }
      if (savedType === 'focus') {
        useTimerStore.setState((s) => ({ sessionCount: s.sessionCount + 1, notes: '', sessionTitle: '' }))
        if (natural) {
          state.startBreak(true)
          if (useTimerStore.getState().isRunning) setTimeout(() => action.mutate('start'), 0)
        }
        else { state.stop(); showSaveToast(`Session saved — ${savedMinutes} minute${savedMinutes === 1 ? '' : 's'} of focus logged`) }
      } else {
        state.endBreak()
        if (useTimerStore.getState().isRunning) setTimeout(() => action.mutate('start'), 0)
        showSaveToast(`Break saved — ${savedMinutes} minute${savedMinutes === 1 ? '' : 's'}`)
      }
    }, onError: (error) => {
      const message = error instanceof Error ? error.message : 'Timer action failed'
      setErrorMessage(message); showSaveToast(message)
    } })
  }, [action, refreshAfterFinish])

  const start = useCallback(() => runAction('start'), [runAction])
  const pause = useCallback(() => runAction('pause'), [runAction])
  const resume = useCallback(() => runAction('resume'), [runAction])
  const saveSession = useCallback(() => runAction('finish', true), [runAction])
  const saveAndStop = useCallback(() => {
    const state = useTimerStore.getState()
    if (state.elapsed < MIN_SESSION_SECONDS) { if (state.sessionType === 'focus') showSaveToast('Session too short to save'); runAction('cancel') }
    else runAction('finish')
  }, [runAction])
  const cancelActiveTimer = useCallback(() => runAction('cancel'), [runAction])

  return { start, pause, resume, saveSession, saveAndStop, cancelActiveTimer, isSaving: action.isPending,
    isSessionLimitReached: isAtLimit, toastMessage, errorMessage }
}
