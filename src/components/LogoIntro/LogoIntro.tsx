import { useEffect, useState } from 'react'

import './LogoIntro.css'

const EXIT_DELAY_MS = 3200
const EXIT_DURATION_MS = 500

interface LogoIntroProps {
  onComplete: () => void
}

export function LogoIntro({ onComplete }: LogoIntroProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), EXIT_DELAY_MS)
    return () => clearTimeout(exitTimer)
  }, [])

  useEffect(() => {
    if (!isExiting) return
    const completeTimer = setTimeout(onComplete, EXIT_DURATION_MS)
    return () => clearTimeout(completeTimer)
  }, [isExiting, onComplete])

  return (
    <div
      className={`logo-intro ${isExiting ? 'logo-intro--exit' : ''}`}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget) onComplete()
      }}
    >
      <div className="logo-intro__ripple" />

      <div className="logo-intro__content">
        <div className="logo-intro__lockup">
          <svg
            className="logo-intro__icon"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="logo-intro__ring logo-intro__ring--outer"
              cx="24"
              cy="24"
              r="22"
              stroke="#E8E6F0"
              strokeWidth="1.25"
              fill="none"
            />
            <circle
              className="logo-intro__ring logo-intro__ring--middle"
              cx="24"
              cy="24"
              r="14.5"
              stroke="#E8E6F0"
              strokeWidth="1.25"
              fill="none"
              opacity="0.45"
            />
            <circle
              className="logo-intro__ring logo-intro__ring--inner"
              cx="24"
              cy="24"
              r="7.5"
              stroke="#E8E6F0"
              strokeWidth="1.25"
              fill="none"
              opacity="0.2"
            />
            <circle
              className="logo-intro__dot"
              cx="24"
              cy="24"
              r="3"
              fill="#4B9EFF"
            />
          </svg>

          <span className="logo-intro__wordmark">Depthly</span>
        </div>

        <div className="logo-intro__tagline">
          <span className="logo-intro__tagline-line" />
          <span className="logo-intro__tagline-text">Work at depth</span>
          <span className="logo-intro__tagline-line" />
        </div>
      </div>
    </div>
  )
}
