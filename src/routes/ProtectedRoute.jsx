import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import LoadingOverlay from '@/components/common/LoadingOverlay'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingOverlay message="Verifying your session..." />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}