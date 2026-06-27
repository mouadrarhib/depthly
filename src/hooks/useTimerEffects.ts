import { useEffect, useRef } from 'react'

import { useTimerStore } from '@/store/timerStore'

function playBeep() {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type            = 'sine'
    osc.frequency.value = 880 // A5 — clear, non-jarring

    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)

    osc.onended = () => ctx.close()
  } catch {
    // AudioContext unavailable (e.g. SSR or blocked by browser policy)
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

  const soundPlayedRef = useRef(false)

  // ── 1. Tab title ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      document.title = 'Depthly'
      return
    }

    const isFree   = mode === 'free'
    const seconds  = isFree ? elapsed : Math.max(0, duration - elapsed)
    const label    = sessionType === 'focus' ? 'Focus' : 'Break'
    document.title = `${formatTitle(seconds)} — ${label} | Depthly`

    return () => { document.title = 'Depthly' }
  }, [isRunning, mode, elapsed, duration, sessionType])

  // ── 2. Completion sound ───────────────────────────────────────────────────
  // Reset the guard whenever a fresh session starts (elapsed resets to 0).
  useEffect(() => {
    if (elapsed === 0) soundPlayedRef.current = false
  }, [elapsed])

  useEffect(() => {
    if (
      mode !== 'free' &&
      duration > 0 &&
      sessionType === 'focus' &&
      elapsed >= duration &&
      !soundPlayedRef.current
    ) {
      soundPlayedRef.current = true
      playBeep()
    }
  }, [elapsed, duration, sessionType, mode])

  // ── 3. Tick interval ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || isPaused) return

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isRunning, isPaused, tick])
}
