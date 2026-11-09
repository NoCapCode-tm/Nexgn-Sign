import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import styles from './LanguageSelect.module.css'

const STORAGE_KEY = 'nexgn-lang'

function FlagUS({ className }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <clipPath id={id}><circle cx="12" cy="12" r="12" /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="24" height="24" fill="#fff" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} y={i * 3.69} width="24" height="1.85" fill="#d93a4a" />
        ))}
        <rect width="13" height="12.9" fill="#2b3f8f" />
      </g>
    </svg>
  )
}

function FlagIN({ className }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <clipPath id={id}><circle cx="12" cy="12" r="12" /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="24" height="8" fill="#ff9933" />
        <rect y="8" width="24" height="8" fill="#fff" />
        <rect y="16" width="24" height="8" fill="#138808" />
        <circle cx="12" cy="12" r="2.4" fill="none" stroke="#1c2f8f" strokeWidth="0.8" />
      </g>
    </svg>
  )
}

const LANGS = [
  { code: 'EN', label: 'English', Flag: FlagUS },
  { code: 'HI', label: 'हिन्दी', Flag: FlagIN },
]

export default function LanguageSelect() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      return LANGS.some((l) => l.code === v) ? v : 'EN'
    } catch {
      return 'EN'
    }
  })
  const ref = useRef(null)
  const menuId = useId()
  const current = LANGS.find((l) => l.code === code) ?? LANGS[0]

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
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={styles.wrap} ref={ref} data-open={open}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <current.Flag className={styles.flag} />
        <span>{current.code}</span>
        <ChevronDown className={styles.chev} aria-hidden="true" />
      </button>

      <div id={menuId} role="menu" className={styles.menu}>
        {LANGS.map(({ code: c, label, Flag }) => (
          <button
            key={c}
            type="button"
            role="menuitemradio"
            aria-checked={c === code}
            className={clsx(styles.option, c === code && styles.active)}
            onClick={() => choose(c)}
          >
            <Flag className={styles.flag} />
            <span className={styles.optLabel}>{label}</span>
            {c === code && <Check className={styles.tick} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}