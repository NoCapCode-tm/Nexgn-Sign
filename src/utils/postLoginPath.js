// Where to send the user after login: the page they were trying to open, or the dashboard.
export function getPostLoginPath(location) {
  const from = location?.state?.from
  if (from?.pathname && !['/login', '/signup'].includes(from.pathname)) {
    return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
  }
  return '/dashboard'
}