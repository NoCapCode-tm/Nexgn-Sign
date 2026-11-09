import { useRef } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import AuthShowcase from './AuthShowcase'
import LanguageSelect from '@/components/ui/LanguageSelect'
import { motion } from '@/utils/motion'
import styles from './AuthLayout.module.css'

gsap.registerPlugin(useGSAP)

export default function AuthLayout() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(
        {
          animate: '(prefers-reduced-motion: no-preference)',
          pointer: '(hover: hover) and (pointer: fine)',
        },
        (ctx) => {
          const { animate, pointer } = ctx.conditions

          if (!animate) {
            motion.first = false
            return
          }

          // ---- Intro timeline ----
          const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
              motion.first = false
            },
          })

          tl.from('[data-anim="bg"]', { scale: 1.14, autoAlpha: 0, duration: 1.8, ease: 'power2.out' }, 0)
            .from('[data-anim="card"]', { y: 56, autoAlpha: 0, scale: 0.96, duration: 1.2, ease: 'expo.out' }, 0.15)
            .from('[data-anim="media"]', { scale: 1.22, duration: 2.2, ease: 'expo.out' }, 0.2)
            .from('[data-anim="line"]', { yPercent: 115, duration: 1, stagger: 0.12, ease: 'expo.out' }, 0.7)
            .from('[data-anim="fade"]', { y: 14, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.9)

          // ---- Mouse parallax (desktop only) ----
          if (pointer) {
            const q = gsap.utils.selector(root)
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

      <p className={styles.mobileTag} aria-hidden="true">
        Documents signed.
        <span>Trust delivered.</span>
      </p>

      <main className={styles.card} data-anim="card">
        <AuthShowcase />

        <section className={styles.main}>
          <header className={styles.topbar}>
            <Link to="/login" className={styles.logo} data-anim="fade" aria-label="Nexgn Sign">
              <img src="/brand/logo.svg" alt="Nexgn" />
            </Link>
            <div data-anim="fade">
              <LanguageSelect />
            </div>
          </header>

          <div className={styles.content}>
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  )
}