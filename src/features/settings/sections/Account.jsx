import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Cake,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import { settingsService } from '@/services/settings.service'
import { formatLongDate, getInitials } from '@/utils/formatters'
import { prefersReducedMotion } from '@/utils/motion'
import form from '../components/form.module.css'
import styles from './Account.module.css'

gsap.registerPlugin(useGSAP)

const PHONE_RE = /^\+?[0-9\s().-]{7,20}$/
const MAX_PHOTO = 5 * 1024 * 1024
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad2 = (n) => String(n).padStart(2, '0')
const toIsoDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`

function parseIsoDate(str) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '')
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) }
}

function formatDisplayDate(str) {
  const p = parseIsoDate(str)
  return p ? `${pad2(p.d)}-${pad2(p.m + 1)}-${p.y}` : ''
}

/* ---- Options built from the browser, not hardcoded lists ---- */
const LANGUAGE_CODES = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja']
const LANGUAGE_OPTIONS = (() => {
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'language' })
    return LANGUAGE_CODES.map((c) => names.of(c)).filter(Boolean)
  } catch {
    return ['English', 'Hindi']
  }
})()

let zoneCache
function getTimeZones() {
  if (zoneCache) return zoneCache
  let ids = []
  try {
    ids = Intl.supportedValuesOf('timeZone')
  } catch {
    ids = []
  }
  if (!ids.includes('UTC')) ids = ['UTC', ...ids]
  const now = new Date()
  zoneCache = ids.map((id) => {
    let offset = ''
    try {
      offset =
        new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'longOffset' })
          .formatToParts(now)
          .find((p) => p.type === 'timeZoneName')?.value ?? ''
    } catch {
      /* ignore */
    }
    return { id, label: `${offset || 'GMT'} · ${id.replace(/_/g, ' ')}` }
  })
  return zoneCache
}

function validate(v) {
  const e = {}
  if (!v.name.trim()) e.name = 'Enter your full name.'
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) e.phone = 'Enter a valid phone number.'
  if (v.birthday && new Date(`${v.birthday}T00:00:00`) > new Date()) e.birthday = 'Birthday cannot be in the future.'
  return e
}

function Field({ id, label, error, children }) {
  return (
    <div className={form.field} data-reveal>
      <label htmlFor={id} className={form.label}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className={form.error}>
          {error}
        </p>
      )}
    </div>
  )
}

function Fact({ Icon, label, value }) {
  return (
    <div className={styles.fact}>
      <dt>
        <Icon aria-hidden="true" />
        {label}
      </dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function DatePicker({ id, name, value, onChange, invalid = false, describedBy, disableFuture = true }) {
  const now = new Date()
  const today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }
  const todayIso = toIsoDate(today.y, today.m, today.d)
  const parsed = parseIsoDate(value)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // 'days' | 'months' | 'years'
  const [viewYear, setViewYear] = useState(parsed?.y ?? today.y)
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.m)
  const [yearStart, setYearStart] = useState(() => Math.floor((parsed?.y ?? today.y) / 12) * 12)
  const [pos, setPos] = useState(null)

  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const dialogId = `${id}-calendar`

  const isFutureDate = (y, m, d) => {
    if (!disableFuture) return false
    if (y !== today.y) return y > today.y
    if (m !== today.m) return m > today.m
    return d > today.d
  }

  const toggle = () => {
    if (!open && triggerRef.current) {
      const base = parseIsoDate(value) ?? today
      setViewYear(base.y)
      setViewMonth(base.m)
      setYearStart(Math.floor(base.y / 12) * 12)
      setView('days')

      const r = triggerRef.current.getBoundingClientRect()
      const estW = Math.min(300, window.innerWidth - 24)
      const spaceBelow = window.innerHeight - r.bottom - 12
      const spaceAbove = r.top - 12
      const openUp = spaceBelow < 330 && spaceAbove > spaceBelow
      const left = Math.max(12, Math.min(r.left, window.innerWidth - estW - 12))

      setPos({
        left,
        top: openUp ? undefined : r.bottom + 6,
        bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
        openUp,
      })
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return undefined

    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)

    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate()
    const list = []

    for (let i = firstDay - 1; i >= 0; i -= 1) {
      const d = daysInPrev - i
      const m = viewMonth === 0 ? 11 : viewMonth - 1
      const y = viewMonth === 0 ? viewYear - 1 : viewYear
      list.push({ y, m, d, iso: toIsoDate(y, m, d), outside: true })
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      list.push({ y: viewYear, m: viewMonth, d, iso: toIsoDate(viewYear, viewMonth, d), outside: false })
    }
    const rem = 42 - list.length
    for (let d = 1; d <= rem; d += 1) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1
      const y = viewMonth === 11 ? viewYear + 1 : viewYear
      list.push({ y, m, d, iso: toIsoDate(y, m, d), outside: true })
    }
    return list
  }, [viewYear, viewMonth])

  const selectIso = (iso) => {
    onChange(iso)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const prevStep = () => {
    if (view === 'years') {
      setYearStart((s) => s - 12)
    } else if (view === 'months') {
      setViewYear((y) => y - 1)
    } else if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextDisabled =
    disableFuture &&
    ((view === 'days' && (viewYear > today.y || (viewYear === today.y && viewMonth >= today.m))) ||
      (view === 'months' && viewYear >= today.y) ||
      (view === 'years' && yearStart + 12 > today.y))

  const nextStep = () => {
    if (nextDisabled) return
    if (view === 'years') {
      setYearStart((s) => s + 12)
    } else if (view === 'months') {
      setViewYear((y) => y + 1)
    } else if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const toggleView = () => {
    if (view === 'days') {
      setYearStart(Math.floor(viewYear / 12) * 12)
      setView('years')
    } else {
      setView('days')
    }
  }

  const headerLabel =
    view === 'years'
      ? `${yearStart} – ${yearStart + 11}`
      : view === 'months'
        ? String(viewYear)
        : `${MONTHS[viewMonth]} ${viewYear}`

  return (
    <div className={form.selectWrap} data-open={open}>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        className={clsx(form.input, form.dropdownBtn, open && form.dropdownOpen, invalid && form.invalid)}
        data-empty={!value}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onClick={toggle}
      >
        <span className={form.dropdownValue}>{formatDisplayDate(value) || 'dd-mm-yyyy'}</span>
      </button>
      <Calendar className={clsx(form.calIcon, open && form.calIconOpen)} aria-hidden="true" />

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={dialogId}
            role="dialog"
            aria-label="Choose date"
            className={clsx(form.calMenu, pos.openUp && form.dropdownUp)}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          >
            <div className={form.calHead}>
              <button
                type="button"
                className={form.calTitleBtn}
                aria-expanded={view !== 'days'}
                onClick={toggleView}
              >
                <span>{headerLabel}</span>
                <ChevronDown aria-hidden="true" />
              </button>

              <div className={form.calNav}>
                <button type="button" className={form.calNavBtn} onClick={prevStep} aria-label="Previous">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button type="button" className={form.calNavBtn} onClick={nextStep} disabled={nextDisabled} aria-label="Next">
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>

            {view === 'days' && (
              <>
                <div className={form.calWeekdays} aria-hidden="true">
                  {WEEKDAYS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <div className={form.calDays}>
                  {cells.map((c) => {
                    const selected = value === c.iso
                    const isToday = c.iso === todayIso
                    const disabled = isFutureDate(c.y, c.m, c.d)
                    return (
                      <button
                        key={c.iso}
                        type="button"
                        disabled={disabled}
                        className={clsx(form.calDay, c.outside && form.calDayOut, isToday && form.calDayToday)}
                        data-selected={selected}
                        aria-pressed={selected}
                        onClick={() => selectIso(c.iso)}
                      >
                        {c.d}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {view === 'years' && (
              <div className={form.calPickGrid}>
                {Array.from({ length: 12 }, (_, i) => {
                  const y = yearStart + i
                  const disabled = disableFuture && y > today.y
                  return (
                    <button
                      key={y}
                      type="button"
                      disabled={disabled}
                      className={form.calPickCell}
                      data-selected={y === viewYear}
                      onClick={() => {
                        setViewYear(y)
                        if (disableFuture && y === today.y && viewMonth > today.m) setViewMonth(today.m)
                        setView('months')
                      }}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            )}

            {view === 'months' && (
              <div className={form.calPickGrid}>
                {MONTHS_SHORT.map((label, m) => {
                  const disabled = disableFuture && viewYear === today.y && m > today.m
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      className={form.calPickCell}
                      data-selected={m === viewMonth}
                      onClick={() => {
                        setViewMonth(m)
                        setView('days')
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            <div className={form.calFoot}>
              <button type="button" className={form.calFootBtn} disabled={!value} onClick={() => selectIso('')}>
                Clear
              </button>
              <button type="button" className={clsx(form.calFootBtn, form.calTodayBtn)} onClick={() => selectIso(todayIso)}>
                Today
              </button>
            </div>
          </div>,
          document.getElementById('app-portal') ?? document.body,
        )}
    </div>
  )
}

function CustomSelect({
  id,
  name,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search…',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const listId = `${id}-listbox`

  const selectedOpt = options.find((o) => o.value === value)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
  }, [options, query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const toggle = () => {
    if (disabled) return
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - r.bottom - 12
      const spaceAbove = r.top - 12
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
      const maxHeight = Math.max(150, Math.min(280, openUp ? spaceAbove : spaceBelow))
      setPos({
        left: r.left,
        width: r.width,
        top: openUp ? undefined : r.bottom + 6,
        bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
        maxHeight,
        openUp,
      })
      setQuery('')
      setOpen(true)
    } else {
      close()
    }
  }

  useEffect(() => {
    if (!open) return undefined
    if (searchable) {
      const t = window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 20)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [open, searchable])

  useEffect(() => {
    if (!open) return undefined

    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
        triggerRef.current?.focus()
      }
    }
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return
      close()
    }
    const onResize = () => close()

    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const choose = (next) => {
    onChange(next)
    close()
    triggerRef.current?.focus()
  }

  return (
    <div className={form.selectWrap} data-open={open}>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        className={clsx(form.input, form.dropdownBtn, open && form.dropdownOpen)}
        data-empty={!selectedOpt?.value}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
      >
        <span className={form.dropdownValue}>{selectedOpt?.value ? selectedOpt.label : placeholder}</span>
      </button>
      <ChevronDown className={clsx(form.chev, open && form.chevOpen)} aria-hidden="true" />

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={clsx(form.dropdownMenu, pos.openUp && form.dropdownUp)}
            style={{
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
          >
            {searchable && (
              <div className={form.dropdownSearchWrap}>
                <Search className={form.dropdownSearchIcon} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className={form.dropdownSearch}
                />
              </div>
            )}

            <ul id={listId} role="listbox" aria-labelledby={id} className={form.dropdownList}>
              {visible.length === 0 ? (
                <li className={form.dropdownEmpty}>No matches found</li>
              ) : (
                visible.map((opt) => {
                  const isSelected = value === opt.value
                  return (
                    <li key={opt.value || '__empty'} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        className={clsx(form.dropdownOption, !opt.value && form.dropdownPlaceholder)}
                        data-selected={isSelected && Boolean(opt.value)}
                        onClick={() => choose(opt.value)}
                      >
                        <span>{opt.label}</span>
                        {isSelected && Boolean(opt.value) && <Check className={form.dropdownCheck} aria-hidden="true" />}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>,
          document.getElementById('app-portal') ?? document.body,
        )}
    </div>
  )
}

function Languages({ id, value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  const available = LANGUAGE_OPTIONS.filter((l) => !selected.includes(l))
  const options = available.map((l) => ({ value: l, label: l }))

  return (
    <>
      <CustomSelect
        id={id}
        name="languages"
        value=""
        options={options}
        placeholder={available.length ? 'Add a language' : 'All languages added'}
        disabled={!available.length}
        onChange={(lang) => lang && onChange([...selected, lang])}
      />
      {selected.length > 0 && (
        <ul className={styles.chips} aria-label="Selected languages">
          {selected.map((l) => (
            <li key={l}>
              <span>{l}</span>
              <button type="button" aria-label={`Remove ${l}`} onClick={() => onChange(selected.filter((x) => x !== l))}>
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function AccountForm({ profile, onSaved, notify }) {
  const uid = useId()
  const fid = (n) => `${uid}-${n}`
  const root = useRef(null)
  const formRef = useRef(null)
  const fileRef = useRef(null)
  const zones = getTimeZones()

  const initial = useMemo(
    () => ({
      name: profile?.name ?? '',
      company: profile?.company ?? '',
      phone: profile?.phone ?? '',
      location: profile?.location ?? '',
      timezone: profile?.timezone ?? '',
      languages: Array.isArray(profile?.languages) ? profile.languages : [],
      birthday: profile?.birthday ?? '',
    }),
    [profile],
  )
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState(profile?.photo ?? '')
  const [uploading, setUploading] = useState(false)

  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const zoneKnown = !values.timezone || zones.some((z) => z.id === values.timezone)

  const zoneOptions = useMemo(() => {
    const list = zones.map((z) => ({ value: z.id, label: z.label }))
    if (!zoneKnown) list.unshift({ value: values.timezone, label: values.timezone })
    return [{ value: '', label: 'Select time zone' }, ...list]
  }, [zones, zoneKnown, values.timezone])

  const { contextSafe } = useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-reveal]',
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05, delay: 0.05, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root },
  )

  const shake = contextSafe(() => {
    if (prefersReducedMotion() || !formRef.current) return
    gsap.to(formRef.current, {
      keyframes: [{ x: -10 }, { x: 10 }, { x: -6 }, { x: 6 }, { x: 0 }],
      duration: 0.4,
      ease: 'power1.inOut',
    })
  })

  const set = (name) => (e) => {
    const value = e.target.value
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
    if (serverError) setServerError('')
  }

  const reset = () => {
    setValues(initial)
    setErrors({})
    setServerError('')
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (saving || !dirty) return
    const found = validate(values)
    setErrors(found)
    const first = ['name', 'phone', 'birthday'].find((k) => found[k])
    if (first) {
      formRef.current?.querySelector(`[name="${first}"]`)?.focus()
      shake()
      return
    }
    setSaving(true)
    setServerError('')
    try {
      const next = await settingsService.updateProfile({ ...values, name: values.name.trim(), phone: values.phone.trim() })
      notify('Profile updated')
      onSaved(next)
    } catch (err) {
      setServerError(err.userMessage || 'Could not save your changes. Please try again.')
      shake()
      setSaving(false)
    }
  }

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return notify('Choose an image file.', 'error')
    if (file.size > MAX_PHOTO) return notify('The image must be under 5 MB.', 'error')

    const preview = URL.createObjectURL(file)
    setPhoto(preview)
    setUploading(true)
    try {
      const url = await settingsService.uploadAvatar(file)
      if (url) setPhoto(url)
      notify('Photo updated')
      onSaved({ ...profile, photo: url || preview }, { keepForm: true })
    } catch (err) {
      setPhoto(profile.photo)
      notify(err.userMessage || 'Could not upload the photo.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const name = profile.name || profile.email
  const statusLabel = profile.status === 'active' ? 'Active' : profile.status === 'inactive' ? 'Inactive' : ''

  return (
    <div className={styles.wrap} ref={root}>
      <Helmet>
        <title>Account | Settings | Nexgn</title>
      </Helmet>

      <form ref={formRef} className={styles.layout} onSubmit={submit} noValidate>
        <div className={styles.cols}>
          <div className={styles.col}>
            {serverError && (
              <div className={form.alert} role="alert" data-reveal>
                <CircleAlert aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}

            <Field id={fid('name')} label="Full Name" error={errors.name}>
              <input
                id={fid('name')}
                name="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={values.name}
                onChange={set('name')}
                className={clsx(form.input, errors.name && form.invalid)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${fid('name')}-err` : undefined}
              />
            </Field>

            <Field id={fid('email')} label="Email">
              <input id={fid('email')} name="email" type="email" value={profile.email} readOnly aria-readonly="true" className={form.input} />
            </Field>

            <Field id={fid('phone')} label="Mobile Number" error={errors.phone}>
              <input
                id={fid('phone')}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="9874563210"
                value={values.phone}
                onChange={set('phone')}
                className={clsx(form.input, errors.phone && form.invalid)}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? `${fid('phone')}-err` : undefined}
              />
            </Field>

            <Field id={fid('location')} label="Location">
              <input
                id={fid('location')}
                name="location"
                type="text"
                autoComplete="address-level2"
                placeholder="City, State, Country"
                value={values.location}
                onChange={set('location')}
                className={form.input}
              />
            </Field>

            <Field id={fid('birthday')} label="Birthday" error={errors.birthday}>
              <DatePicker
                id={fid('birthday')}
                name="birthday"
                value={values.birthday}
                invalid={!!errors.birthday}
                describedBy={errors.birthday ? `${fid('birthday')}-err` : undefined}
                onChange={(birthday) => {
                  setValues((v) => ({ ...v, birthday }))
                  if (errors.birthday) setErrors((er) => ({ ...er, birthday: undefined }))
                  if (serverError) setServerError('')
                }}
              />
            </Field>
          </div>

          <div className={styles.col}>
            <Field id={fid('company')} label="Company Name">
              <input
                id={fid('company')}
                name="company"
                type="text"
                autoComplete="organization"
                placeholder="Your company"
                value={values.company}
                onChange={set('company')}
                className={form.input}
              />
            </Field>

            <Field id={fid('org')} label="Organisation ID">
              <input id={fid('org')} name="orgId" type="text" value={profile.orgId} readOnly aria-readonly="true" className={form.input} />
            </Field>

            <Field id={fid('tz')} label="Time Zone">
              <CustomSelect
                id={fid('tz')}
                name="timezone"
                value={values.timezone}
                options={zoneOptions}
                placeholder="Select time zone"
                searchable
                searchPlaceholder="Search time zone…"
                onChange={(timezone) => {
                  setValues((v) => ({ ...v, timezone }))
                  if (serverError) setServerError('')
                }}
              />
            </Field>

            <Field id={fid('lang')} label="Languages">
              <Languages
                id={fid('lang')}
                value={values.languages}
                onChange={(languages) => {
                  setValues((v) => ({ ...v, languages }))
                  if (serverError) setServerError('')
                }}
              />
            </Field>
          </div>
        </div>

        {/* Profile summary */}
        <aside className={styles.profile} data-reveal aria-label="Profile summary">
          <div className={styles.identity}>
            <div className={styles.avatarWrap} data-busy={uploading}>
              <div className={styles.avatar}>
                {photo ? <img src={photo} alt="" /> : <span className={styles.initials}>{getInitials(name)}</span>}
              </div>
              <button type="button" className={styles.badge} onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change profile photo">
                <ImagePlus aria-hidden="true" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
            </div>

            <div className={styles.nameRow}>
              <strong>{name}</strong>
              {statusLabel && (
                <>
                  <i aria-hidden="true" />
                  <span className={styles.status} data-s={profile.status}>
                    {statusLabel}
                  </span>
                </>
              )}
            </div>
            {profile.orgId && (
              <p className={styles.org}>
                Org ID: <b>{profile.orgId}</b>
              </p>
            )}
          </div>

          <div className={styles.info}>
            <h3>Personal Info</h3>
            <dl className={styles.facts}>
              <Fact Icon={Mail} label="Email" value={profile.email} />
              <Fact Icon={Phone} label="Contact" value={profile.phone} />
              <Fact Icon={MapPin} label="Location" value={profile.location} />
              <Fact Icon={Cake} label="Birthday" value={formatLongDate(profile.birthday)} />
            </dl>
          </div>
        </aside>

        <div className={clsx(form.actions, styles.span)}>
          <button type="button" className={form.cancel} onClick={reset} disabled={!dirty || saving}>
            Cancel
          </button>
          <button type="submit" className={form.save} disabled={!dirty || saving} aria-busy={saving}>
            {saving ? (
              <>
                <span className={form.spinner} aria-hidden="true" />
                <span className={form.srOnly}>Saving</span>
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function AccountSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading account">
      <div className={styles.layout}>
        <div className={styles.cols}>
          {[0, 1].map((c) => (
            <div key={c} className={styles.col}>
              {Array.from({ length: c ? 4 : 5 }, (_, i) => (
                <div key={i} className={styles.skField}>
                  <b />
                  <b />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={clsx(styles.profile, styles.skProfile)} />
      </div>
    </div>
  )
}

export default function Account() {
  const { notify = () => {} } = useOutletContext() ?? {}
  const { refreshUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [version, setVersion] = useState(0)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    settingsService
      .getProfile()
      .then((p) => active && setProfile(p))
      .catch((err) => active && setLoadError(err))
    return () => {
      active = false
    }
  }, [reloadKey])

  // After a save the form is rebuilt from what the server returned; the sidebar name refreshes too
  const handleSaved = (next, { keepForm = false } = {}) => {
    setProfile(next)
    if (!keepForm) setVersion((v) => v + 1)
    refreshUser().catch(() => {})
  }

  if (loadError) {
    return (
      <div className={styles.wrap}>
        <div className={form.alert} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{loadError.userMessage || 'Could not load your account.'}</span>
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              setLoadError(null)
              setReloadKey((k) => k + 1)
            }}
          >
            <RefreshCw aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    )
  }
  if (!profile) return <AccountSkeleton />

  return <AccountForm key={version} profile={profile} onSaved={handleSaved} notify={notify} />
}