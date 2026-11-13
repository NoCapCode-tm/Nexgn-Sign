import { apiClient } from './apiClient'

export const authService = {
  // Session check
  me: async () => {
    const { data } = await apiClient.get('/admin/me')
    return data?.message ?? data?.user ?? data
  },

  // From Login-old.jsx: POST /admin/login with { email, password }
  login: async ({ email, password, remember }) => {
    const { data } = await apiClient.post('/admin/login', { email, password, remember })
    const user = data?.message ?? data?.user ?? data

    if (user?._id) {
      localStorage.setItem('nexgn_user_id', user._id)
    }

    return data
  },

  // From SignUp-old.jsx: POST /admin/signup
  // Payload: { name, email, password, companyname, industry, team_size }
  signup: async (payload) => {
    const { data } = await apiClient.post('/admin/signup', payload)
    return data
  },

  // Alias for signup in case any component calls authService.register()
  register: async (payload) => {
    const { data } = await apiClient.post('/admin/signup', payload)
    return data
  },

  // From Login-old.jsx: POST /admin/verify with { status: "Active", id }
  verifyAccount: async (id) => {
    const { data } = await apiClient.post('/admin/verify', { status: 'Active', id })
    return data
  },

  // From Verify2FA-old.jsx: POST /admin/twofaverifylogin with { token, id }
  verify2FA: async ({ token, id }) => {
    const { data } = await apiClient.post('/admin/twofaverifylogin', { token, id })
    const user = data?.message ?? data?.user ?? data

    if (user?._id) {
      localStorage.setItem('nexgn_user_id', user._id)
    }

    return data
  },

  // From ForgotPassword-old.jsx: POST /admin/forgot-password with { email }
  forgotPassword: async (email) => {
    const { data } = await apiClient.post('/admin/forgot-password', { email })
    return data
  },

  // From SetNewPassword-old.jsx: POST /admin/resetpassword with { id, password }
  resetPassword: async ({ id, password }) => {
    const { data } = await apiClient.post('/admin/resetpassword', { id, password })
    return data
  },

  // From Invite-old.jsx: POST /admin/setpassword with { email, password }
  acceptInvite: async ({ email, password }) => {
    const { data } = await apiClient.post('/admin/setpassword', { email, password })
    return data
  },

  // From Invite-Deny-old.jsx: GET /admin/decline/:email
  declineInvite: async (email) => {
    const { data } = await apiClient.get(`/admin/decline/${encodeURIComponent(email)}`)
    return data
  },

  // Clear local user ID and hit logout route
  logout: async () => {
    localStorage.removeItem('nexgn_user_id')
    const { data } = await apiClient.post('/admin/logout')
    return data
  },
}