import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Clock, Flag, Flame, Globe, Kanban, Link2, SlidersHorizontal, TimerReset, TrendingUp, Users } from 'lucide-react'

import { AnalyticsMockup } from '@/components/landing/AnalyticsMockup'
import { ClosingCtaSection } from '@/components/landing/ClosingCtaSection'
import { FeatureSection } from '@/components/landing/FeatureSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { LeaderboardMockup } from '@/components/landing/LeaderboardMockup'
import { OverviewSection } from '@/components/landing/OverviewSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { TaskKanbanMockup } from '@/components/landing/TaskKanbanMockup'
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

        {/* Section A — Focus Timer (mockup left) */}
        <FeatureSection
          eyebrow="Focus sessions"
          title="Pick your rhythm"
          subtext="Run structured Pomodoro intervals or a plain stopwatch for open-ended work. Set your own durations and goals, and let Depthly remember the rest."
          mockupSide="left"
          mockup={<TimerMockup />}
        >
          <FeatureBlock
            Icon={TimerReset}
            title="Timer or stopwatch"
            description="Some days need 25 minutes. Some days need three hours with no clock in sight. Switch modes without losing your session."
          />
          <FeatureBlock
            Icon={SlidersHorizontal}
            title="Fully customizable"
            description="Set your own focus length, break length, and daily goal. Change it whenever your energy does."
          />
          <FeatureBlock
            Icon={Flame}
            title="Session tracking with streaks"
            description="Every session saves itself. Miss a day and the streak resets, so there's a small reason to show up tomorrow."
          />
        </FeatureSection>

        {/* Section B — Projects & Tasks (mockup right) */}
        <FeatureSection
          heading="Turn hours into actual progress"
          body="Every session ties back to a real task. Track it in a flat list or drag it across a kanban board — your call, switch anytime."
          mockupSide="right"
          mockup={<TaskKanbanMockup />}
        >
          <FeatureBlock
            Icon={Kanban}
            title="List or kanban"
            description="See everything in one ordered list, or move cards through To Do, In Progress, and Done. Same tasks, two views."
          />
          <FeatureBlock
            Icon={Flag}
            title="Priority and due dates"
            description="Flag what's urgent, set a due date, and overdue tasks tell you before you have to ask."
          />
          <FeatureBlock
            Icon={Link2}
            title="Tied to your sessions"
            description="Pick a task when you start the timer. Your pomodoro count builds up on the task itself, not just in the void."
          />
        </FeatureSection>

        {/* Section C — Analytics (mockup left) */}
        <FeatureSection
          heading="Where did today actually go?"
          body="Track progress, spot patterns, and see it laid out day by day, week by week, without doing the math yourself."
          mockupSide="left"
          mockup={<AnalyticsMockup />}
        >
          <FeatureBlock
            Icon={Clock}
            title="Daily focus tracking"
            description="Today's total, right when you open the app. No digging."
          />
          <FeatureBlock
            Icon={TrendingUp}
            title="Visualize your progress"
            description="Heatmaps and trend lines across weeks, months, and years."
          />
        </FeatureSection>

        {/* Section D — Leaderboard & Streaks (mockup right) */}
        <FeatureSection
          heading="Nobody's watching you focus at 2am. This is."
          body="See where you rank against everyone else on Depthly, or narrow it down to people you actually know."
          mockupSide="right"
          mockup={<LeaderboardMockup />}
        >
          <FeatureBlock
            Icon={Globe}
            title="Global rankings"
            description="Weekly focus hours, ranked. Resets every week for a fresh shot at the top."
          />
          <FeatureBlock
            Icon={Users}
            title="Follow friends"
            description="Follow people you know. A little friendly pressure goes a long way."
          />
        </FeatureSection>

        <PricingSection />

        <ClosingCtaSection />
      </main>

      <LandingFooter />
    </div>
  )
}
