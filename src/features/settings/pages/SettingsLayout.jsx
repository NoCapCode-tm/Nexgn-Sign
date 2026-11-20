import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronRight } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import Topbar from '@/components/layout/Topbar'
import Toast from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayName } from '@/utils/formatters'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './SettingsLayout.module.css'

gsap.registerPlugin(useGSAP)

const TABS = [
  { to: 'account', label: 'Account' },
  { to: 'security', label: 'Security' },
  { to: 'team', label: 'Team Management' },
  { to: 'notifications', label: 'Notification' },
  { to: 'billing', label: 'Billing' },
  { to: 'integrations', label: 'Integration' },
  { to: 'audit-logs', label: 'Audit Flow' },
]

const humanize = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function SettingsLayout() {
  const root = useRef(null)
  const tabsRef = useRef(null)
  const pillRef = useRef(null)
  const placed = useRef(false)
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [toast, setToast] = useState(null)

  // Sections call notify('Saved') from their Outlet context
  const notify = useCallback((text, tone = 'ok') => setToast({ id: Date.now(), text, tone }), [])
  const clearToast = useCallback(() => setToast(null), [])

  const slug = pathname.split('/')[2] ?? ''
  const crumb = TABS.find((t) => t.to === slug)?.label ?? (slug ? humanize(slug) : 'Account')
  const firstName = getDisplayName(user).split(' ')[0]

  // The dark pill glides to the active tab (and the tab row scrolls it into view on small screens)
  const placePill = useCallback((animate) => {
    const tabs = tabsRef.current
    const pill = pillRef.current
    if (!tabs || !pill) return
    const active = tabs.querySelector('[aria-current="page"]')
    if (!active) {
      gsap.to(pill, { autoAlpha: 0, duration: 0.2 })
      return
    }
    const smooth = animate && !prefersReducedMotion()
    const to = { x: active.offsetLeft, width: active.offsetWidth, autoAlpha: 1 }
    if (smooth) gsap.to(pill, { ...to, duration: 0.5, ease: 'power3.inOut', overwrite: 'auto' })
    else gsap.set(pill, to)

    if (tabs.scrollWidth > tabs.clientWidth + 1) {
      const left = active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2
      tabs.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  useGSAP(
    () => {
      placePill(placed.current)
      placed.current = true
    },
    { scope: tabsRef, dependencies: [pathname] },
  )

  useEffect(() => {
    const tabs = tabsRef.current
    if (!tabs || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => placePill(false))
    ro.observe(tabs)
    return () => ro.disconnect()
  }, [placePill])

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-enter]',
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.08, delay: 0.15, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root },
  )

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>{`${crumb} | Settings | Nexgn`}</title>
      </Helmet>

      <Topbar
        title={`Hello, ${firstName}`}
        subtitle={
          <span className={styles.crumb}>
            Settings <ChevronRight aria-hidden="true" /> {crumb}
          </span>
        }
      />

      <section className={styles.card} data-enter aria-labelledby="settings-title">
        <header className={styles.head}>
          <h2 id="settings-title" className={styles.title}>
            Settings
          </h2>
          <p className={styles.sub}>Manage your account preference and configuration</p>
        </header>

        <nav className={styles.tabsWrap} aria-label="Settings sections">
          <div className={styles.tabs} ref={tabsRef}>
            <span className={styles.pill} ref={pillRef} aria-hidden="true" />
            {TABS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={styles.tab}>
                <span className={styles.tabLabel}>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className={styles.content}>
          <Outlet context={{ notify }} />
        </div>
      </section>

      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}