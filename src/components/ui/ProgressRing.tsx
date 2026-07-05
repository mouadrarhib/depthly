import type { ReactNode } from 'react'

interface ProgressRingProps {
  progress:     number
  size?:        number
  strokeWidth?: number
  color?:       string
  isRunning?:   boolean
  children?:    ReactNode
}

export function ProgressRing({
  progress,
  size        = 340,
  strokeWidth = 6,
  color       = 'var(--color-brand)',
  isRunning   = false,
  children,
}: ProgressRingProps) {
  const center          = size / 2
  const radius          = center - strokeWidth / 2
  const circumference   = 2 * Math.PI * radius
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const dashOffset      = circumference * (1 - clampedProgress)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform:  'rotate(-90deg)',
          filter:     isRunning ? `drop-shadow(0 0 20px ${color}50)` : 'none',
          transition: 'filter 0.4s ease',
        }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>

      {children ? (
        <div
          style={{
            position:       'absolute',
            inset:          0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
