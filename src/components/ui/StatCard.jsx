import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import { prefersReducedMotion } from '@/utils/motion'
import styles from './StatCard.module.css'

gsap.registerPlugin(useGSAP)

const trendText = (n) => `${n < 0 ? '-' : '+'}${String(Math.abs(Math.round(n))).padStart(2, '0')}%`

/** Kept so existing imports keep working. The notched shape is now drawn per card (see useNotch). */
export function StatCardDefs() {
  return null
}

// Draws the notched outline in real pixels (sized from the card's em), so the corners stay round at any width
function useNotch(cardRef, bodyRef) {
  useLayoutEffect(() => {
    const card = cardRef.current
    const body = bodyRef.current
    if (!card || !body) return undefined

    const draw = () => {
      const W = card.offsetWidth
      const H = card.offsetHeight
      if (!W || !H) return
      const u = parseFloat(getComputedStyle(card).fontSize) || 14
      const r = 1.2 * u // corner radius
      const nx = Math.max(r * 2, W - 7 * u) // where the top edge turns into the notch
      const ny = 3.6 * u // notch depth
      const f = (n) => n.toFixed(2)
      body.style.clipPath =
        `path('M${f(r)} 0 H${f(nx)} ` +
        `C${f(nx + 1.02 * u)} 0 ${f(nx + 1.11 * u)} ${f(ny)} ${f(nx + 2.32 * u)} ${f(ny)} ` +
        `H${f(W - r)} Q${f(W)} ${f(ny)} ${f(W)} ${f(ny + r)} ` +
        `V${f(H - r)} Q${f(W)} ${f(H)} ${f(W - r)} ${f(H)} ` +
        `H${f(r)} Q0 ${f(H)} 0 ${f(H - r)} V${f(r)} Q0 0 ${f(r)} 0 Z')`
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(card)
    return () => ro.disconnect()
  }, [cardRef, bodyRef])
}

export default function StatCard({ label, value, trend, to, tone = 'total', Icon, loading = false }) {
  const root = useRef(null)
  const bodyRef = useRef(null)
  const numRef = useRef(null)
  const shown = useRef(0)
  const timeline = useRef(null)
  const [active, setActive] = useState(false)

  useNotch(root, bodyRef)

  // Hover choreography: tab floods first, then the body, while every element reacts
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const t = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
        t.to('[data-fill-tab]', { clipPath: 'circle(160% at 100% 0%)', duration: 0.4, ease: 'power2.out' }, 0)
          .to('[data-fill-body]', { clipPath: 'circle(160% at 100% 0%)', duration: 0.7, ease: 'power3.inOut' }, 0.1)
          .to(
            '[data-icon]',
            { scale: 1.2, backgroundColor: '#ffffff', boxShadow: '0 0.6em 1.1em -0.5em rgba(40,30,10,0.35)', duration: 0.5, ease: 'back.out(2)' },
            0.18,
          )
          .fromTo('[data-icon-glyph]', { rotate: -14 }, { rotate: 0, duration: 0.6, ease: 'back.out(3)' }, 0.18)
          .to('[data-num]', { scale: 1.1, yPercent: -4, transformOrigin: '0% 100%', duration: 0.5 }, 0.2)
          .to('[data-trend]', { scale: 1.08, transformOrigin: '100% 50%', duration: 0.4 }, 0.2)
          .to('[data-arrow]', { xPercent: 14, yPercent: -14, duration: 0.45, ease: 'back.out(2.5)' }, 0.25)
          .to(root.current, { yPercent: -3, duration: 0.5 }, 0)
        timeline.current = t
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  // Count-up (and count to the new value when it changes)
  useGSAP(
    () => {
      const el = numRef.current
      if (!el || loading || value == null) return
      if (prefersReducedMotion()) {
        el.textContent = String(value)
        shown.current = value
        return
      }
      const counter = { v: shown.current }
      gsap.to(counter, {
        v: value,
        duration: 1.1,
        ease: 'power2.out',
        delay: shown.current ? 0 : 0.35,
        onUpdate: () => {
          el.textContent = String(Math.round(counter.v))
          shown.current = counter.v
        },
      })
    },
    { scope: root, dependencies: [value, loading] },
  )

  const enter = () => {
    setActive(true)
    timeline.current?.timeScale(1).play()
  }
  const leave = () => {
    setActive(false)
    timeline.current?.timeScale(1.5).reverse()
  }

  const positive = (trend ?? 0) >= 0
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight

  return (
    <Link
      ref={root}
      to={to}
      className={clsx(styles.card, styles[tone])}
      data-active={active}
      data-loading={loading}
      aria-label={loading ? label : `${label}: ${value}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') enter()
      }}
      onPointerLeave={leave}
      onFocus={(e) => {
        if (e.currentTarget.matches(':focus-visible')) enter()
      }}
      onBlur={leave}
    >
      <span className={styles.tab}>
        <span className={styles.fillTab} data-fill-tab aria-hidden="true" />
        {trend != null && (
          <span className={clsx(styles.trend, !positive && styles.down)} data-trend>
            <TrendIcon className={styles.arrow} data-arrow aria-hidden="true" />
            {trendText(trend)}
          </span>
        )}
      </span>

      <span className={styles.shadow}>
        <span className={styles.body} ref={bodyRef}>
          <span className={styles.fillBody} data-fill-body aria-hidden="true" />
          <span className={styles.icon} data-icon>
            <Icon className={styles.glyph} data-icon-glyph aria-hidden="true" />
          </span>
          <span className={styles.value}>
            <span ref={numRef} className={styles.num} data-num aria-hidden="true" />
          </span>
          <span className={styles.label}>{label}</span>
        </span>
      </span>
    </Link>
  )
}