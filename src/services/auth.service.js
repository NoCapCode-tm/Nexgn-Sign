import { apiClient } from './apiClient'

export const authService = {
  me: async () => {
    const { data } = await apiClient.get('/admin/me') // Update if your session check route differs
    return data?.message ?? data?.user ?? data
  },

  login: async ({ email, password, remember }) => {
    // Old backend route: POST /admin/login with { email, password }
    const { data } = await apiClient.post('/admin/login', { email, password, remember })
    const user = data?.message ?? data?.user ?? data

    if (user?._id) {
      localStorage.setItem('nexgn_user_id', user._id)
    }

    return data
  },

  register: async (payload) => {
    const { data } = await apiClient.post('/admin/register', payload) // Or '/admin/signup' based on old SignUp.jsx
    return data
  },

  verifyAccount: async (id) => {
    // From Login-old.jsx: POST /admin/verify
    const { data } = await apiClient.post('/admin/verify', { status: 'Active', id })
    return data
  },

  verify2FA: async (payload) => (await apiClient.post('/admin/verify-2fa', payload)).data,
  forgotPassword: async (email) => (await apiClient.post('/admin/forgot-password', { email })).data,
  resetPassword: async (payload) => (await apiClient.post('/admin/reset-password', payload)).data,

  logout: async () => {
    localStorage.removeItem('nexgn_user_id')
    return (await apiClient.post('/admin/logout')).data
  },
}