import axios from 'axios'
import { env } from '@/config/env.config'

export const AUTH_EVENT = 'nexgn:unauthorized'

// Exclude all public auth & invite endpoints from triggering session-expired logout loops
const AUTH_URL_RE =
  /^\/?(auth|admin\/(login|signup|register|verify|forgot-password|resetpassword|reset-password|twofaverifylogin|2fa|setpassword|decline))/i

export const apiClient = axios.create({
  baseURL: env.API_URL,
  withCredentials: true, // Required for httpOnly session cookies
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    // Session expired mid-use: tell AuthContext to clear the user.
    // Auth & admin login/signup/invite calls are excluded so form errors don't trigger it.
    if (status === 401 && !AUTH_URL_RE.test(url)) {
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