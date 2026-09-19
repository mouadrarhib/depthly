import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/** Public hero for students, freelancers, and independent learners. */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-5 sm:pt-16 lg:pb-20">
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

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-10" style={{ zIndex: 1 }}>
        <div className="flex flex-col items-start text-left">
          <h1
            data-hero
            className="text-[27px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink-primary min-[360px]:text-[30px] sm:text-[clamp(34px,4.3vw,58px)]"
          >
            <span className="block">Focus on the work.</span>
            <span className="block text-brand">We&apos;ll track the time.</span>
          </h1>

          <p data-hero className="mt-6 max-w-[540px] text-base leading-relaxed text-ink-secondary sm:mt-8">
            Start a session for study, client work, or whatever you&apos;re learning. See your progress,
            and invite friends when it helps.
          </p>

          <div
            data-hero
            className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-2.5"
          >
            <Button asChild size="lg" variant="primary" className="w-full bg-brand text-white hover:bg-brand/90 sm:w-auto">
              <Link to={PATHS.signup}>Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="w-full text-ink-secondary sm:w-auto">
              <a href="#features">See how it works</a>
            </Button>
          </div>
          <span data-hero className="mt-4 text-[12px] text-ink-secondary sm:mt-5 sm:text-[13px]">
            Free forever <span aria-hidden="true">•</span> No credit card required
          </span>
        </div>

        <div data-hero className="relative h-[260px] overflow-hidden rounded-2xl border border-depth-border bg-depth-surface sm:h-[360px] lg:h-[520px]">
          <img
            src="/images/focus-work-hero.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-[65%_50%]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-depth-bg/40 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  )
}
