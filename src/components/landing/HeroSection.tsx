import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/** Public hero for students, freelancers, and independent learners. */
export function HeroSection() {
  return (
    <section
      className="relative flex flex-col items-center overflow-hidden px-4 pt-[4.5rem] text-center sm:px-5 sm:pt-[clamp(4.5rem,7vw,5rem)]"
      style={{
        paddingBottom: 'clamp(4.5rem, 9vw, 6rem)',
      }}
    >
      {/* Background dot grid — absolutely positioned to cover the full
          section, sits behind the text content (below, in the relative
          content wrapper's stacking order). Dot color uses the app's
          ink-secondary token directly (#7A7890) for real contrast against
          the dark background; overall opacity is the only fade knob. */}
      <div
        data-hero-grid
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, #7A7890 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.14,
          maskImage: 'radial-gradient(ellipse 68% 72% at 50% 46%, black 20%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 68% 72% at 50% 46%, black 20%, transparent 100%)',
        }}
      />

      <div className="relative flex flex-col items-center" style={{ maxWidth: 700, zIndex: 1 }}>
        <h1
          data-hero
          className="max-w-full text-[27px] min-[360px]:text-[30px] sm:text-[clamp(34px,5vw,64px)]"
          style={{
            fontWeight: 600,
            letterSpacing: '-0.04em',
            color: '#E8E6F0',
            lineHeight: 1.08,
          }}
        >
          <span className="sm:block">Focus deeply. </span>
          <span className="sm:block">Track your progress. </span>
          <span className="text-brand sm:block">Go further together.</span>
        </h1>

        <p
          data-hero
          className="mt-5 sm:mt-[30px]"
          style={{
            fontSize: 16,
            color: '#918EA8',
            lineHeight: 1.65,
            maxWidth: 610,
          }}
        >
          Build a focus habit you can actually see. Whether you&apos;re studying, doing client work,
          or learning independently, Depthly turns timer-tracked sessions into goals, honest
          progress, and optional accountability.
        </p>

        <div
          data-hero
          className="mt-9 flex w-full max-w-sm flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-2.5"
        >
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto"
            style={{ backgroundColor: '#4B9EFF', color: '#FFFFFF' }}
          >
            <Link to={PATHS.signup}>Get started free</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="w-full text-[#9A97AE] sm:w-auto">
            <a href="#features">See how it works</a>
          </Button>
        </div>
        <span data-hero className="mt-4 text-[12px] text-ink-secondary sm:mt-5 sm:text-[13px]">
          Free forever <span aria-hidden="true">•</span> No credit card required
        </span>
      </div>
    </section>
  )
}
