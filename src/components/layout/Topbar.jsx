import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Bell, ChevronDown, Menu, Moon, Search, Sun, Upload, X } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import NotificationOverlay from './NotificationOverlay'
import Toast from '@/components/ui/Toast'
import { useNotifications } from '@/hooks/useNotifications'
import { useTheme } from '@/hooks/useTheme'
import { settingsService } from '@/services/settings.service'
import {
  initNotificationSound,
  isNotificationSnoozed,
  playNotificationSound,
} from '@/utils/notificationSound'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './Topbar.module.css'

gsap.registerPlugin(useGSAP)

const LANG_KEY = 'nexgn-lang'
const LANGS = [
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'हिन्दी' },
  { code: 'ES', label: 'Español' },
]

const readLang = () => {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return LANGS.some((l) => l.code === v) ? v : 'EN'
  } catch {
    return 'EN'
  }
}

function LangMenu() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(readLang)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (next) => {
    setCode(next)
    setOpen(false)
    document.documentElement.lang = next.toLowerCase()
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={styles.lang} ref={ref} data-open={open}>
      <button
        type="button"
        className={styles.langBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {code}
        <ChevronDown aria-hidden="true" />
      </button>
      <div className={styles.langMenu} role="menu">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            role="menuitemradio"
            aria-checked={l.code === code}
            className={clsx(styles.langOpt, l.code === code && styles.langOn)}
            onClick={() => choose(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Topbar({ title, subtitle, onUpload, hasUnread = false, showUpload = true }) {
  const navigate = useNavigate()
  const { openNav } = useOutletContext() ?? {}
  const { theme, setTheme } = useTheme()

  const formRef = useRef(null)
  const inputRef = useRef(null)
  const firstRun = useRef(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    initNotificationSound()
    settingsService.getNotifications().catch(() => {})
  }, [])

  const handleIncoming = useCallback((item) => {
    if (isNotificationSnoozed()) return
    playNotificationSound()
    // To use a custom file instead: playNotificationSound({ audioSrc: '/sounds/notification.mp3' })
    setToast({ id: Date.now(), text: item.title || item.message || 'New notification', tone: 'ok' })
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  const { notifications, loading, unreadCount, markAsRead, deleteNotification } = useNotifications({
    onIncoming: handleIncoming,
  })

  const showDot = hasUnread || unreadCount > 0

  // Search expands in place (desktop). On phones it overlays the top row via CSS.
  useGSAP(
    () => {
      const form = formRef.current
      if (!form) return
      if (firstRun.current) {
        firstRun.current = false
        return
      }
      const fs = parseFloat(getComputedStyle(form).fontSize)
      const wide = window.matchMedia('(min-width: 761px)').matches

      if (!wide || prefersReducedMotion()) {
        gsap.set(form, { clearProps: 'width' })
        if (searchOpen) inputRef.current?.focus()
        return
      }
      if (searchOpen) {
        gsap.to(form, {
          width: fs * 18,
          duration: 0.5,
          ease: 'power3.inOut',
          onComplete: () => inputRef.current?.focus(),
        })
      } else {
        gsap.to(form, {
          width: fs * 3.14,
          duration: 0.4,
          ease: 'power3.inOut',
          onComplete: () => gsap.set(form, { clearProps: 'width' }),
        })
      }
    },
    { scope: formRef, dependencies: [searchOpen] },
  )

  const closeSearch = () => {
    if (inputRef.current) inputRef.current.value = ''
    setSearchOpen(false)
  }

  const submitSearch = (e) => {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (q) navigate(`/documents?q=${encodeURIComponent(q)}`)
    closeSearch()
  }

  return (
    <>
      <div className={styles.bar}>
        <button
          type="button"
          className={clsx(styles.iconBtn, styles.burger)}
          onClick={openNav}
          aria-label="Open menu"
        >
          <Menu aria-hidden="true" />
        </button>

        <div className={styles.head} data-enter>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        <div className={styles.actions} data-enter>
          <form
            ref={formRef}
            className={styles.search}
            data-open={searchOpen}
            role="search"
            onSubmit={submitSearch}
          >
            <button
              type="button"
              className={styles.searchBtn}
              onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              aria-label={searchOpen ? 'Close search' : 'Search'}
              aria-expanded={searchOpen}
            >
              <Search aria-hidden="true" />
            </button>
            <input
              ref={inputRef}
              className={styles.searchInput}
              type="search"
              name="q"
              placeholder="Search documents, signers…"
              autoComplete="off"
              aria-label="Search documents"
              tabIndex={searchOpen ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeSearch()
              }}
            />
            {searchOpen && (
              <button
                type="button"
                className={styles.searchClose}
                onClick={closeSearch}
                aria-label="Close search"
              >
                <X aria-hidden="true" />
              </button>
            )}
          </form>

          <LangMenu />

          <div className={styles.theme} role="group" aria-label="Colour theme" data-mode={theme}>
            <span className={styles.themeThumb} aria-hidden="true" />
            <button
              type="button"
              className={styles.themeBtn}
              aria-pressed={theme === 'light'}
              aria-label="Light theme"
              onClick={() => setTheme('light')}
            >
              <Sun aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.themeBtn}
              aria-pressed={theme === 'dark'}
              aria-label="Dark theme"
              onClick={() => setTheme('dark')}
            >
              <Moon aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className={styles.bell}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            aria-haspopup="dialog"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen(true)}
          >
            <Bell aria-hidden="true" />
            {showDot && <span className={styles.dot} aria-hidden="true" />}
          </button>

          {showUpload && (
            <button
              type="button"
              className={styles.upload}
              aria-label="Upload documents"
              onClick={
                onUpload ?? (() => navigate('/documents', { state: { openUpload: true } }))
              }
            >
              <Upload aria-hidden="true" />
              <span>Upload documents</span>
            </button>
          )}
        </div>
      </div>

      <NotificationOverlay
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        loading={loading}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
      />

      <Toast toast={toast} onDone={clearToast} />
    </>
  )
}