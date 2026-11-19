import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BellRing, Download, Ellipsis, Eye, FileText, History, Inbox, Trash2 } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import { formatDate, getInitials } from '@/utils/formatters'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './RecentDocuments.module.css'

gsap.registerPlugin(useGSAP)

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'signed', label: 'Signed' },
  { key: 'expired', label: 'Expired' },
]
const STATUS_LABEL = { pending: 'Pending', signed: 'Signed', expired: 'Expired' }
const AVATAR_COLORS = ['#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa']
const colorFor = (s) => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

function Owner({ owner }) {
  if (Array.isArray(owner)) {
    const shown = owner.slice(0, 3)
    const extra = owner.length - shown.length
    return (
      <span className={styles.team} title={owner.join(', ')}>
        <span className={styles.stack}>
          {shown.map((n) => (
            <i key={n} className={styles.avatar} style={{ '--c': colorFor(n) }}>
              {getInitials(n)}
            </i>
          ))}
        </span>
        {extra > 0 && <span className={styles.extra}>+{extra}</span>}
      </span>
    )
  }
  return <span>{owner ?? 'You'}</span>
}

/* ---------- Hover strip ---------- */
function QuickActions({ doc, onAct }) {
  return (
    <div className={styles.quick} role="group" aria-label={`Quick actions for ${doc.name}`}>
      <button type="button" className={styles.qBtn} data-tip="History" aria-label="Version history" onClick={() => onAct('history', doc)}>
        <History aria-hidden="true" />
      </button>
      <button type="button" className={styles.qBtn} data-tip="Delete" aria-label="Move to Recycle bin" onClick={() => onAct('delete', doc)}>
        <Trash2 aria-hidden="true" />
      </button>
      <button type="button" className={styles.qBtn} data-tip="View" aria-label="View document" onClick={() => onAct('view', doc)}>
        <Eye aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.qBtn}
        data-tip="Remind"
        aria-label="Send reminder"
        disabled={doc.status === 'signed'}
        onClick={() => onAct('remind', doc)}
      >
        <BellRing aria-hidden="true" />
      </button>
    </div>
  )
}

