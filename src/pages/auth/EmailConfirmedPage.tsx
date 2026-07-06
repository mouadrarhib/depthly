import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PATHS } from '@/routes/paths'

import './EmailConfirmedPage.css'

const REDIRECT_DELAY_MS = 4000

export function EmailConfirmedPage() {
  const navigate = useNavigate()
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const exit  = setTimeout(() => setIsExiting(true), REDIRECT_DELAY_MS - 500)
    const redir = setTimeout(() => navigate(PATHS.dashboard, { replace: true }), REDIRECT_DELAY_MS)
    return () => { clearTimeout(exit); clearTimeout(redir) }
  }, [navigate])

  return (
    <div className={`ec-screen ${isExiting ? 'ec-screen--exit' : ''}`}>
      {/* Logo + tick ring share a relative wrapper so the ring overlays correctly */}
      <div className="ec-logo-wrap">
        <div className="ec-logo">
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="ec-ring ec-ring--outer" cx="24" cy="24" r="22"   stroke="#E8E6F0" strokeWidth="1.25" fill="none" />
            <circle className="ec-ring ec-ring--middle" cx="24" cy="24" r="14.5" stroke="#E8E6F0" strokeWidth="1.25" fill="none" opacity="0.45" />
            <circle className="ec-ring ec-ring--inner"  cx="24" cy="24" r="7.5"  stroke="#E8E6F0" strokeWidth="1.25" fill="none" opacity="0.2" />
            <circle className="ec-dot"                  cx="24" cy="24" r="3"    fill="#4B9EFF" />
          </svg>
        </div>

        <svg className="ec-tick-ring" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="ec-tick-circle" cx="28" cy="28" r="26" stroke="#4B9EFF" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      <div className="ec-copy">
        <p className="ec-headline">Account confirmed.</p>
        <p className="ec-sub">Taking you to your dashboard…</p>
      </div>
    </div>
  )
}
