import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { SettingsPage } from '@/pages/SettingsPage'

import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  // ── Auth routes (no sidebar, no auth required) ─────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',  element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },

  // ── Protected app routes ───────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/',         element: <HomePage /> },
          { path: '/settings', element: <SettingsPage /> },
          // Add your domain routes here:
          // { path: '/projects',     element: <ProjectsPage /> },
          // { path: '/projects/:id', element: <ProjectDetailPage /> },
        ],
      },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
])
