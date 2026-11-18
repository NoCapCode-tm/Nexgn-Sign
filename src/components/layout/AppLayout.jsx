import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Sidebar from './Sidebar'
import { settingsService } from '@/services/settings.service'
import styles from './AppLayout.module.css'

const COLLAPSE_KEY = 'nexgn-sidebar-collapsed'

export default function AppLayout() {
  const { pathname } = useLocation()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [navOpen, setNavOpen] = useState(false)
  const [plan, setPlan] = useState(null)

  // Close mobile drawer on route change
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  // Load plan usage for the Sidebar progress bar
  useEffect(() => {
    let mounted = true
    settingsService
      .plan()
      .then((data) => {
        if (mounted) setPlan(data)
      })
      .catch(() => {
        if (mounted) setPlan({ name: 'Free', used: 0, limit: 19 })
      })
    return () => {
      mounted = false
    }
  }, [])

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

  const openNav = useCallback(() => setNavOpen(true), [])
  const closeNav = useCallback(() => setNavOpen(false), [])

  return (
    <div className={styles.shell} data-collapsed={collapsed}>
      <Sidebar
        plan={plan}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        open={navOpen}
        onClose={closeNav}
      />

      {navOpen && (
        <div
          className={styles.backdrop}
          onClick={closeNav}
          aria-hidden="true"
        />
      )}

      <main className={styles.main}>
        <Outlet context={{ openNav, closeNav }} />
      </main>
    </div>
  )
}