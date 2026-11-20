import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './LoadingOverlay.module.css'

gsap.registerPlugin(useGSAP)

export default function LoadingOverlay({ message = 'Loading…' }) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return
      gsap.fromTo(root.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
      gsap.fromTo(
        '[data-loader-content]',
        { y: 10, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.45, delay: 0.08, ease: 'power3.out', clearProps: 'transform' },
      )
    },
    { scope: root },
  )

  return createPortal(
    <div className={styles.overlay} ref={root} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.backdrop} />
      <div className={styles.content} data-loader-content>
        <div className={styles.loader} aria-hidden="true" />
        {message ? <p className={styles.message}>{message}</p> : <span className={styles.srOnly}>Loading</span>}
      </div>
    </div>,
    document.getElementById('app-portal') ?? document.body,
  )
}