import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { Link } from 'react-router-dom'

import { Logo } from '@/components/ui'
import { PATHS } from '@/routes/paths'

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  children: ReactNode
  contents?: Array<{ id: string; label: string }>
}

/**
 * Minimal standalone layout for public legal pages (Terms, Privacy).
 * Deliberately not AppLayout — no sidebar/topbar, no auth required.
 */
export function LegalLayout({ title, lastUpdated, children, contents = [] }: LegalLayoutProps) {
  // These pages are reached by client-side navigation (e.g. the landing
  // footer), which doesn't reset window scroll on its own — always land at
  // the top rather than carrying over the previous page's scroll position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const contentsLinks = contents.map(({ id, label }) => (
    <a key={id} href={`#${id}`} className="block rounded-md px-3 py-2 text-xs leading-5 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text focus-visible:outline-brand">
      <span className="normal-case">{label.toLowerCase().replace(/(^|\.\s)([a-z])/g, (_, prefix: string, letter: string) => prefix + letter.toUpperCase())}</span>
    </a>
  ))

  return (
    <div style={{ backgroundColor: 'var(--color-surface-base)', minHeight: '100dvh' }}>
      <header className="px-5 md:px-8" style={{ borderBottom: '0.5px solid var(--color-border)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4" style={{ height: 64 }}>
          <Link to={PATHS.home} style={{ textDecoration: 'none' }}>
            <Logo size={26} withWordmark />
          </Link>
          <nav aria-label="Legal pages" className="flex gap-5 text-sm text-text-muted">
            <Link to={PATHS.terms} aria-current={title === 'Terms of Service' ? 'page' : undefined} className="hover:text-text aria-[current=page]:text-brand">Terms</Link>
            <Link to={PATHS.privacy} aria-current={title === 'Privacy Policy' ? 'page' : undefined} className="hover:text-text aria-[current=page]:text-brand">Privacy</Link>
          </nav>
        </div>
      </header>

      <main className="px-5 md:px-8">
        <div
          className="mx-auto max-w-6xl py-10 sm:py-14"
        >
          <h1
            style={{
              fontSize: 'clamp(26px, 4vw, 34px)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              color: 'var(--color-text)',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Last updated: {lastUpdated}</p>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-12">
            <aside className="lg:sticky lg:top-6">
              <details className="rounded-xl border border-border bg-surface-raised p-3 lg:hidden">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-text">On this page</summary>
                <nav aria-label="Contents" className="mt-2 max-h-72 overflow-y-auto">{contentsLinks}</nav>
              </details>
              <nav aria-label="Contents" className="hidden lg:block">
                <h2 className="mb-3 px-3 text-sm font-semibold text-text">On this page</h2>
                <div className="max-h-[calc(100dvh-110px)] overflow-y-auto pr-2">{contentsLinks}</div>
              </nav>
            </aside>
          <article
            className="legal-document flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5 text-sm leading-7 text-text-muted sm:p-8 lg:p-10 [&_section]:scroll-mt-6 [&_h2]:!font-semibold [&_h2]:!normal-case [&_h2]:!leading-7 [&_a]:!text-brand"
          >
            {children}
          </article>
          </div>
        </div>
      </main>
      <footer className="border-t border-border px-5 py-6 text-center text-xs text-text-muted md:px-8">
        Depthly is a product of <span className="font-medium text-text">OMBRIVA LLC</span>.
      </footer>
    </div>
  )
}
