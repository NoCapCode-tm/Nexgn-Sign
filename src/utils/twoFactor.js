const KEY = 'nexgn_2fa_verified'

// True if a user/response object says 2FA is enabled
export function has2FA(obj) {
  if (!obj || typeof obj !== 'object') return false
  return [
    obj.requires2FA,
    obj.twoFAenabled,
    obj.twoFaEnabled,
    obj.twoFAEnabled,
    obj.twoFactorEnabled,
    obj.is2FAEnabled,
    obj.security?.twoFAenabled,
  ].some((v) => v === true)
}

export function mark2FAVerified(id) {
  try {
    if (id) localStorage.setItem(KEY, String(id))
  } catch {
    /* ignore */
  }
}

export function clear2FAVerified() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function is2FAVerified(user) {
  try {
    const stored = localStorage.getItem(KEY)
    if (!stored) return false
    return [user?._id, user?.id].filter(Boolean).some((id) => String(id) === stored)
  } catch {
    return false
  }
}