import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
import LoadingOverlay from '@/components/common/LoadingOverlay'
import NotFound from '@/components/common/NotFound'
import AppLayout from '@/components/layout/AppLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import PublicSignLayout from '@/components/layout/PublicSignLayout'

// Turns () => import('./Page') into a React Router lazy route
const page = (loader) => async () => ({ Component: (await loader()).default })
const compact = { variant: 'compact' }

const router = createBrowserRouter([
  {
    HydrateFallback: LoadingOverlay,
    children: [
      // 1. DEFAULT ROOT REDIRECT
      { path: '/', element: <Navigate to="/login" replace /> },

      // External signers (no login required)
      {
        element: <PublicSignLayout />,
        children: [
          { path: 'sign/:token', lazy: page(() => import('@/features/signing/pages/SignRequest')) },
          { path: 'sign/:token/view', lazy: page(() => import('@/features/signing/pages/PublicSignViewer')) },
        ],
      },

      // Auth pages (logged-in users get redirected away by PublicRoute)
      {
        element: <PublicRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: 'login', lazy: page(() => import('@/features/auth/pages/Login')) },
              { path: 'login/:id', lazy: page(() => import('@/features/auth/pages/Login')) },
              { path: 'signup', lazy: page(() => import('@/features/auth/pages/SignUp')) },
              { path: 'forgot-password', handle: compact, lazy: page(() => import('@/features/auth/pages/ForgotPassword')) },
              { path: 'reset-password', lazy: page(() => import('@/features/auth/pages/SetNewPassword')) },
              { path: 'reset-password/done', handle: compact, lazy: page(() => import('@/features/auth/pages/ResetPasswordDone')) },
              { path: 'reset-password/:id', lazy: page(() => import('@/features/auth/pages/SetNewPassword')) },
              { path: 'verify-2fa', handle: compact, lazy: page(() => import('@/features/auth/pages/Verify2FA')) },
              { path: 'verify-2fa/:id', handle: compact, lazy: page(() => import('@/features/auth/pages/Verify2FA')) },
            ],
          },
        ],
      },

      // Invites (open to anyone, placed inside AuthLayout with compact variant)
      {
        element: <AuthLayout />,
        children: [
          { path: 'invite', handle: compact, lazy: page(() => import('@/features/auth/pages/InviteLanding')) },
          { path: 'invite/accept', handle: compact, lazy: page(() => import('@/features/auth/pages/InviteAccept')) },
          { path: 'invite/accept/:token', handle: compact, lazy: page(() => import('@/features/auth/pages/InviteAccept')) },
          { path: 'invite/deny', handle: compact, lazy: page(() => import('@/features/auth/pages/InviteDeny')) },
          { path: 'invite/deny/:token', handle: compact, lazy: page(() => import('@/features/auth/pages/InviteDeny')) },
          { path: 'invite/:token', handle: compact, lazy: page(() => import('@/features/auth/pages/InviteLanding')) },
        ],
      },

      // Public pricing page
      { path: 'pricing', lazy: page(() => import('@/features/pricing/pages/PricingPage')) },

      // Logged-in app (Protected)
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: 'dashboard', lazy: page(() => import('@/features/dashboard/pages/Dashboard')) },

              { path: 'documents', lazy: page(() => import('@/features/documents/pages/DocumentsPage')) },
              { path: 'documents/sign-yourself', lazy: page(() => import('@/features/documents/pages/SignYourself')) },
              { path: 'documents/:id', lazy: page(() => import('@/features/documents/pages/DocumentViewer')) },
              { path: 'documents/:id/edit', lazy: page(() => import('@/features/documents/pages/DocumentEditor')) },

              { path: 'templates', lazy: page(() => import('@/features/templates/pages/TemplatesPage')) },
              { path: 'templates/new', lazy: page(() => import('@/features/templates/pages/TemplateCreate')) },
              { path: 'templates/:id', lazy: page(() => import('@/features/templates/pages/TemplateView')) },

              { path: 'contacts', lazy: page(() => import('@/features/contacts/pages/ContactBook')) },

              {
                path: 'settings',
                lazy: page(() => import('@/features/settings/pages/SettingsLayout')),
                children: [
                  { index: true, element: <Navigate to="profile" replace /> },
                  { path: 'profile', lazy: page(() => import('@/features/settings/sections/Profile')) },
                  { path: 'account', lazy: page(() => import('@/features/settings/sections/Account')) },
                  { path: 'security', lazy: page(() => import('@/features/settings/sections/Security')) },
                  { path: 'notifications', lazy: page(() => import('@/features/settings/sections/Notifications')) },
                  { path: 'billing', lazy: page(() => import('@/features/settings/sections/Billing')) },
                  { path: 'integrations', lazy: page(() => import('@/features/settings/sections/Integrations')) },
                  { path: 'team', lazy: page(() => import('@/features/settings/sections/TeamManagement')) },
                  { path: 'audit-logs', lazy: page(() => import('@/features/settings/sections/AuditLogs')) },
                  { path: 'recycle-bin', lazy: page(() => import('@/features/settings/sections/RecycleBin')) },
                ],
              },
            ],
          },
        ],
      },

      { path: '*', Component: NotFound },
    ],
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}