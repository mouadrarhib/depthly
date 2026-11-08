import { Link } from 'react-router-dom'

import { HeroProductPreview } from '@/components/landing/HeroProductPreview'
import { Button } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/** Public hero for students, freelancers, and independent learners. */
export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden px-4 pb-12 pt-12 sm:px-5 sm:pt-16 lg:min-h-[calc(72svh-4rem)] lg:items-start lg:pb-8 lg:pt-[clamp(3rem,6vh,4.5rem)]">
      {/* Background dot grid — absolutely positioned to cover the full
          section, sits behind the text content (below, in the relative
          content wrapper's stacking order). Dot color uses the app's
          ink-secondary token directly (var(--color-text-muted)) for real contrast against
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
          backgroundImage: 'radial-gradient(circle, var(--color-text-muted) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.14,
          maskImage: 'radial-gradient(ellipse 68% 72% at 50% 46%, black 20%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 68% 72% at 50% 46%, black 20%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-10" style={{ zIndex: 1 }}>
        <div className="flex flex-col items-start text-left">
          <h1
            data-hero
            className="text-[27px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink-primary min-[360px]:text-[30px] sm:text-[clamp(34px,4.3vw,58px)]"
          >
            <span className="block">Focus on the work.</span>
            <span className="block text-brand">We&apos;ll track the time.</span>
          </h1>

          <p
            data-hero
            className="mt-6 max-w-[540px] text-base leading-relaxed text-ink-primary/80 sm:mt-8"
          >
            Track focused sessions for study or client work. Keep time linked to your tasks, work
            toward a daily goal, and see where your time goes.
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

        <div data-hero className="w-full min-w-0">
          <HeroProductPreview />
        </div>
      </div>
    </section>
  )
}
