import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Sidebar from './Sidebar'
import { settingsService } from '@/services/settings.service'
import styles from './AppLayout.module.css'

const COLLAPSE_KEY = 'nexgn-sidebar-collapsed'

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true'
  } catch {
    return false
  }
}

export default function AppLayout() {
  const { pathname } = useLocation()

  const [collapsed, setCollapsed] = useState(readCollapsed)
  // The drawer belongs to the page it was opened on, so any navigation closes it
  const [openOn, setOpenOn] = useState(null)
  const navOpen = openOn === pathname
  // undefined = loading, null = unavailable (card hidden), object = loaded
  const [plan, setPlan] = useState(undefined)

  useEffect(() => {
    let active = true
    settingsService
      .plan()
      .then((data) => active && setPlan(data))
      .catch(() => active && setPlan(null))
    return () => {
      active = false
    }
  }, [])

  const openNav = useCallback(() => setOpenOn(pathname), [pathname])
  const closeNav = useCallback(() => setOpenOn(null), [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  // Drawer: Esc closes, page behind does not scroll
  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeNav()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [navOpen, closeNav])

  return (
    <div className={styles.shell} data-collapsed={collapsed}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <Sidebar plan={plan} collapsed={collapsed} onToggleCollapse={toggleCollapse} open={navOpen} onClose={closeNav} />

      <div className={styles.backdrop} data-open={navOpen} onClick={closeNav} aria-hidden="true" />

      <main className={styles.main} id="main">
        <Outlet context={{ openNav, closeNav }} />
      </main>

      {/* Menus and toasts render here so they inherit the shell's colours and scaling */}
      <div id="app-portal" style={{ display: 'contents' }} />
    </div>
  )
}