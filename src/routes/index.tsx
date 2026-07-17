import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { TimerPage } from '@/pages/TimerPage'
import { BillingPage } from '@/pages/BillingPage'
import { HomePage } from '@/pages/HomePage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { PublicProfilePage } from '@/pages/PublicProfilePage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SessionsPage } from '@/pages/SessionsPage'
import { SettingsPage } from '@/pages/SettingsPage'

import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter(
  [
    // ── Public marketing site ──────────────────────────────────────────────
    { path: '/', element: <LandingPage /> },

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
            { path: '/billing',      element: <BillingPage /> },
          ],
        },
      ],
    },

    // ── Public profile ────────────────────────────────────────────────────
    { path: '/u/:slug', element: <PublicProfilePage /> },

    // ── 404 ───────────────────────────────────────────────────────────────
    { path: '*', element: <NotFoundPage /> },
  ],
  {},
)
