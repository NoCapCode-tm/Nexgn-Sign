import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getPostLoginPath } from '@/utils/postLoginPath'
import LoadingOverlay from '@/components/common/LoadingOverlay'

export default function PublicRoute() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  // if (loading) return <LoadingOverlay message="Checking authentication..." /> //optional loading overlay for public routes

  if (user) {
    const target = getPostLoginPath(user)
    // An unverified 2FA user is allowed to stay on the verify page (avoids a redirect loop)
    const stayOnVerify = pathname.startsWith('/verify-2fa') && target.startsWith('/verify-2fa')
    if (!stayOnVerify) return <Navigate to={target} replace />
  }

  return <Outlet />
}