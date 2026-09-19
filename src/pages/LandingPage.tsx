import { useEffect, useRef } from 'react'

import { BarChart3, Target } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'


import { AnalyticsMockup } from '@/components/landing/AnalyticsMockup'
import { ClosingCtaSection } from '@/components/landing/ClosingCtaSection'
import { FeatureSection } from '@/components/landing/FeatureSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { LeaderboardMockup } from '@/components/landing/LeaderboardMockup'
import { OverviewSection } from '@/components/landing/OverviewSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { FeatureBlock } from '@/components/landing/primitives'
import { ProjectsSupportSection } from '@/components/landing/ProjectsSupportSection'
import { ShareProgressMockup } from '@/components/landing/ShareProgressMockup'
import { TimerMockup } from '@/components/landing/TimerMockup'
import { useLandingAnimations } from '@/components/landing/useLandingAnimations'
import { useAuth } from '@/hooks/shared/useAuth'
import { PATHS } from '@/routes/paths'

const READABLE_SECONDARY_TEXT =
  'color-mix(in srgb, var(--color-text-muted) 76%, var(--color-text) 24%)'

/**
 * Public marketing landing page, served at "/".
 * Static content only — auth state is read solely to swap the nav CTA.
 */
export function LandingPage() {
  // Sync Supabase session into the store (this page renders outside AppLayout).
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user) {
      navigate(PATHS.dashboard, { replace: true, state: { fromAuth: true } })
    }
  }, [user, navigate])

  // Footer/nav links from other routes navigate here with `scrollTo` in
  // state (e.g. clicking "Features" from /login) — land at the top first,
  // then smooth-scroll to the target section once mounted.
  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo
    if (!scrollTo) return
    document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' })
    navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  const rootRef = useRef<HTMLDivElement>(null)
  useLandingAnimations(rootRef)

  return (
    <div ref={rootRef} style={{ backgroundColor: '#0D0D10', minHeight: '100dvh' }}>
      <LandingNav />

      <main>
        <HeroSection />

        <OverviewSection />

        {/* 1 — Trusted focus timer */}
        <FeatureSection
          eyebrow="Trusted focus"
          title="A timer for the work in front of you"
          subtext="Choose a countdown or stopwatch. When you finish, the session updates your history and goal progress."
          mockupSide="left"
          mockup={<TimerMockup />}
        >
          <div data-reveal className="border-t border-depth-border pt-5">
            <h3 className="text-base font-medium tracking-[-0.01em] text-ink-primary">
              Pick up where you left off
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Pause, refresh, or switch tabs without losing your active timer.
            </p>
          </div>
          <div data-reveal className="border-t border-depth-border pt-5">
            <h3 className="text-base font-medium tracking-[-0.01em] text-ink-primary">
              After you finish
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Your focus time updates Analytics and private group rankings.
            </p>
          </div>
        </FeatureSection>

        {/* 2 — Daily goals and Analytics */}
        <FeatureSection
          heading="Turn a focused day into a visible habit"
          body="Set a daily goal. Your finished sessions show how today is going and how your focus builds over time."
          mockupSide="right"
          mockup={<AnalyticsMockup />}
          viewportFit
          compactCopy
          bodyColor={READABLE_SECONDARY_TEXT}
        >
          <FeatureBlock
            Icon={Target}
            title="Know where you stand today"
            description="See your focus time beside your daily target, even when you go past it."
            descriptionColor={READABLE_SECONDARY_TEXT}
          />
          <FeatureBlock
            Icon={BarChart3}
            title="Look back with context"
            description="Find the days you showed up and the projects that got your time."
            descriptionColor={READABLE_SECONDARY_TEXT}
          />
        </FeatureSection>

        {/* 3 — Share Progress */}
        <FeatureSection
          heading="Share the progress, not just a number"
          body="Make an image from the Analytics view you're looking at, with its charts and goal progress intact."
          mockupSide="left"
          mockup={<ShareProgressMockup />}
          bodyColor={READABLE_SECONDARY_TEXT}
        >
          <div data-reveal className="grid gap-5 border-t border-depth-border pt-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-ink-primary">Your current view</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: READABLE_SECONDARY_TEXT }}>
                Daily, Weekly, Monthly, or Yearly, including the project you selected.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-ink-primary">Your choice to share</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: READABLE_SECONDARY_TEXT }}>
                Preview the image, then share, copy, or download it.
              </p>
            </div>
          </div>
        </FeatureSection>

        {/* 4 — Private group leaderboards */}
        <FeatureSection
          heading="Bring your own focus circle"
          body="Make a private circle for the people you work alongside. Trusted sessions count toward a ranking only members can see."
          mockupSide="right"
          mockup={<LeaderboardMockup />}
          bodyColor={READABLE_SECONDARY_TEXT}
        >
          <div data-reveal className="space-y-5 border-t border-depth-border pt-6">
            <div>
              <h3 className="text-sm font-medium text-ink-primary">Choose the rhythm</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: READABLE_SECONDARY_TEXT }}>
                Run daily, seven-day, or monthly rounds, with an optional goal for each member.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-ink-primary">No public profile needed</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: READABLE_SECONDARY_TEXT }}>
                Free members can join and rank without making their profiles public.
              </p>
            </div>
          </div>
        </FeatureSection>

        {/* 5 — Projects and tasks support the focus loop */}
        <ProjectsSupportSection />

        <PricingSection />

        <ClosingCtaSection />
      </main>

      <LandingFooter />
    </div>
  )
}
