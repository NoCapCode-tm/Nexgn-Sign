export const env = {
  API_URL: import.meta.env.VITE_API_URL ?? '',
  SITE_URL: 'https://sign.nexgn.cloud',
  IS_PROD: import.meta.env.PROD,
}

if (!env.API_URL) {
  console.warn('VITE_API_URL is not set. API calls will go to the current origin.')
}