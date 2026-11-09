import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '@/services/auth.service'
import { AUTH_EVENT } from '@/services/apiClient'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on first load
  useEffect(() => {
    let active = true
    authService
      .me()
      .then((u) => active && setUser(u))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // Session expired somewhere in the app
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(AUTH_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_EVENT, onUnauthorized)
  }, [])

  // Returns the API response. If it says 2FA is required, the Login page
  // navigates to /verify-2fa and later calls completeLogin(user).
  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials)
    if (!data?.requires2FA) setUser(data.user ?? data)
    return data
  }, [])

  const completeLogin = useCallback((u) => setUser(u), [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const u = await authService.me()
    setUser(u)
    return u
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: !!user, login, completeLogin, logout, refreshUser }),
    [user, loading, login, completeLogin, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}