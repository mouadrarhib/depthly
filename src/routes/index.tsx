import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { BillingPage } from '@/pages/BillingPage'
import { GroupLeaderboardDetailPage } from '@/pages/GroupLeaderboardDetailPage'
import { GroupLeaderboardsPage } from '@/pages/GroupLeaderboardsPage'
import { HomePage } from '@/pages/HomePage'
import { JoinGroupLeaderboardPage } from '@/pages/JoinGroupLeaderboardPage'
import { LandingPage } from '@/pages/LandingPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { PublicProfilePage } from '@/pages/PublicProfilePage'
import { SessionsPage } from '@/pages/SessionsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TermsPage } from '@/pages/TermsPage'
import { TimerPage } from '@/pages/TimerPage'

import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter(
  [
    // ── Public marketing site ──────────────────────────────────────────────
    { path: '/', element: <LandingPage /> },
    { path: '/terms', element: <TermsPage /> },
    { path: '/privacy', element: <PrivacyPage /> },

    // ── Auth routes (no sidebar, no auth required) ─────────────────────────
    {
      element: <AuthLayout />,
      children: [
        { path: '/login',           element: <LoginPage /> },
        { path: '/signup',          element: <SignupPage /> },
      ],
    },

    // ── Protected app routes ───────────────────────────────────────────────
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: '/dashboard',    element: <ErrorBoundary><HomePage /></ErrorBoundary> },
            { path: '/timer',        element: <ErrorBoundary><TimerPage /></ErrorBoundary> },
            { path: '/settings',     element: <ErrorBoundary><SettingsPage /></ErrorBoundary> },
            { path: '/projects',     element: <ErrorBoundary><ProjectsPage /></ErrorBoundary> },
            { path: '/projects/:id', element: <ErrorBoundary><ProjectDetailPage /></ErrorBoundary> },
            { path: '/sessions',     element: <ErrorBoundary><SessionsPage /></ErrorBoundary> },
            { path: '/analytics',    element: <ErrorBoundary><AnalyticsPage /></ErrorBoundary> },
            { path: '/leaderboard',  element: <ErrorBoundary><LeaderboardPage /></ErrorBoundary> },
            { path: '/leaderboard/groups', element: <ErrorBoundary><GroupLeaderboardsPage /></ErrorBoundary> },
            { path: '/leaderboard/groups/:id', element: <ErrorBoundary><GroupLeaderboardDetailPage /></ErrorBoundary> },
            { path: '/billing',      element: <BillingPage /> },
          ],
        },
      ],
    },

    // ── Public profile ────────────────────────────────────────────────────
    { path: '/u/:slug', element: <PublicProfilePage /> },
    { path: '/join/:code', element: <JoinGroupLeaderboardPage /> },

    // ── 404 ───────────────────────────────────────────────────────────────
    { path: '*', element: <NotFoundPage /> },
  ],
  {},
)
