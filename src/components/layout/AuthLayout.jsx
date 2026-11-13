import { useRef } from 'react'
import { Link, Outlet, useMatches } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import AuthShowcase from './AuthShowcase'
import LanguageSelect from '@/components/ui/LanguageSelect'
import { motion } from '@/utils/motion'
import styles from './AuthLayout.module.css'

gsap.registerPlugin(useGSAP)

export default function AuthLayout() {
  const root = useRef(null)

  // A route can opt into the small card with: handle: { variant: 'compact' }
  const matches = useMatches()
  const variant = [...matches].reverse().find((m) => m.handle?.variant)?.handle.variant ?? 'default'
  const compact = variant === 'compact'

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const mm = gsap.matchMedia()

      mm.add(
        {
          animate: '(prefers-reduced-motion: no-preference)',
          pointer: '(hover: hover) and (pointer: fine)',
          wide: '(min-width: 901px)',
        },
        (ctx) => {
          const { animate, pointer, wide } = ctx.conditions

          if (!animate) {
            motion.first = false
            return undefined
          }

          // One master timeline. Every tween has an explicit start AND end state,
          // and missing targets (e.g. the compact variant has no headline) are skipped.
          const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
              motion.first = false
            },
          })
          const add = (selector, from, to, at) => {
            const targets = q(selector)
            if (targets.length) tl.fromTo(targets, from, to, at)
          }

          add('[data-anim="bg"]', { scale: 1.14, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.8, ease: 'power2.out' }, 0)
          add(
            '[data-anim="card"]',
            { y: 56, scale: 0.96, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 1.2, ease: 'expo.out', clearProps: 'transform' },
            0.15,
          )
          add('[data-anim="media"]', { scale: 1.22 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.2)
          add('[data-anim="line"]', { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: 0.12, ease: 'expo.out' }, 0.7)
          add('[data-anim="glass"]', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, clearProps: 'transform' }, 0.55)
          add(
            '[data-anim="fade"]',
            { y: 14, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, clearProps: 'transform' },
            0.9,
          )

          // Slow "Ken Burns" drift on the panel photo (desktop only)
          if (wide) {
            gsap.to(q('[data-anim="kenburns"]'), {
              scale: 1.07,
              duration: 26,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
              delay: 2.2,
            })
          }

          // Mouse parallax (desktop pointer only)
          if (pointer) {
            const bg = q('[data-anim="bg"]')[0]
            const media = q('[data-anim="media"]')[0]

            if (bg && media) {
              const opts = { duration: 1.4, ease: 'power3.out' }
              const bgX = gsap.quickTo(bg, 'xPercent', opts)
              const bgY = gsap.quickTo(bg, 'yPercent', opts)
              const mdX = gsap.quickTo(media, 'xPercent', opts)
              const mdY = gsap.quickTo(media, 'yPercent', opts)

              const onMove = (e) => {
                const nx = e.clientX / window.innerWidth - 0.5
                const ny = e.clientY / window.innerHeight - 0.5
                bgX(nx * -3)
                bgY(ny * -3)
                mdX(nx * 3)
                mdY(ny * 3)
              }

              window.addEventListener('pointermove', onMove, { passive: true })
              return () => window.removeEventListener('pointermove', onMove)
            }
          }

          return undefined
        },
      )

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div className={styles.root} ref={root}>
      <div className={styles.bgWrap} aria-hidden="true">
        <div className={styles.bg} data-anim="bg" />
        <div className={styles.bgShade} />
      </div>

      <main className={styles.card} data-anim="card" data-variant={variant}>
        <AuthShowcase variant={variant} />

        <section className={styles.main}>
          {!compact && (
            <header className={styles.topbar}>
              <Link to="/login" className={styles.logo} data-anim="fade" aria-label="Nexgn">
                <img src="/brand/logo.svg" alt="Nexgn" />
              </Link>
              <div data-anim="fade">
                <LanguageSelect />
              </div>
            </header>
          )}

          <div className={styles.content}>
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  )
}