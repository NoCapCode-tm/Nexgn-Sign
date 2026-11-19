import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '@/services/auth.service'
import { AUTH_EVENT } from '@/services/apiClient'
import { clear2FAVerified, has2FA } from '@/utils/twoFactor'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the session on first load
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
    const onUnauthorized = () => {
      clear2FAVerified()
      setUser(null)
    }
    window.addEventListener(AUTH_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_EVENT, onUnauthorized)
  }, [])

  // Re-read the current user from /admin/me and store it
  const refreshUser = useCallback(async () => {
    const u = await authService.me()
    setUser(u)
    return u
  }, [])

  // Optional helper (the Login page calls authService + refreshUser itself).
  // Every password login starts unverified. Without 2FA the user is stored straight away.
  const login = useCallback(
    async (credentials) => {
      clear2FAVerified()
      const data = await authService.login(credentials)
      const payload =
        (typeof data?.message === 'object' && data.message !== null ? data.message : null) || data?.user || data
      const needs2FA = data?.requires2FA === true || has2FA(data) || has2FA(payload)
      if (!needs2FA) await refreshUser()
      return data
    },
    [refreshUser],
  )

  const completeLogin = useCallback((u) => setUser(u), [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      clear2FAVerified()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: !!user, login, completeLogin, logout, refreshUser }),
    [user, loading, login, completeLogin, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}