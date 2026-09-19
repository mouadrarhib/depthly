import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/** A decisive final step after pricing, without repeating the hero layout. */
export function ClosingCtaSection() {
  return (
    <section
      data-reveal-group
      className="border-y border-depth-border bg-depth-surface px-5 py-20 md:px-8 md:py-24"
    >
      <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] md:items-end md:gap-16">
        <div data-reveal className="max-w-[680px]">
          <h2 className="text-[clamp(34px,5vw,54px)] font-medium leading-[1.08] tracking-[-0.04em] text-ink-primary">
            Start with one focused session
          </h2>
          <p className="mt-5 max-w-[540px] text-base leading-7 text-ink-secondary">
            Build your own rhythm first. Share progress or invite others when accountability would
            help.
          </p>
        </div>

        <div
          data-reveal
          data-reveal-direction="right"
          className="border-t border-depth-border pt-7 md:border-l md:border-t-0 md:pl-10 md:pt-0"
        >
          <Button
            asChild
            size="lg"
            className="w-full bg-brand text-depth-bg hover:bg-brand/90 focus-visible:ring-brand"
          >
            <Link to={PATHS.signup} className="group whitespace-nowrap">
              Get started free
              <ArrowRight
                aria-hidden="true"
                size={17}
                strokeWidth={1.75}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Button>
          <p className="mt-4 text-center text-xs text-ink-secondary md:text-left">
            Free forever <span aria-hidden="true">•</span> No credit card required
          </p>
        </div>
      </div>
    </section>
  )
}
