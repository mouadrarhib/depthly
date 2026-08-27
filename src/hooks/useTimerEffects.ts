import { useEffect, useRef } from 'react'

import { useQuery } from '@tanstack/react-query'

import { useActiveTimerRealtime } from '@/hooks/useActiveTimerRealtime'
import { useSaveSession } from '@/hooks/useSaveSession'
import { timerKeys } from '@/lib/queryKeys'
import { fetchActiveTimerRun } from '@/lib/supabase/queries/sessions'
import { useAuthStore } from '@/store/authStore'
import { showSaveToast, useTimerStore } from '@/store/timerStore'

function playBeep(freq = 880, duration = 0.6) {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type            = 'sine'
    osc.frequency.value = freq

    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
    osc.onended = () => ctx.close()
  } catch {
    // AudioContext unavailable
  }
}

function formatTitle(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatRecoveryTime(seconds: number, roundUp = false): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = roundUp ? Math.ceil(seconds / 60) : Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

export function useTimerEffects() {
  useActiveTimerRealtime()
  const userId = useAuthStore((state) => state.user?.id ?? '')
  const activeRunQuery = useQuery({
    queryKey: timerKeys.active(userId),
    queryFn: () => fetchActiveTimerRun(userId),
    enabled: !!userId,
    staleTime: 15_000,
  })
  const {
    isRunning,
    isPaused,
    mode,
    sessionType,
    elapsed,
    duration,
    tick,
  } = useTimerStore()

  const { saveSession } = useSaveSession()

  const focusDoneRef = useRef(false)
  const breakDoneRef = useRef(false)
  const restoredRunRef = useRef<string | null>(null)

  // Restore the server-authoritative run once at the app-layout boundary.
  // Keeping this query here avoids every TimerControls/TimerWidget instance
  // independently restoring the same run. The notice explains why time may
  // have advanced while localhost, the browser, or the device was closed.
  useEffect(() => {
    const run = activeRunQuery.data
    if (!run || restoredRunRef.current === run.id) return

    const state = useTimerStore.getState()
    const isRecovery = state.activeRunId !== run.id
    state.restoreRun(run)
    restoredRunRef.current = run.id

    if (!isRecovery) return
    const restored = useTimerStore.getState()
    const phase = run.type === 'focus' ? 'focus timer' : 'break timer'
    if (run.status === 'paused') {
      showSaveToast(`Your paused ${phase} was restored — ${formatRecoveryTime(restored.elapsed)} elapsed`, 6000)
      return
    }
    if (run.target_seconds === null) {
      showSaveToast(`Your ${phase} continued while the app was closed — ${formatRecoveryTime(restored.elapsed)} elapsed`, 6000)
      return
    }
    const remaining = Math.max(0, run.target_seconds - restored.elapsed)
    showSaveToast(`Your ${phase} continued while the app was closed — ${formatRecoveryTime(remaining, true)} remaining`, 6000)
  }, [activeRunQuery.data])

  // Reset guards when a fresh timer starts (elapsed → 0)
  useEffect(() => {
    if (elapsed === 0) {
      focusDoneRef.current = false
      breakDoneRef.current = false
    }
  }, [elapsed])

  // ── 1. Tab title ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning && !isPaused) {
      document.title = 'Depthly - Track your focus'
      return
    }

    const isFree  = mode === 'free'
    const seconds = isFree ? elapsed : Math.max(0, duration - elapsed)
    const label   = sessionType === 'focus' ? 'Focus' : 'Break'
    document.title = `${formatTitle(seconds)} ${label} - Depthly`

    return () => { document.title = 'Depthly - Track your focus' }
  }, [isRunning, isPaused, mode, elapsed, duration, sessionType])

  // ── 2. Focus session completion ───────────────────────────────────────────
  // Beeps, saves the session, and (via useSaveSession's onSuccess) transitions
  // to break — all in one place, since this hook is mounted once globally
  // (AppLayout), not per timer page. A session that completes while the user
  // is on e.g. Settings still saves and transitions right on time, instead of
  // only once they navigate back to whichever page used to own this effect.
  useEffect(() => {
    if (
      mode !== 'free' &&
      sessionType === 'focus' &&
      duration > 0 &&
      isRunning &&
      elapsed >= duration &&
      !focusDoneRef.current
    ) {
      focusDoneRef.current = true
      playBeep(880, 0.6) // A5 — focus done
      saveSession()
    }
  }, [elapsed, duration, sessionType, mode, isRunning, saveSession])

  // ── 3. Break completion ───────────────────────────────────────────────────
  useEffect(() => {
    if (
      mode !== 'free' &&
      sessionType === 'break' &&
      duration > 0 &&
      isRunning &&
      elapsed >= duration &&
      !breakDoneRef.current
    ) {
      breakDoneRef.current = true
      playBeep(660, 0.4) // E5 — softer tone, break done
      saveSession()
    }
  }, [elapsed, duration, sessionType, mode, isRunning, saveSession])

  // ── 4. Tick interval ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || isPaused) return

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isRunning, isPaused, tick])
}
