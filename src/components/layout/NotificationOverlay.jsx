import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BellOff, X } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import styles from './NotificationOverlay.module.css'

gsap.registerPlugin(useGSAP)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function formatTime(value) {
  if (!value) return 'Now'
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(value)) return value

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Now'

  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (diffSec < 60) return 'Now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function normalizeItem(raw = {}, index) {
  return {
    id: String(raw.id ?? raw._id ?? index),
    message: raw.message ?? raw.text ?? raw.body ?? raw.description ?? raw.title ?? '',
    time: formatTime(raw.time ?? raw.createdAt ?? raw.timestamp),
    read: Boolean(raw.read ?? raw.isRead),
  }
}

export default function NotificationOverlay({
  open,
  onClose,
  notifications = [],
  loading = false,
  onMarkAsRead,
  onDelete,
  className,
}) {
  const root = useRef(null)
  const panel = useRef(null)
  const titleId = useId()
  const [rendered, setRendered] = useState(open)
  if (open && !rendered) setRendered(true)

  const items = notifications.map(normalizeItem)

  // ---- Enter / exit choreography (top-right popover on desktop/4K, bottom sheet on phone) ----
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
          const backdrop = '[data-notif-backdrop]'
          const card = '[data-notif-panel]'

          if (open) {
            if (reduce) return
            gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
            gsap.fromTo(
              card,
              sheet ? { yPercent: 100 } : { y: -14, scale: 0.97, autoAlpha: 0 },
              sheet
                ? { yPercent: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform' }
                : { y: 0, scale: 1, autoAlpha: 1, duration: 0.42, ease: 'expo.out', clearProps: 'transform,opacity,visibility' },
            )
            if (root.current?.querySelector('[data-notif-item]')) {
              gsap.fromTo(
                '[data-notif-item]',
                { y: 10, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.38, stagger: 0.04, delay: 0.1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
              )
            }
          } else {
            const done = () => setRendered(false)
            if (reduce) {
              gsap.delayedCall(0, done)
              return
            }
            gsap.to(backdrop, { autoAlpha: 0, duration: 0.2, ease: 'power2.in' })
            gsap.to(
              card,
              sheet
                ? { yPercent: 100, duration: 0.28, ease: 'power3.in', onComplete: done }
                : { y: -10, scale: 0.98, autoAlpha: 0, duration: 0.2, ease: 'power2.in', onComplete: done },
            )
          }
        },
      )
      return () => mm.revert()
    },
    { scope: root, dependencies: [open, rendered] },
  )

  // ---- Lock background scroll while open ----
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

  // ---- Focus management ----
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const timer = window.setTimeout(() => {
      panel.current?.focus({ preventScroll: true })
    }, 60)
    return () => {
      window.clearTimeout(timer)
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [open])

  // ---- Escape to close & Tab focus trap ----
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const focusables = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!focusables.length) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
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
  }, [open, onClose])

  if (!rendered) return null

  return createPortal(
    <div className={styles.root} ref={root}>
      <div className={styles.backdrop} data-notif-backdrop aria-hidden="true" />

      <div
        className={styles.frame}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.()
        }}
      >
        <section
          ref={panel}
          className={clsx(styles.panel, className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-notif-panel
        >
          <div className={styles.grab} aria-hidden="true" />

          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              Notification
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close notifications">
              <X aria-hidden="true" />
            </button>
          </header>

          <div className={styles.body}>
            {loading ? (
              <ul className={styles.list} aria-busy="true" aria-label="Loading notifications">
                {Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className={styles.skelItem} aria-hidden="true">
                    <span className={styles.skTime} />
                    <span className={styles.skLine} />
                    <span className={styles.skLineShort} />
                    <div className={styles.skActions}>
                      <span />
                      <span />
                    </div>
                  </li>
                ))}
              </ul>
            ) : items.length === 0 ? (
              <div className={styles.empty}>
                <BellOff aria-hidden="true" />
                <strong>No notifications</strong>
                <span>You&apos;re all caught up. New updates will appear here.</span>
              </div>
            ) : (
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.id} className={clsx(styles.item, item.read && styles.read)} data-notif-item>
                    <div className={styles.meta}>
                      <span className={styles.time}>{item.time}</span>
                      {!item.read && <i className={styles.dot} aria-label="Unread" />}
                    </div>

                    <p className={styles.message}>{item.message}</p>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => onMarkAsRead?.(item.id)}
                        disabled={item.read}
                      >
                        {item.read ? 'Read' : 'Mark as read'}
                      </button>
                      <button
                        type="button"
                        className={clsx(styles.actionBtn, styles.deleteBtn)}
                        onClick={() => onDelete?.(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.getElementById('app-portal') ?? document.body,
  )
}