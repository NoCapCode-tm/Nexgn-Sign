import { apiClient } from './apiClient'

// Endpoint paths are placeholders. Match them to your backend.
export const authService = {
  me: async () => {
    const { data } = await apiClient.get('/auth/me')
    return data.user ?? data
  },
  login: async (credentials) => (await apiClient.post('/auth/login', credentials)).data,
  register: async (payload) => (await apiClient.post('/auth/register', payload)).data,
  verify2FA: async (payload) => (await apiClient.post('/auth/verify-2fa', payload)).data,
  forgotPassword: async (email) => (await apiClient.post('/auth/forgot-password', { email })).data,
  resetPassword: async (payload) => (await apiClient.post('/auth/reset-password', payload)).data,
  logout: async () => (await apiClient.post('/auth/logout')).data,
}