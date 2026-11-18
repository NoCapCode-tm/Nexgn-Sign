import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './LoadingOverlay.module.css'

gsap.registerPlugin(useGSAP)

export default function LoadingOverlay({ message = 'Loading...' }) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return
      gsap.fromTo(
        root.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }
      )
    },
    { scope: root }
  )

  return createPortal(
    <div className={styles.overlay} ref={root} role="status" aria-live="polite">
      <div className={styles.backdrop} />
      <div className={styles.content}>
        <div className={styles.loader} />
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>,
    document.getElementById('app-portal') ?? document.body
  )
}