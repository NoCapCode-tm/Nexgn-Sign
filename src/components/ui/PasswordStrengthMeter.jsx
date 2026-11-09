const COMMON = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'welcome', 'admin', 'iloveyou', 'nexgn']

export function getPasswordChecks(pw = '') {
  return {
    length: pw.length >= 8,
    mixedCase: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  }
}

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']

// score: 0 = empty, 1 Weak, 2 Fair, 3 Good, 4 Strong
export function getPasswordStrength(pw = '') {
  const checks = getPasswordChecks(pw)
  if (!pw) return { score: 0, label: '', checks }

  let points = Object.values(checks).filter(Boolean).length
  if (pw.length >= 12) points += 1
  if (pw.length < 8) points = Math.min(points, 1)
  if (COMMON.some((w) => pw.toLowerCase().includes(w))) points = Math.min(points, 1)
  if (/(.)\1{3,}/.test(pw)) points -= 1

  const score = Math.max(1, Math.min(points, 4))
  return { score, label: LABELS[score], checks }
}

// Use this to allow or block the Sign-up / Set-new-password submit button
export const isPasswordStrongEnough = (pw) => pw.length >= 8 && getPasswordStrength(pw).score >= 3