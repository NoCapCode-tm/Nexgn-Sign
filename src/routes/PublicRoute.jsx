import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getPostLoginPath } from '@/utils/postLoginPath'

export default function PublicRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (!loading && user) return <Navigate to={getPostLoginPath(location)} replace />
  return <Outlet />
}