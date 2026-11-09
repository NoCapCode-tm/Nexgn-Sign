import { createContext, useEffect, useMemo } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext(null)

// Light mode only for now. To bring dark mode back, restore the previous
// version of this file; the [data-theme='dark'] CSS is still in place.
const noop = () => {}

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
    try {
      localStorage.removeItem('nexgn-theme') // drop any saved "dark" or "system"
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ theme: 'light', preference: 'light', setTheme: noop, toggleTheme: noop }),
    [],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}