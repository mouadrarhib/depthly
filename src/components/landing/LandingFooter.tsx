import { Link } from 'react-router-dom'

import { Logo } from '@/components/ui'
import { PATHS } from '@/routes/paths'

const CONTACT_EMAIL = 'contact@getdepthly.com'

type FooterLink =
  | { label: string; kind: 'section'; sectionId: string }
  | { label: string; kind: 'route'; to: string }
  | { label: string; kind: 'mailto'; email: string }

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', kind: 'section', sectionId: 'features' },
      { label: 'Pricing', kind: 'section', sectionId: 'pricing' },
    ],
  },
  {
    heading: 'Company',
    links: [{ label: 'Contact', kind: 'mailto', email: CONTACT_EMAIL }],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', kind: 'route', to: PATHS.terms },
      { label: 'Privacy', kind: 'route', to: PATHS.privacy },
    ],
  },
]

const linkClassName =
  'flex min-h-11 items-center text-sm text-ink-primary/75 transition-colors hover:text-ink-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' })
}

export function LandingFooter() {
  return (
    <footer data-reveal-group className="border-t border-depth-border bg-depth-bg px-5 md:px-8">
      <div
        className="mx-auto grid gap-10 py-12 sm:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:py-14"
        style={{ maxWidth: 1100 }}
      >
        <div data-reveal className="flex flex-col items-start gap-3">
          <Link to={PATHS.home} onClick={scrollToTop} aria-label="Depthly home" className="flex min-h-11 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <Logo size={26} withWordmark />
          </Link>
          <p className="max-w-xs text-sm leading-6 text-ink-primary/75">Stay focused, work deeper.</p>
        </div>

        <nav data-reveal aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3 sm:gap-x-12 md:gap-x-16">
          {COLUMNS.map(({ heading, links }) => (
            <div key={heading} className={`flex min-w-0 flex-col ${heading === 'Legal' ? 'col-start-2 sm:col-auto' : ''}`}>
              <h2 className="mb-2 text-sm font-medium text-ink-primary">{heading}</h2>
              {links.map((link) => {
                if (link.kind === 'section') {
                  return (
                    <a
                      key={link.label}
                      href={`#${link.sectionId}`}
                      className={linkClassName}
                    >
                      {link.label}
                    </a>
                  )
                }
                if (link.kind === 'route') {
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={scrollToTop}
                      className={linkClassName}
                    >
                      {link.label}
                    </Link>
                  )
                }
                return (
                  <a
                    key={link.label}
                    href={`mailto:${link.email}`}
                    className={linkClassName}
                  >
                    {link.label}
                  </a>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      <div
        data-reveal
        className="mx-auto border-t border-depth-border py-6 text-center text-xs text-ink-primary/75 sm:text-left"
        style={{ maxWidth: 1100 }}
      >
        © 2026 Depthly. All rights reserved.
      </div>
    </footer>
  )
}
