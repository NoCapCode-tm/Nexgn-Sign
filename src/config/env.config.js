const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://api.nexgn.cloud/api/v1/'

export const env = {
  API_URL: rawApiUrl.endsWith('/') ? rawApiUrl : `${rawApiUrl}/`,
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
}

export const API_URL = env.API_URL