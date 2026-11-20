import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronUp, LogOut, UserRound, X } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import logoFull from '@/assets/Sidebar/logo.svg'
import logoCompact from '@/assets/Sidebar/Compact-logo.svg'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/config/navigation.config'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayName, getInitials } from '@/utils/formatters'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './Sidebar.module.css'

gsap.registerPlugin(useGSAP)

function Item({ to, href, label, Icon, end, secondary, onClose }) {
  const inner = (
    <>
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.label} data-label>
        {label}
      </span>
    </>
  )

  if (href) {
    return (
      <a className={clsx(styles.link, styles.link2)} href={href} target="_blank" rel="noreferrer noopener" data-tip={label} data-item>
        {inner}
      </a>
    )
  }
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      data-tip={label}
      data-item
      className={clsx(styles.link, secondary && styles.link2)}
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
  const pillRef = useRef(null)
  const userRef = useRef(null)
  const placed = useRef(false)
  const mounted = useRef(false)
  const [userOpen, setUserOpen] = useState(false)

  const name = getDisplayName(user)
  const pct = plan?.limit ? Math.min(100, Math.round((plan.used / plan.limit) * 100)) : 0

  // ---- The dark pill glides to the active item (and follows layout changes frame by frame) ----
  const placePill = useCallback((animate) => {
    const nav = navRef.current
    const pill = pillRef.current
    if (!nav || !pill) return
    const active = nav.querySelector('[aria-current="page"]')
    if (!active) {
      gsap.to(pill, { autoAlpha: 0, duration: 0.2 })
      return
    }
    const to = { x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight, autoAlpha: 1 }
    if (!animate || prefersReducedMotion()) gsap.set(pill, to)
    else gsap.to(pill, { ...to, duration: 0.55, ease: 'power3.inOut', overwrite: 'auto' })
  }, [])

  useGSAP(
    () => {
      placePill(placed.current)
      placed.current = true
    },
    { scope: navRef, dependencies: [pathname, open] },
  )

  useEffect(() => {
    const nav = navRef.current
    if (!nav || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => placePill(false))
    ro.observe(nav)
    return () => ro.disconnect()
  }, [placePill])

  // ---- Entrance on desktop: card slides in, then items stagger ----
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
          { x: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, delay: 0.25, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
        )
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  // ---- Drawer: items stagger in each time it opens ----
  useGSAP(
    () => {
      if (!open || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-item]',
        { x: -18, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.5, stagger: 0.045, delay: 0.12, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root, dependencies: [open] },
  )

  // ---- Collapse / expand choreography (the width itself is a CSS transition) ----
  useGSAP(
    () => {
      if (!mounted.current) {
        mounted.current = true
        return undefined
      }
      if (prefersReducedMotion()) return undefined
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        if (collapsed) {
          gsap.fromTo(
            '[data-mark], [data-item] svg',
            { scale: 0.7, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.5, stagger: 0.035, delay: 0.12, ease: 'back.out(2.2)', clearProps: 'transform,opacity,visibility' },
          )
        } else {
          gsap.fromTo(
            '[data-label], [data-plan], [data-who]',
            { x: -12, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.5, stagger: 0.035, delay: 0.2, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
          )
        }
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [collapsed] },
  )

  // ---- Plan usage bar fills in ----
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
        {/* Expanded: full logo + round toggle */}
        <Link to="/dashboard" className={styles.logo} aria-label="Nexgn dashboard" onClick={onClose}>
          <img src={logoFull} alt="Nexgn" />
        </Link>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggleCollapse}
          aria-label="Collapse sidebar"
          aria-expanded={!collapsed}
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        {/* Collapsed rail: compact logo, turns into an expand arrow on hover */}
        <button type="button" className={styles.markBtn} onClick={onToggleCollapse} aria-label="Expand sidebar" data-tip="Expand">
          <span className={styles.mark} data-mark aria-hidden="true">
            <img src={logoCompact} alt="" />
          </span>
          <ChevronRight className={styles.markArrow} aria-hidden="true" />
        </button>

        {/* Drawer (tablet and phone) */}
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close menu">
          <X aria-hidden="true" />
        </button>
      </div>

      <nav className={styles.nav} ref={navRef}>
        <span className={styles.indicator} ref={pillRef} aria-hidden="true" />
        {PRIMARY_NAV.map(({ to, label, Icon }) => (
          <Item key={to} to={to} end={to === '/dashboard'} label={label} Icon={Icon} onClose={onClose} />
        ))}
      </nav>

      <div className={styles.grow} />

      {plan ? (
        <div className={styles.plan} data-plan>
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
      ) : plan === undefined ? (
        <div className={clsx(styles.plan, styles.planSkel)} aria-hidden="true" />
      ) : null}

      <div className={styles.secondary}>
        {SECONDARY_NAV.map((item) => (
          <Item key={item.label} {...item} secondary onClose={onClose} />
        ))}
      </div>

      <div className={styles.userWrap} ref={userRef} data-open={userOpen}>
        <button type="button" className={styles.user} aria-haspopup="menu" aria-expanded={userOpen} onClick={() => setUserOpen((o) => !o)}>
          <span className={styles.avatar}>{getInitials(name)}</span>
          <span className={styles.who} data-who>
            <span className={styles.name}>{name}</span>
            <span className={styles.mail}>{user?.email}</span>
          </span>
          <ChevronUp className={styles.chev} aria-hidden="true" />
        </button>

        <div className={styles.menu} role="menu">
          <Link
            to="/settings/profile"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              setUserOpen(false)
              onClose()
            }}
          >
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