import { useEffect, useRef, useState } from 'react'

import gsap from 'gsap'
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
      once: true,
      onEnter: () => setProgress(RING_PROGRESS),
    })
    return () => st.kill()
  }, [])

  return (
    <div
      ref={ref}
      className="mx-auto flex w-full flex-col items-center"
      style={{
        maxWidth: 440,
        backgroundColor: '#0D0D10',
        border: '1px solid #2E2E38',
        borderRadius: 20,
        padding: '40px 24px 36px',
      }}
    >
      {/* Mode selector pills */}
      <div
        className="flex items-center"
        style={{
          backgroundColor: '#141417',
          border: '1px solid #2E2E38',
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
        <span style={{ fontSize: 12, fontWeight: 500, padding: '5px 14px', color: '#7A7890' }}>
          Stopwatch
        </span>
      </div>

      <ProgressRing progress={progress} size={240} strokeWidth={6} color="#4B9EFF">
        <div className="flex flex-col items-center">
          <span
            className="font-data"
            style={{
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#E8E6F0',
              lineHeight: 1,
            }}
          >
            25:00
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#7A7890',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            Focus
          </span>
          <span style={{ fontSize: 11, color: '#3D3B4E', marginTop: 4 }}>3 sessions today</span>
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
            border: '1px solid #2E2E38',
            color: '#7A7890',
          }}
        >
          Reset
        </span>
      </div>
    </div>
  )
}
