import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { BarChart3, Clock, Globe, Image, Share2, ShieldCheck, Target, Users } from 'lucide-react'

import { AnalyticsMockup } from '@/components/landing/AnalyticsMockup'
import { ClosingCtaSection } from '@/components/landing/ClosingCtaSection'
import { FeatureSection } from '@/components/landing/FeatureSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { LeaderboardMockup } from '@/components/landing/LeaderboardMockup'
import { OverviewSection } from '@/components/landing/OverviewSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { ProjectsSupportSection } from '@/components/landing/ProjectsSupportSection'
import { ShareProgressMockup } from '@/components/landing/ShareProgressMockup'
import { TimerMockup } from '@/components/landing/TimerMockup'
import { FeatureBlock } from '@/components/landing/primitives'
import { useLandingAnimations } from '@/components/landing/useLandingAnimations'
import { useAuth } from '@/hooks/shared/useAuth'
import { PATHS } from '@/routes/paths'

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
          title="Make every focused minute count"
          subtext="Start a countdown or stopwatch and let Depthly track the session from the timer itself. When you finish, that trusted time becomes part of your progress."
          mockupSide="left"
          mockup={<TimerMockup />}
        >
          <FeatureBlock
            Icon={Clock}
            title="Your rhythm, accurately tracked"
            description="Use a focused countdown or an open-ended stopwatch. Pause, resume, or recover the same active timer across tabs."
          />
          <FeatureBlock
            Icon={ShieldCheck}
            title="Trusted progress"
            description="Completed timer sessions become verified progress, so your analytics and private rankings reflect time you actually focused."
          />
          <FeatureBlock
            Icon={Target}
            title="Built for consistency"
            description="Set your focus and break lengths, then return tomorrow with your history, goals, and streak ready to continue."
          />
        </FeatureSection>

        {/* 2 — Daily goals and Analytics */}
        <FeatureSection
          heading="Turn a focused day into a visible habit"
          body="Set a daily target, watch it fill as you work, and use Analytics to understand where your time went across days, weeks, months, and years."
          mockupSide="right"
          mockup={<AnalyticsMockup />}
        >
          <FeatureBlock
            Icon={Target}
            title="A daily goal you can see"
            description="Compare today's focused time with your target at a glance, including the real total when you go beyond it."
          />
          <FeatureBlock
            Icon={BarChart3}
            title="Patterns, not guesswork"
            description="See session totals, heatmaps, trends, streaks, and project breakdowns using the same trusted focus history."
          />
        </FeatureSection>

        {/* 3 — Share Progress */}
        <FeatureSection
          heading="Share the progress, not just a number"
          body="Turn the Analytics view you are already looking at into a branded image, complete with its charts and goal progress. Preview it before you share or download."
          mockupSide="left"
          mockup={<ShareProgressMockup />}
        >
          <FeatureBlock
            Icon={Image}
            title="Your current Analytics view"
            description="Share Daily, Weekly, Monthly, or Yearly progress with the same visual story you see inside Depthly."
          />
          <FeatureBlock
            Icon={Share2}
            title="Preview, then choose"
            description="Use native sharing when available, or download and copy the image. Share Progress works on every plan within its Analytics window."
          />
        </FeatureSection>

        {/* 4 — Private group leaderboards */}
        <FeatureSection
          heading="Bring your own focus circle"
          body="Create an invite-only group for study partners, freelancer peers, or accountability friends. Everyone can join and compete privately, including Free members, without making their profile public."
          mockupSide="right"
          mockup={<LeaderboardMockup />}
        >
          <FeatureBlock
            Icon={Users}
            title="Private by membership"
            description="Only group members see names, avatars, trusted focus time, session counts, and progress inside that group."
          />
          <FeatureBlock
            Icon={Globe}
            title="Public competition stays optional"
            description="Friends and global rankings are still available when you want them. Your private group never changes your public-profile setting."
          />
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
