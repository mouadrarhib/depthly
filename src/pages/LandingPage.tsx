import { useRef } from 'react'

import { Clock, Flame, Globe, SlidersHorizontal, TimerReset, TrendingUp, Users } from 'lucide-react'

import { AnalyticsMockup } from '@/components/landing/AnalyticsMockup'
import { ClosingCtaSection } from '@/components/landing/ClosingCtaSection'
import { FeatureSection } from '@/components/landing/FeatureSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { LeaderboardMockup } from '@/components/landing/LeaderboardMockup'
import { OverviewSection } from '@/components/landing/OverviewSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { TimerMockup } from '@/components/landing/TimerMockup'
import { FeatureBlock } from '@/components/landing/primitives'
import { useLandingAnimations } from '@/components/landing/useLandingAnimations'
import { useAuth } from '@/hooks/shared/useAuth'

/**
 * Public marketing landing page, served at "/".
 * Static content only — auth state is read solely to swap the nav CTA.
 */
export function LandingPage() {
  // Sync Supabase session into the store (this page renders outside AppLayout).
  useAuth()

  const rootRef = useRef<HTMLDivElement>(null)
  useLandingAnimations(rootRef)

  return (
    <div ref={rootRef} style={{ backgroundColor: '#0D0D10', minHeight: '100dvh' }}>
      <LandingNav />

      <main>
        <HeroSection />

        <OverviewSection />

        {/* Section A — Focus Timer (mockup left) */}
        <FeatureSection
          eyebrow="Focus sessions"
          title="Your focus, your way"
          subtext="Choose structured timer sessions or a flexible stopwatch. Customize work intervals, break lengths, and session goals."
          mockupSide="left"
          mockup={<TimerMockup />}
        >
          <FeatureBlock
            Icon={TimerReset}
            title="Timer or stopwatch"
            description="Run structured intervals like Pomodoro, or switch to stopwatch mode for open-ended deep work that matches your flow."
          />
          <FeatureBlock
            Icon={SlidersHorizontal}
            title="Fully customizable"
            description="Set your ideal work duration, break length, and daily goal. Adjust anytime to match your energy levels."
          />
          <FeatureBlock
            Icon={Flame}
            title="Session tracking with streaks"
            description="Every session is saved automatically. Stack focused days into a streak you won't want to break."
          />
        </FeatureSection>

        {/* Section B — Analytics (mockup right) */}
        <FeatureSection
          eyebrow="Analytics"
          title="Understand your focus habits"
          subtext="Track progress, spot patterns, and build better habits with clear, visual insights into how you work."
          mockupSide="right"
          mockup={<AnalyticsMockup />}
        >
          <FeatureBlock
            Icon={Clock}
            title="Daily focus tracking"
            description="See today's focus time and sessions at a glance, with detailed breakdowns of how your hours were spent."
          />
          <FeatureBlock
            Icon={TrendingUp}
            title="Visualize your progress"
            description="Calendar heatmaps and trend charts show your consistency across weeks, months, and years."
          />
        </FeatureSection>

        {/* Section C — Leaderboard & Streaks (mockup left) */}
        <FeatureSection
          eyebrow="Leaderboard"
          title="Stay accountable, stay motivated"
          subtext="Focus is easier when you're not doing it alone. See where you rank and keep your momentum going."
          mockupSide="left"
          mockup={<LeaderboardMockup />}
        >
          <FeatureBlock
            Icon={Globe}
            title="Global rankings"
            description="Compete on weekly focus hours with everyone on Depthly. The board resets weekly — a fresh shot at the top."
          />
          <FeatureBlock
            Icon={Users}
            title="Follow friends"
            description="Keep an eye on your friends' hours and streaks — a little friendly pressure goes a long way."
          />
          <FeatureBlock
            Icon={Flame}
            title="Streak momentum"
            description="Your streak grows every day you focus. Protect it, and watch your consistency compound."
            iconColor="#C8FF64"
          />
        </FeatureSection>

        <PricingSection />

        <ClosingCtaSection />
      </main>

      <LandingFooter />
    </div>
  )
}
