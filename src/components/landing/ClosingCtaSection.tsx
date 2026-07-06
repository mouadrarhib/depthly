import { Link } from 'react-router-dom'

import { Button, Logo } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/**
 * Full-width closing banner — lifted surface, bounded top and bottom,
 * generous padding matching the hero. Headline + subtext + primary CTA
 * with a lower-commitment secondary link, echoing the hero's structure
 * and trust line for consistency.
 *
 * Subtext alternates considered:
 *   "Join students, freelancers, and developers building better focus habits."
 *   "Your next deep work session is one click away."
 *   "Thousands of focused hours start with a single session."
 */
export function ClosingCtaSection() {
  return (
    <section
      data-reveal-group
      className="px-5"
      style={{
        backgroundColor: '#141417',
        borderTop: '0.5px solid #2E2E38',
        borderBottom: '0.5px solid #2E2E38',
        paddingTop: '6rem',
        paddingBottom: '6rem',
      }}
    >
      <div className="mx-auto flex flex-col items-center text-center" style={{ maxWidth: 620 }}>
        <span data-reveal style={{ color: '#3D3B4E', marginBottom: 20 }}>
          <Logo size={32} />
        </span>

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

        <p
          data-reveal
          style={{
            fontSize: 16,
            color: '#7A7890',
            lineHeight: 1.65,
            marginTop: 16,
            maxWidth: 480,
          }}
        >
          Join students, freelancers, and developers building better focus habits.
        </p>

        <div
          data-reveal
          className="flex flex-col items-center gap-3 sm:flex-row sm:gap-2"
          style={{ marginTop: 32 }}
        >
          <Button asChild size="lg" style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}>
            <Link to={PATHS.signup}>Get started free</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            style={{ color: '#7A7890' }}
          >
            <a href="#pricing">View pricing</a>
          </Button>
        </div>

        <span data-reveal style={{ fontSize: 13, color: '#7A7890', marginTop: 16 }}>
          Free forever&ensp;•&ensp;No credit card required
        </span>
      </div>
    </section>
  )
}
