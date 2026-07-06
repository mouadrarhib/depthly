import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/**
 * Hero — centered headline, one subtext line, single primary CTA.
 * Alternate headlines considered: "Deep work, made measurable." /
 * "Focus deeper. Ship more."
 */
export function HeroSection() {
  return (
    <section
      className="flex flex-col items-center px-5 text-center"
      style={{ paddingTop: '6.5rem', paddingBottom: '6rem' }}
    >
      <div className="flex flex-col items-center" style={{ maxWidth: 700 }}>
        <h1
          data-hero
          style={{
            fontSize: 'clamp(38px, 7vw, 56px)',
            fontWeight: 500,
            letterSpacing: '-0.04em',
            color: '#E8E6F0',
            lineHeight: 1.08,
          }}
        >
          Work at depth.
        </h1>

        <p
          data-hero
          style={{
            fontSize: 16,
            color: '#7A7890',
            lineHeight: 1.65,
            marginTop: 20,
            maxWidth: 560,
          }}
        >
          Depthly is a focus session tracker for students, freelancers, and remote
          developers — run deep work sessions, see where your hours go, and build
          a streak you won&apos;t want to break.
        </p>

        <div
          data-hero
          className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          style={{ marginTop: 36 }}
        >
          <Button asChild size="lg" style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}>
            <Link to={PATHS.signup}>Get started free</Link>
          </Button>
          <span style={{ fontSize: 13, color: '#7A7890' }}>
            Free forever&ensp;•&ensp;No credit card required
          </span>
        </div>
      </div>
    </section>
  )
}
