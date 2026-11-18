import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronUp, LogOut, PanelLeft, UserRound, X } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import { PRIMARY_NAV, SECONDARY_NAV } from '@/config/navigation.config'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayName, getInitials } from '@/utils/formatters'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './Sidebar.module.css'

gsap.registerPlugin(useGSAP)

function SecondaryItem({ item, collapsed, onClose }) {
  const { to, href, label, Icon } = item
  const tip = collapsed ? label : undefined
  const inner = (
    <>
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </>
  )

  if (href) {
    return (
      <a className={clsx(styles.link, styles.link2)} href={href} target="_blank" rel="noreferrer noopener" title={tip} data-item>
        {inner}
      </a>
    )
  }
  return (
    <NavLink
      to={to}
      onClick={onClose}
      title={tip}
      data-item
      className={({ isActive }) => clsx(styles.link, styles.link2, isActive && styles.link2On)}
    >
      {inner}
    </NavLink>
  )
}

export default function Sidebar({ plan, collapsed, onToggleCollapse, open, onClose }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const root = useRef(null)
  const navRef = useRef(null)
  const indicatorRef = useRef(null)
  const placed = useRef(false)
  const userRef = useRef(null)
  const [userOpen, setUserOpen] = useState(false)

  const name = getDisplayName(user)
  const pct = plan?.limit ? Math.min(100, Math.round((plan.used / plan.limit) * 100)) : 0

  // Entrance (desktop): the card slides in, then the items stagger
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          root.current,
          { x: -28, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', clearProps: 'transform,opacity,visibility' },
        )
        gsap.fromTo(
          '[data-item]',
          { x: -14, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.6,
            stagger: 0.05,
            delay: 0.25,
            ease: 'power3.out',
            clearProps: 'transform,opacity,visibility',
          },
        )
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  // Drawer: items stagger in each time it opens
  useGSAP(
    () => {
      if (!open || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-item]',
        { x: -18, autoAlpha: 0 },
        {
          x: 0,
          autoAlpha: 1,
          duration: 0.5,
          stagger: 0.045,
          delay: 0.12,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        },
      )
    },
    { scope: root, dependencies: [open] },
  )

  // The dark pill glides to the active item
  useGSAP(
    () => {
      const nav = navRef.current
      const pill = indicatorRef.current
      if (!nav || !pill) return
      const active = nav.querySelector('[aria-current="page"]')
      if (!active) {
        gsap.to(pill, { autoAlpha: 0, duration: 0.2 })
        return
      }
      const to = { y: active.offsetTop, height: active.offsetHeight, autoAlpha: 1 }
      if (!placed.current || prefersReducedMotion()) {
        gsap.set(pill, to)
        placed.current = true
      } else {
        gsap.to(pill, { ...to, duration: 0.55, ease: 'power3.inOut' })
      }
    },
    { scope: navRef, dependencies: [pathname, collapsed, open] },
  )

  // Plan usage bar fills in
  useGSAP(
    () => {
      if (!pct || prefersReducedMotion()) return
      gsap.fromTo('[data-bar]', { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'power3.out', delay: 0.4 })
    },
    { scope: root, dependencies: [pct] },
  )

  useEffect(() => {
    if (!userOpen) return undefined
    const onDown = (e) => {
      if (!userRef.current?.contains(e.target)) setUserOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setUserOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [userOpen])

  return (
    <aside className={styles.sidebar} ref={root} data-collapsed={collapsed} data-open={open} aria-label="Main navigation">
      <div className={styles.head}>
        <Link to="/dashboard" className={styles.logo} aria-label="Nexgn dashboard" onClick={onClose}>
          <img src="/brand/logo.svg" alt="Nexgn" />
        </Link>

        <button
          type="button"
          className={styles.toggle}
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
        >
          <PanelLeft aria-hidden="true" />
        </button>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close menu">
          <X aria-hidden="true" />
        </button>
      </div>

      <nav className={styles.nav} ref={navRef}>
        <span className={styles.indicator} ref={indicatorRef} aria-hidden="true" />
        {PRIMARY_NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={styles.link}
            onClick={onClose}
            title={collapsed ? label : undefined}
            data-item
          >
            <Icon className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.grow} />

      {plan ? (
        <div className={styles.plan}>
          <div className={styles.planTop}>
            <strong className={styles.planName}>{plan.name} plan</strong>
            <span className={styles.planCount}>
              {plan.used} / {plan.limit}
            </span>
          </div>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label="Envelopes used this month"
            aria-valuemin={0}
            aria-valuemax={plan.limit}
            aria-valuenow={plan.used}
          >
            <i style={{ width: `${pct}%` }} data-bar />
          </div>
          <p className={styles.planNote}>Envelopes used this month.</p>
          <Link to="/pricing" className={styles.upgrade} onClick={onClose}>
            Upgrade plan
          </Link>
        </div>
      ) : (
        <div className={clsx(styles.plan, styles.planSkel)} aria-hidden="true" />
      )}

      <div className={styles.secondary}>
        {SECONDARY_NAV.map((item) => (
          <SecondaryItem key={item.label} item={item} collapsed={collapsed} onClose={onClose} />
        ))}
      </div>

      <div className={styles.userWrap} ref={userRef} data-open={userOpen}>
        <button
          type="button"
          className={styles.user}
          aria-haspopup="menu"
          aria-expanded={userOpen}
          onClick={() => setUserOpen((o) => !o)}
        >
          <span className={styles.avatar}>{getInitials(name)}</span>
          <span className={styles.who}>
            <span className={styles.name}>{name}</span>
            <span className={styles.mail}>{user?.email}</span>
          </span>
          <ChevronUp className={styles.chev} aria-hidden="true" />
        </button>

        <div className={styles.menu} role="menu">
          <Link to="/settings/profile" role="menuitem" className={styles.menuItem} onClick={() => { setUserOpen(false); onClose() }}>
            <UserRound aria-hidden="true" /> Profile
          </Link>
          <span className={styles.menuSep} aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            className={clsx(styles.menuItem, styles.menuDanger)}
            onClick={() => {
              setUserOpen(false)
              logout()
            }}
          >
            <LogOut aria-hidden="true" /> Log out
          </button>
        </div>
      </div>
    </aside>
  )
}