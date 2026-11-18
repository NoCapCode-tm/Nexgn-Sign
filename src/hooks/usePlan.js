import { useEffect, useState } from 'react'
import { settingsService } from '@/services/settings.service'

// null until loaded
export function usePlan() {
  const [plan, setPlan] = useState(null)
  useEffect(() => {
    let active = true
    settingsService
      .plan()
      .then((p) => active && setPlan(p))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return plan
}