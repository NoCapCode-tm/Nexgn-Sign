import { has2FA, is2FAVerified } from './twoFactor'

export function getPostLoginPath(user, { twoFactorVerified } = {}) {
  const userId = user?._id || user?.id || localStorage.getItem('nexgn_user_id')
  const verified = twoFactorVerified ?? is2FAVerified(user)

  if (has2FA(user) && !verified && userId) {
    return `/verify-2fa/${userId}`
  }

  if (user?.hasSeenBilling === false) {
    return '/pricing'
  }

  return '/dashboard'
}