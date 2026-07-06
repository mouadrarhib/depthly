import { Link } from 'react-router-dom'

import { Logo } from '@/components/ui'
import { PATHS } from '@/routes/paths'

interface FooterLink {
  label: string
  href: string
}

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: 'mailto:hello@depthly.app' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
]

const linkStyle = { fontSize: 13, color: '#7A7890', textDecoration: 'none' } as const

export function LandingFooter() {
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
              {links.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  style={linkStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E6F0' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7890' }}
                >
                  {label}
                </a>
              ))}
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
