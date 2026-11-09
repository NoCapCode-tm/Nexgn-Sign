import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext(null)

const STORAGE_KEY = 'nexgn-theme'
const MEDIA = '(prefers-color-scheme: dark)'

const readPreference = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}
const readSystem = () => (window.matchMedia(MEDIA).matches ? 'dark' : 'light')

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference)
  const [system, setSystem] = useState(readSystem)

  useEffect(() => {
    const mq = window.matchMedia(MEDIA)
    const onChange = (e) => setSystem(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = preference === 'system' ? system : preference

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const setTheme = useCallback((next) => {
    setPreference(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage blocked, keep in memory */
    }
  }, [])

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  const value = useMemo(
    () => ({ theme, preference, setTheme, toggleTheme }),
    [theme, preference, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}