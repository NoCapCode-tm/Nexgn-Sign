import axios from 'axios'
import { env } from '@/config/env.config'

export const AUTH_EVENT = 'nexgn:unauthorized'

// Exclude public auth, invite, logout, and external signer endpoints from triggering session-expired loops
const AUTH_URL_RE =
  /(?:^|\/)(auth|sign|admin\/(login|logout|signup|register|verify|forgot-password|resetpassword|reset-password|twofaverifylogin|2fa|setpassword|decline))(\/|\?|$)/i

export const apiClient = axios.create({
  baseURL: env.API_URL,
  withCredentials: true, // Required for httpOnly session cookies
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// Automatically let the browser set multipart/form-data boundaries for PDF/file uploads
apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type']
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    // Session expired mid-use: tell AuthContext to clear the user.
    if (status === 401 && !AUTH_URL_RE.test(url)) {
      window.dispatchEvent(new Event(AUTH_EVENT))
    }

    const serverMsg =
      typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : null

    error.userMessage =
      serverMsg ||
      (error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : !error.response
          ? 'Network error. Check your connection.'
          : 'Something went wrong. Please try again.')

    return Promise.reject(error)
  },
)