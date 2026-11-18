import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import { prefersReducedMotion } from '@/utils/motion'
import styles from './Toast.module.css'

gsap.registerPlugin(useGSAP)

// toast: { id, text, tone: 'ok' | 'error' } | null
export default function Toast({ toast, onDone }) {
  const ref = useRef(null)

  useGSAP(
    () => {
      if (!toast || !ref.current || prefersReducedMotion()) return
      gsap.fromTo(ref.current, { y: 24, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' })
    },
    { scope: ref, dependencies: [toast] },
  )

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => {
      if (!ref.current || prefersReducedMotion()) {
        onDone()
        return
      }
      gsap.to(ref.current, { y: 12, opacity: 0, duration: 0.3, onComplete: onDone })
    }, 3400)
    return () => clearTimeout(timer)
  }, [toast, onDone])

  if (!toast) return null
  const Icon = toast.tone === 'error' ? CircleAlert : CircleCheck

  return createPortal(
    <div ref={ref} className={clsx(styles.toast, toast.tone === 'error' && styles.error)} role="status" aria-live="polite">
      <Icon aria-hidden="true" />
      <span>{toast.text}</span>
    </div>,
    document.getElementById('app-portal') ?? document.body,
  )
}