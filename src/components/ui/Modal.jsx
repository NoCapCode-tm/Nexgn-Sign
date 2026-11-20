import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import styles from './Modal.module.css'

gsap.registerPlugin(useGSAP)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * open: show/hide (the exit animation finishes before it unmounts)
 * size: 'md' (form) | 'sm' (details)
 * Tag children with data-modal-in to have them stagger in.
 */
export default function Modal({
  open,
  onClose,
  title,
  headerExtra,
  footer,
  children,
  size = 'md',
  dismissible = true,
  className,
}) {
  const root = useRef(null)
  const panel = useRef(null)
  const titleId = useId()
  const [rendered, setRendered] = useState(open)
  if (open && !rendered) setRendered(true)

  // ---- Enter / exit choreography (bottom sheet on phones) ----
  useGSAP(
    () => {
      if (!rendered) return undefined
      const mm = gsap.matchMedia()
      mm.add(
        {
          all: '(min-width: 0px)',
          sheet: '(max-width: 560px)',
          reduce: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { sheet, reduce } = ctx.conditions
          const backdrop = '[data-modal-backdrop]'
          const card = '[data-modal-panel]'

          if (open) {
            if (reduce) return
            gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' })
            gsap.fromTo(
              card,
              sheet ? { yPercent: 100 } : { y: 28, scale: 0.97, autoAlpha: 0 },
              sheet
                ? { yPercent: 0, duration: 0.55, ease: 'expo.out', clearProps: 'transform' }
                : { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: 'expo.out', clearProps: 'transform,opacity,visibility' },
            )
            if (root.current?.querySelector('[data-modal-in]')) {
              gsap.fromTo(
                '[data-modal-in]',
                { y: 12, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.045, delay: 0.14, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
              )
            }
          } else {
            const done = () => setRendered(false)
            if (reduce) {
              gsap.delayedCall(0, done)
              return
            }
            gsap.to(backdrop, { autoAlpha: 0, duration: 0.22, ease: 'power2.in' })
            gsap.to(
              card,
              sheet
                ? { yPercent: 100, duration: 0.3, ease: 'power3.in', onComplete: done }
                : { y: 14, scale: 0.98, autoAlpha: 0, duration: 0.24, ease: 'power2.in', onComplete: done },
            )
          }
        },
      )
      return () => mm.revert()
    },
    { scope: root, dependencies: [open, rendered] },
  )

  // ---- Lock page scroll while the modal is on screen ----
  useEffect(() => {
    if (!rendered) return undefined
    const { body, documentElement } = document
    const prevOverflow = body.style.overflow
    const prevPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPadding
    }
  }, [rendered])

  // ---- Focus: move in on open, restore on close ----
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const timer = window.setTimeout(() => {
      const el = panel.current
      if (!el) return
      const target = el.querySelector('[data-autofocus]') ?? el
      target.focus({ preventScroll: true })
    }, 80)
    return () => {
      window.clearTimeout(timer)
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [open])

  // ---- Esc closes, Tab stays inside ----
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.current.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismissible, onClose])

  if (!rendered) return null

  return createPortal(
    <div className={styles.root} ref={root}>
      <div className={styles.backdrop} data-modal-backdrop aria-hidden="true" />

      <div
        className={styles.frame}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && dismissible) onClose?.()
        }}
      >
        <div
          ref={panel}
          className={clsx(styles.panel, styles[size], className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-modal-panel
        >
          <div className={styles.grab} aria-hidden="true" />

          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <div className={styles.side}>
              {headerExtra}
              <button type="button" className={styles.close} onClick={onClose} disabled={!dismissible} aria-label="Close">
                <X aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className={styles.body}>{children}</div>

          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      </div>
    </div>,
    document.getElementById('app-portal') ?? document.body,
  )
}