import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { EmailConfirmedPage } from '@/pages/auth/EmailConfirmedPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SessionsPage } from '@/pages/SessionsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TimerPage } from '@/pages/TimerPage'

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
            { path: '/',             element: <TimerPage /> },
            { path: '/settings',     element: <SettingsPage /> },
            { path: '/projects',     element: <ProjectsPage /> },
            { path: '/projects/:id', element: <ProjectDetailPage /> },
            { path: '/sessions',     element: <SessionsPage /> },
            { path: '/analytics',    element: <AnalyticsPage /> },
          ],
        },
      ],
    },

    // ── 404 ───────────────────────────────────────────────────────────────
    { path: '*', element: <NotFoundPage /> },
  ],
  { future: { v7_startTransition: true } },
)
