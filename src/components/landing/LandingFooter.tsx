import type { MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

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
    links: [
      { label: 'Contact', kind: 'mailto', email: CONTACT_EMAIL },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', kind: 'route', to: PATHS.terms },
      { label: 'Privacy', kind: 'route', to: PATHS.privacy },
    ],
  },
]

const linkStyle = { fontSize: 13, color: '#7A7890', textDecoration: 'none' } as const

function handleLinkHover(e: MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.style.color = '#E8E6F0'
}
function handleLinkUnhover(e: MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.style.color = '#7A7890'
}

export function LandingFooter() {
  const navigate = useNavigate()
  const location = useLocation()

  // Same-page anchor jump when already on the landing page; otherwise
  // navigate there first and let LandingPage's effect scroll once mounted.
  const handleSectionClick = (e: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    if (location.pathname === PATHS.home) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate(PATHS.home, { state: { scrollTo: sectionId } })
    }
  }

  return (
    <footer className="px-5 md:px-8" style={{ borderTop: '1px solid #2E2E38' }}>
      <div
        className="mx-auto flex flex-col gap-12 md:flex-row md:justify-between"
        style={{ maxWidth: 1100, paddingTop: 56, paddingBottom: 40 }}
      >
        {/* Lockup + tagline */}
        <div className="flex flex-col gap-3">
          <Link to={PATHS.home} style={{ textDecoration: 'none' }}>
            <Logo size={26} withWordmark />
          </Link>
          <p style={{ fontSize: 13, color: '#7A7890' }}>Stay focused, work deeper.</p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-16">
          {COLUMNS.map(({ heading, links }) => (
            <div key={heading} className="flex flex-col gap-3">
              <span style={{ fontSize: 13, fontWeight: 500, color: '#E8E6F0' }}>{heading}</span>
              {links.map((link) => {
                if (link.kind === 'section') {
                  return (
                    <a
                      key={link.label}
                      href={`#${link.sectionId}`}
                      style={linkStyle}
                      onClick={(e) => handleSectionClick(e, link.sectionId)}
                      onMouseEnter={handleLinkHover}
                      onMouseLeave={handleLinkUnhover}
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
                      style={linkStyle}
                      onMouseEnter={handleLinkHover}
                      onMouseLeave={handleLinkUnhover}
                    >
                      {link.label}
                    </Link>
                  )
                }
                return (
                  <a
                    key={link.label}
                    href={`mailto:${link.email}`}
                    style={linkStyle}
                    onMouseEnter={handleLinkHover}
                    onMouseLeave={handleLinkUnhover}
                  >
                    {link.label}
                  </a>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mx-auto text-center"
        style={{
          maxWidth: 1100,
          borderTop: '1px solid #2E2E38',
          paddingTop: 24,
          paddingBottom: 32,
          fontSize: 12,
          color: '#7A7890',
        }}
      >
        © 2026 Depthly. All rights reserved.
      </div>
    </footer>
  )
}
