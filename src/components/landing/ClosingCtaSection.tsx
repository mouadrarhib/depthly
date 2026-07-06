import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/** Full-width closing banner — lifted surface, one headline, one button. */
export function ClosingCtaSection() {
  return (
    <section
      data-reveal-group
      className="px-5"
      style={{
        backgroundColor: '#141417',
        borderTop: '1px solid #2E2E38',
        borderBottom: '1px solid #2E2E38',
        paddingTop: '5.5rem',
        paddingBottom: '5.5rem',
      }}
    >
      <div className="mx-auto flex flex-col items-center gap-8 text-center" style={{ maxWidth: 620 }}>
        <h2
          data-reveal
          style={{
            fontSize: 'clamp(28px, 4.5vw, 40px)',
            fontWeight: 500,
            letterSpacing: '-0.03em',
            color: '#E8E6F0',
            lineHeight: 1.15,
          }}
        >
          Ready to work at depth?
        </h2>
        <span data-reveal>
          <Button asChild size="lg" style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}>
            <Link to={PATHS.signup}>Get started free</Link>
          </Button>
        </span>
      </div>
    </section>
  )
}
