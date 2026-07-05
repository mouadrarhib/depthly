import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { EmailConfirmedPage } from '@/pages/auth/EmailConfirmedPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { TimerPage } from '@/pages/TimerPage'
import { BillingPage } from '@/pages/BillingPage'
import { DashboardPage } from '@/pages/DashboardPage'
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
    // ── Auth routes (no sidebar, no auth required) ─────────────────────────
    {
      element: <AuthLayout />,
      children: [
        { path: '/login',           element: <LoginPage /> },
        { path: '/signup',          element: <SignupPage /> },
        { path: '/forgot-password', element: <ForgotPasswordPage /> },
        { path: '/reset-password',  element: <ResetPasswordPage /> },
        { path: '/email-confirmed', element: <EmailConfirmedPage /> },
      ],
    },

    // ── Protected app routes ───────────────────────────────────────────────
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: '/',             element: <ErrorBoundary><DashboardPage /></ErrorBoundary> },
            { path: '/dashboard',    element: <Navigate to="/" replace /> },
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
