import { useEffect, useRef } from 'react'

import { useTimerStore } from '@/store/timerStore'

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

export function useTimerEffects() {
  const {
    isRunning,
    isPaused,
    mode,
    sessionType,
    elapsed,
    duration,
    tick,
  } = useTimerStore()

  const focusDoneRef = useRef(false)
  const breakDoneRef = useRef(false)

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
  // Beep when focus ends. The actual save + break transition is handled in
  // TimerPage (save) and useSaveSession.onSuccess (startBreak).
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
    }
  }, [elapsed, duration, sessionType, mode, isRunning])

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
      useTimerStore.getState().endBreak()
    }
  }, [elapsed, duration, sessionType, mode, isRunning])

  // ── 4. Tick interval ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || isPaused) return

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isRunning, isPaused, tick])
}
