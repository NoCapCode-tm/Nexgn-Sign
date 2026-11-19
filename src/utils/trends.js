const DAY = 86_400_000

// % change: items in the last `days` vs the `days` before that.
// Returns null when there is no earlier period to compare (the card then hides the badge).
export function trendPercent(items, getDate, days = 30, now = Date.now()) {
  let current = 0
  let previous = 0
  for (const item of items) {
    const t = new Date(getDate(item)).getTime()
    if (Number.isNaN(t)) continue
    const age = now - t
    if (age <= days * DAY) current += 1
    else if (age <= days * 2 * DAY) previous += 1
  }
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}