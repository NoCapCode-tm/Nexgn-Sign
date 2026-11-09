import axios from 'axios'
import { env } from '@/config/env.config'

export const AUTH_EVENT = 'nexgn:unauthorized'

export const apiClient = axios.create({
  baseURL: env.API_URL,
  withCredentials: true, // httpOnly session cookie
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    // Session expired mid-use: tell AuthContext to clear the user.
    // /auth/* calls are excluded so login errors don't trigger it.
    if (status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event(AUTH_EVENT))
    }

    error.userMessage =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : !error.response
          ? 'Network error. Check your connection.'
          : 'Something went wrong. Please try again.')

    return Promise.reject(error)
  },
)