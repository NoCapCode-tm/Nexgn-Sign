import { apiClient } from './apiClient'
import { clear2FAVerified } from '@/utils/twoFactor'

// Some backends answer a wrong code with HTTP 200 and the error only in the body
const failureMessage = (data) => {
  if (!data || typeof data !== 'object') return null
  const msg =
    typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : ''
  if (data.success === false || data.status === false || data.verified === false || data.valid === false || data.error) {
    return msg || 'Incorrect authentication code.'
  }
  if (/invalid|incorrect|wrong|expired|failed|not valid|unauthori[sz]ed/i.test(msg)) return msg
  return null
}

export const authService = {
  me: async () => {
    const { data } = await apiClient.get('/admin/me')
    return data?.message ?? data?.user ?? data
  },

  login: async ({ email, password, remember }) => {
    const { data } = await apiClient.post('/admin/login', { email, password, remember })
    const user = 
      (typeof data?.message === 'object' && data.message !== null ? data.message : null) ||
      data?.user || 
      (typeof data === 'object' && data !== null ? data : null)

    const resolvedId = user?._id || user?.id || data?.id || data?.userId
    if (resolvedId) {
      localStorage.setItem('nexgn_user_id', resolvedId)
    }

    return data
  },

  signup: async (payload) => {
    const { data } = await apiClient.post('/admin/signup', payload)
    return data
  },

  register: async (payload) => {
    const { data } = await apiClient.post('/admin/signup', payload)
    return data
  },

  verifyAccount: async (id) => {
    const { data } = await apiClient.post('/admin/verify', { status: 'Active', id })
    return data
  },

    verify2FA: async ({ token, id }) => {
    const { data } = await apiClient.post('/admin/twofaverifylogin', { token, id })
    if (import.meta.env.DEV) console.debug('[2FA] response:', data)

    const failure = failureMessage(data)
    if (failure) {
      const err = new Error(failure)
      err.userMessage = failure
      throw err
    }

    const user =
      (typeof data?.message === 'object' && data.message !== null ? data.message : null) ||
      data?.user ||
      (typeof data === 'object' && data !== null ? data : null)

    const resolvedId = user?._id || user?.id || data?.id || data?.userId
    if (resolvedId) {
      localStorage.setItem('nexgn_user_id', resolvedId)
    }

    return data
  },

  forgotPassword: async (email) => {
    const { data } = await apiClient.post('/admin/forgot-password', { email })
    return data
  },

  resetPassword: async ({ id, password }) => {
    const { data } = await apiClient.post('/admin/resetpassword', { id, password })
    return data
  },

  getInvitation: async (token) => {
    const { data } = await apiClient.get(`/admin/invite/${encodeURIComponent(token)}`)
    return data?.message ?? data?.invite ?? data
  },

  acceptInvitation: async ({ token, email, password }) => {
    if (token) {
      const { data } = await apiClient.post(`/admin/invite/${encodeURIComponent(token)}/accept`, { password })
      return data
    }
    const { data } = await apiClient.post('/admin/setpassword', { email, password })
    return data
  },

  declineInvitation: async (tokenOrEmail) => {
    const { data } = await apiClient.post(`/admin/invite/${encodeURIComponent(tokenOrEmail)}/decline`)
    return data
  },

  acceptInvite: async ({ email, password }) => {
    const { data } = await apiClient.post('/admin/setpassword', { email, password })
    return data
  },

  declineInvite: async (email) => {
    const { data } = await apiClient.get(`/admin/decline/${encodeURIComponent(email)}`)
    return data
  },

  logout: async () => {
    localStorage.removeItem('nexgn_user_id')
    const { data } = await apiClient.post('/admin/logout')
    return data
  },
}