/* ---------- ⋯ menu (portal, fixed position, flips upward near the bottom) ---------- */
function RowMenu({ doc, rect, trigger, onAction, onClose }) {
  const ref = useRef(null)
  const closing = useRef(false)

  const items = [
    { key: 'view', label: 'View document', Icon: Eye },
    doc.status !== 'signed' && { key: 'remind', label: 'Send reminder', Icon: BellRing },
    { key: 'download', label: 'Download', Icon: Download },
    { key: 'history', label: 'Version history', Icon: History },
    'sep',
    { key: 'delete', label: 'Move to Recycle bin', Icon: Trash2, danger: true },
  ].filter(Boolean)

  const close = useCallback(
    (restoreFocus = false) => {
      if (closing.current) return
      closing.current = true
      const el = ref.current
      const done = () => {
        onClose()
        if (restoreFocus) trigger?.focus()
      }
      if (!el || prefersReducedMotion()) {
        done()
        return
      }
      gsap.to(el, { opacity: 0, y: -4, scale: 0.97, duration: 0.14, ease: 'power2.in', onComplete: done })
    },
    [onClose, trigger],
  )

  // Position next to the button, then animate in
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const gap = 6
    const { offsetWidth: w, offsetHeight: h } = el
    let top = rect.bottom + gap
    let up = false
    if (top + h > window.innerHeight - 8) {
      top = Math.max(8, rect.top - gap - h)
      up = true
    }
    el.style.top = `${top}px`
    el.style.left = `${Math.min(Math.max(8, rect.right - w), window.innerWidth - w - 8)}px`

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set(el, { opacity: 1 })
        return
      }
      gsap.fromTo(
        el,
        { opacity: 0, y: up ? 8 : -8, scale: 0.96, transformOrigin: up ? 'bottom right' : 'top right' },
        { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'power3.out' },
      )
      gsap.fromTo(
        el.querySelectorAll('[role="menuitem"]'),
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, delay: 0.05, ease: 'power2.out' },
      )
    }, el)
    el.querySelector('[role="menuitem"]')?.focus({ preventScroll: true })
    return () => ctx.revert()
  }, [rect])

  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current?.contains(e.target) && !trigger?.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(true)
      }
    }
    const dismiss = () => close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
    }
  }, [close, trigger])

  const onKeyDown = (e) => {
    const els = [...ref.current.querySelectorAll('[role="menuitem"]')]
    const i = els.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      els[(i + 1) % els.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      els[(i - 1 + els.length) % els.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      els[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      els[els.length - 1].focus()
    } else if (e.key === 'Tab') {
      close()
    }
  }

  const pick = (key) => {
    onAction(key, doc)
    close()
  }

  return createPortal(
    <div ref={ref} className={styles.menu} role="menu" aria-label={`Actions for ${doc.name}`} onKeyDown={onKeyDown}>
      {items.map((it) =>
        it === 'sep' ? (
          <span key="sep" className={styles.sep} aria-hidden="true" />
        ) : (
          <button key={it.key} type="button" role="menuitem" className={clsx(styles.item, it.danger && styles.danger)} onClick={() => pick(it.key)}>
            <it.Icon aria-hidden="true" />
            {it.label}
          </button>
        ),
      )}
    </div>,
    document.getElementById('app-portal') ?? document.body,
  )
}

/* ---------- Card ---------- */
export default function RecentDocuments({ docs, loading, filter, onFilterChange, onAction, footer, skeletonRows = 5 }) {
  const root = useRef(null)
  const tabsRef = useRef(null)
  const thumbRef = useRef(null)
  const placed = useRef(false)
  const headId = useId()
  const [menu, setMenu] = useState(null)

  // The dark filter pill glides between tabs
  useGSAP(
    () => {
      const tabs = tabsRef.current
      const thumb = thumbRef.current
      const active = tabs?.querySelector('[aria-pressed="true"]')
      if (!active || !thumb) return
      const to = { x: active.offsetLeft, width: active.offsetWidth }
      if (!placed.current || prefersReducedMotion()) {
        gsap.set(thumb, to)
        placed.current = true
      } else {
        gsap.to(thumb, { ...to, duration: 0.5, ease: 'power3.inOut' })
      }
    },
    { scope: tabsRef, dependencies: [filter] },
  )

  // Keep the pill aligned when the card is resized
  useEffect(() => {
    const tabs = tabsRef.current
    if (!tabs || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => {
      const active = tabs.querySelector('[aria-pressed="true"]')
      if (active && thumbRef.current) gsap.set(thumbRef.current, { x: active.offsetLeft, width: active.offsetWidth })
    })
    ro.observe(tabs)
    return () => ro.disconnect()
  }, [])

  // Rows stagger in when data arrives, the filter changes or the page changes
  const rowKey = docs.map((d) => d.id).join('|')
  useGSAP(
    () => {
      if (loading || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-row]',
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.045, delay: 0.1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root, dependencies: [loading, filter, rowKey] },
  )

  const act = async (action, doc) => {
    if (action !== 'delete' || prefersReducedMotion()) {
      onAction(action, doc)
      return
    }
    const el = root.current?.querySelector(`[data-row-id="${CSS.escape(String(doc.id))}"]`)
    if (el) {
      await new Promise((resolve) => {
        gsap.to(el, { autoAlpha: 0, x: 24, duration: 0.3, ease: 'power2.in', onComplete: resolve })
      })
    }
    const ok = await onAction('delete', doc)
    if (ok === false && el) gsap.to(el, { autoAlpha: 1, x: 0, duration: 0.3 })
  }

  const openMenu = (e, doc) => {
    const trigger = e.currentTarget
    setMenu((m) => (m?.doc.id === doc.id ? null : { doc, trigger, rect: trigger.getBoundingClientRect() }))
  }
  const closeMenu = useCallback(() => setMenu(null), [])

  return (
    <section className={styles.card} ref={root} aria-labelledby={headId}>
      <header className={styles.head}>
        <h2 id={headId} className={styles.title}>
          Recent documents
        </h2>
        <div className={styles.tabs} role="group" aria-label="Filter documents by status" ref={tabsRef}>
          <span className={styles.thumb} ref={thumbRef} aria-hidden="true" />
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={clsx(styles.tab, filter === key && styles.tabOn)}
              aria-pressed={filter === key}
              onClick={() => onFilterChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.table} role="table" aria-label="Recent documents" aria-busy={loading}>
        <div className={styles.thead} role="row">
          <span role="columnheader">Document</span>
          <span role="columnheader" className={styles.cNote}>Note</span>
          <span role="columnheader" className={styles.cSigner}>Signer</span>
          <span role="columnheader" className={styles.cDate}>Signed at</span>
          <span role="columnheader" className={styles.cOwner}>Owner</span>
          <span role="columnheader" className={styles.cStatus}>Status</span>
          <span role="columnheader" className={styles.srOnly}>Actions</span>
        </div>

        <div role="rowgroup">
          {loading &&
            Array.from({ length: skeletonRows }, (_, i) => (
              <div key={i} className={styles.skel} aria-hidden="true">
                <span className={clsx(styles.bar, styles.cDoc)} />
                <span className={clsx(styles.bar, styles.cNote)} />
                <span className={clsx(styles.bar, styles.cSigner)} />
                <span className={clsx(styles.bar, styles.cDate)} />
                <span className={clsx(styles.bar, styles.cOwner)} />
                <span className={clsx(styles.bar, styles.cStatus)} />
                <span />
              </div>
            ))}

          {!loading && docs.length === 0 && (
            <div className={styles.empty}>
              <Inbox aria-hidden="true" />
              <strong>No documents here yet</strong>
              <span>Upload a document and it will show up in this list.</span>
            </div>
          )}

          {!loading &&
            docs.map((doc) => (
              <div key={doc.id} className={styles.row} role="row" data-row data-row-id={doc.id}>
                <div className={styles.cDoc} role="cell">
                  <span className={styles.fileIcon}>
                    <FileText aria-hidden="true" />
                  </span>
                  <span className={styles.docName}>{doc.name}</span>
                </div>
                <div className={clsx(styles.cell, styles.cNote)} role="cell">{doc.note || '—'}</div>
                <div className={clsx(styles.cell, styles.cSigner)} role="cell">{doc.signer}</div>
                <div className={clsx(styles.cell, styles.cDate)} role="cell">{formatDate(doc.signedAt)}</div>
                <div className={clsx(styles.cell, styles.cOwner)} role="cell">
                  <Owner owner={doc.owner} />
                </div>
                <div className={clsx(styles.cell, styles.cStatus)} role="cell">
                  <span className={styles.pill} data-s={doc.status}>
                    <i aria-hidden="true" />
                    {STATUS_LABEL[doc.status]}
                  </span>
                </div>
                <div className={styles.cActions} role="cell">
                  <QuickActions doc={doc} onAct={act} />
                  <button
                    type="button"
                    className={styles.more}
                    aria-label={`More actions for ${doc.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menu?.doc.id === doc.id}
                    onClick={(e) => openMenu(e, doc)}
                  >
                    <Ellipsis aria-hidden="true" />
                  </button>
                </div>
                <p className={styles.sub}>
                  {doc.signer} · {formatDate(doc.signedAt)}
                </p>
              </div>
            ))}
        </div>
      </div>

      {footer}

      {menu && <RowMenu key={menu.doc.id} doc={menu.doc} rect={menu.rect} trigger={menu.trigger} onAction={act} onClose={closeMenu} />}
    </section>
  )
}