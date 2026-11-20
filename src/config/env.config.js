const rawApiUrl =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://api.nexgn.cloud/api/v1/'

export const env = {
  API_URL: rawApiUrl.endsWith('/') ? rawApiUrl : `${rawApiUrl}/`,
  RAZORPAY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  // Sample data so the UI runs before the API is ready. Can never be on in a production build.
  DEMO: !import.meta.env.PROD && import.meta.env.VITE_DEMO === 'true',
}

export const API_URL = env.API_URL
export const RAZORPAY_ID = env.RAZORPAY_ID