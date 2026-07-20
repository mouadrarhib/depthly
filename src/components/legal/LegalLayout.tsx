import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/ui'
import { PATHS } from '@/routes/paths'

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  children: ReactNode
}

/**
 * Minimal standalone layout for public legal pages (Terms, Privacy).
 * Deliberately not AppLayout — no sidebar/topbar, no auth required.
 */
export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  // These pages are reached by client-side navigation (e.g. the landing
  // footer), which doesn't reset window scroll on its own — always land at
  // the top rather than carrying over the previous page's scroll position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{ backgroundColor: '#0D0D10', minHeight: '100dvh' }}>
      <header className="px-5 md:px-8" style={{ borderBottom: '0.5px solid #2E2E38' }}>
        <div className="mx-auto flex items-center" style={{ maxWidth: 720, height: 64 }}>
          <Link to={PATHS.home} style={{ textDecoration: 'none' }}>
            <Logo size={26} withWordmark />
          </Link>
        </div>
      </header>

      <main className="px-5 md:px-8">
        <div
          className="mx-auto flex flex-col gap-3"
          style={{ maxWidth: 720, paddingTop: 56, paddingBottom: 96 }}
        >
          <h1
            style={{
              fontSize: 'clamp(26px, 4vw, 34px)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              color: '#E8E6F0',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 13, color: '#7A7890' }}>Last updated: {lastUpdated}</p>

          <div
            className="flex flex-col gap-4"
            style={{
              marginTop: 24,
              padding: 20,
              borderRadius: 10,
              background: '#141417',
              border: '0.5px solid #2E2E38',
              fontSize: 14,
              color: '#7A7890',
              lineHeight: 1.7,
            }}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
