import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShieldCheck, Users, Zap } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import { motion, prefersReducedMotion } from '@/utils/motion'
import styles from './AuthShowcase.module.css'

gsap.registerPlugin(useGSAP)

const SLIDES = [
  { Icon: Zap, title: 'Fast & Simple', lines: ['Sign documents', 'in under 2 minutes'] },
  { Icon: ShieldCheck, title: 'Secure by default', lines: ['Encrypted end to end', 'with a full audit trail'] },
  { Icon: Users, title: 'Built for teams', lines: ['Invite, assign roles', 'and track every signature'] },
]

const AUTOPLAY_MS = 6500

/* ---------------- Compact variant: centred message only ---------------- */
function RecoverPanel() {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-recover]',
        { y: 18, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'transform',
          delay: motion.first ? 0.9 : 0.25,
        },
      )
    },
    { scope: root },
  )

  return (
    <div className={styles.recover} ref={root}>
      <h2 className={styles.recoverTitle} data-recover>
        Let&rsquo;s get you back.
      </h2>
      <p className={styles.recoverText} data-recover>
        Forgot your password? No worries, we&rsquo;ll help you regain access to your account.
      </p>
    </div>
  )
}

/* ---------------- Default variant: headline, glass card, carousel ---------------- */
function SlidesPanel() {
  const { pathname } = useLocation()
  const root = useRef(null)
  const indexRef = useRef(0)
  const dirRef = useRef(1)
  const busy = useRef(false)
  const goRef = useRef(() => {})
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const cta = pathname.startsWith('/login')
    ? { to: '/signup', label: 'Sign-up' }
    : pathname.startsWith('/signup')
      ? { to: '/login', label: 'Sign-in' }
      : null

  // When this panel appears after the compact variant (e.g. "Back to login"),
  // replay the entrance. On first page load the layout's own intro handles it.
  useGSAP(
    () => {
      if (motion.first || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-anim="line"]',
        { yPercent: 115 },
        { yPercent: 0, duration: 1, stagger: 0.12, ease: 'expo.out', delay: 0.3 },
      )
      gsap.fromTo(
        '[data-anim="glass"], [data-anim="fade"]',
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.5, clearProps: 'transform' },
      )
    },
    { scope: root },
  )

  // Slide-in whenever the slide changes (and once on mount)
  const { contextSafe } = useGSAP(
    () => {
      if (prefersReducedMotion()) {
        busy.current = false
        return
      }
      const dir = dirRef.current
      gsap.fromTo(
        '[data-slide-part]',
        { y: 18 * dir, autoAlpha: 0, filter: 'blur(6px)' },
        {
          y: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          delay: motion.first ? 1.3 : 0,
          clearProps: 'filter',
          onComplete: () => {
            busy.current = false
          },
        },
      )
    },
    { scope: root, dependencies: [index] },
  )

  const go = contextSafe((dir) => {
    if (busy.current) return
    const next = (indexRef.current + dir + SLIDES.length) % SLIDES.length
    dirRef.current = dir

    if (prefersReducedMotion()) {
      indexRef.current = next
      setIndex(next)
      return
    }

    busy.current = true
    gsap.to('[data-slide-part]', {
      y: -14 * dir,
      autoAlpha: 0,
      filter: 'blur(6px)',
      duration: 0.35,
      stagger: 0.04,
      ease: 'power2.in',
      onComplete: () => {
        indexRef.current = next
        setIndex(next)
      },
    })
  })

  useEffect(() => {
    goRef.current = go
  })

  // Autoplay (pauses on hover/focus and when the tab is hidden)
  useEffect(() => {
    if (paused) return undefined
    const id = window.setInterval(() => {
      if (!document.hidden) goRef.current(1)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [index, paused])

  const { Icon, title, lines } = SLIDES[index]

  return (
    <div className={styles.panel} ref={root}>
      {/* Desktop glass shape: rounded corners + slanted right edge */}
      <svg className={styles.clipDefs} width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="nexgn-glass-clip" clipPathUnits="objectBoundingBox">
            <path d="M0.0458,0 H0.953 Q1,0 0.9976,0.035 L0.9334,0.965 Q0.931,1 0.885,1 H0.0458 Q0,1 0,0.965 V0.035 Q0,0 0.0458,0 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className={styles.glassBg} data-anim="glass" aria-hidden="true" />

      {cta && (
        <Link to={cta.to} className={styles.cta} data-anim="fade">
          {cta.label}
        </Link>
      )}

      <div className={styles.glass}>
        <div className={styles.copy}>
          <h2 className={styles.headline}>
            <span className={styles.line}>
              <span className={styles.lineInner} data-anim="line">Documents signed.</span>
            </span>
            <span className={styles.line}>
              <span className={`${styles.lineInner} ${styles.accent}`} data-anim="line">Trust delivered.</span>
            </span>
          </h2>
          <p className={styles.lead} data-anim="fade">
            Nexgn brings speed, clarity &amp; trust to every signature. Built for modern teams and important agreements.
          </p>
        </div>

        <div
          className={styles.slider}
          role="group"
          aria-roledescription="carousel"
          aria-label="Highlights"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className={styles.slide}>
            <div className={styles.slideHead} data-slide-part>
              <h3 className={styles.slideTitle}>{title}</h3>
              <Icon className={styles.slideIcon} strokeWidth={1.1} aria-hidden="true" />
            </div>
            <p className={styles.slideText} data-slide-part>
              {lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </p>
          </div>

          <div className={styles.controls} data-anim="fade">
            <button type="button" className={styles.arrow} onClick={() => go(-1)} aria-label="Previous slide">
              <ChevronLeft />
            </button>
            <button type="button" className={styles.arrow} onClick={() => go(1)} aria-label="Next slide">
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Shell: photo + overlay stay mounted across variants ---------------- */
export default function AuthShowcase({ variant = 'default' }) {
  return (
    <aside className={styles.showcase} data-variant={variant}>
      <div className={styles.media} data-anim="media" aria-hidden="true">
        <img
          className={styles.photo}
          data-anim="kenburns"
          src="/brand/auth-bg.png"
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable="false"
        />
      </div>
      <div className={styles.overlay} aria-hidden="true" />

      {variant === 'compact' ? <RecoverPanel /> : <SlidesPanel />}
    </aside>
  )
}