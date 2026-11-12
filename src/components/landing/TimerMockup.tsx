import { useEffect, useRef, useState } from 'react'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { ProgressRing } from '@/components/ui/ProgressRing'

gsap.registerPlugin(ScrollTrigger)

const RING_PROGRESS = 0.3

/**
 * Static illustrative timer — Depthly's real dark timer styling with a
 * brand-blue ring. The ring "draws" in when scrolled into view
 * (ProgressRing's own CSS transition animates the dashoffset).
 */
export function TimerMockup() {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(RING_PROGRESS)
      return
    }
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: 'top 75%',
      // Retain the trigger until effect cleanup to keep refresh iteration stable.
      onEnter: () => setProgress(RING_PROGRESS),
    })
    return () => st.kill()
  }, [])

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Illustration of Depthly's 25-minute focus timer"
      className="mx-auto flex w-full flex-col items-center"
      style={{
        maxWidth: 440,
        backgroundColor: 'var(--color-surface-base)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        padding: '40px 24px 36px',
      }}
    >
      {/* Mode selector pills */}
      <div
        className="flex items-center"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          borderRadius: 9999,
          padding: 3,
          marginBottom: 32,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: '5px 14px',
            borderRadius: 9999,
            backgroundColor: 'rgba(75, 158, 255, 0.12)',
            color: '#4B9EFF',
          }}
        >
          Pomodoro
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, padding: '5px 14px', color: 'var(--color-text-muted)' }}>
          Stopwatch
        </span>
      </div>

      <div className="mb-6 w-full max-w-[300px] rounded-lg border border-depth-border bg-depth-surface px-4 py-3 text-left">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-secondary">
          Project · Task
        </p>
        <p className="mt-1 text-sm font-medium text-ink-primary">
          Client website <span className="text-ink-secondary">·</span> Draft homepage copy
        </p>
      </div>

      <ProgressRing progress={progress} size={240} strokeWidth={6} color="#4B9EFF">
        <div className="flex flex-col items-center">
          <span
            className="font-data"
            style={{
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text)',
              lineHeight: 1,
            }}
          >
            25:00
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            Focus
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>3 sessions today</span>
        </div>
      </ProgressRing>

      {/* Static controls */}
      <div className="flex items-center gap-3" style={{ marginTop: 32 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            padding: '9px 26px',
            borderRadius: 9999,
            backgroundColor: '#4B9EFF',
            color: '#FFFFFF',
          }}
        >
          Start focus
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            padding: '9px 20px',
            borderRadius: 9999,
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          Reset
        </span>
      </div>
    </div>
  )
}
