import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getPostLoginPath } from '@/utils/postLoginPath'
import LoadingOverlay from '@/components/common/LoadingOverlay'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingOverlay message="Verifying your session..." />
  
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  // 2FA users must verify their code in this browser before entering the app
  const next = getPostLoginPath(user)
  if (next.startsWith('/verify-2fa')) return <Navigate to={next} replace />

  return <Outlet />
}