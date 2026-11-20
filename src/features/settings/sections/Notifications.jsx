import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Bell, ChevronDown, CircleAlert, RefreshCw } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import Switch from '@/components/ui/Switch'
import { SNOOZE_OPTIONS, settingsService } from '@/services/settings.service'
import { prefersReducedMotion } from '@/utils/motion'
import { playNotificationSound } from '@/utils/notificationSound'
import form from '../components/form.module.css'
import styles from './Notifications.module.css'

gsap.registerPlugin(useGSAP)

// A saved value that is not one of the four presets still shows up in the list
const minutesLabel = (m) => {
  if (m < 60) return `${m} Minutes`
  const h = m / 60
  return Number.isInteger(h) ? `${String(h).padStart(2, '0')} Hour` : `${m} Minutes`
}

/* ---------------- "Select time" dropdown ---------------- */
function SnoozeSelect({ id, labelledBy, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const options = useMemo(() => {
    const list = [...SNOOZE_OPTIONS]
    if (!list.some((o) => o.value === value)) list.push({ value, label: minutesLabel(value) })
    return list.sort((a, b) => a.value - b.value)
  }, [value])
  const selected = options.find((o) => o.value === value)

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const fs = parseFloat(getComputedStyle(el).fontSize) || 14
    const need = fs * 2.6 * options.length + fs
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < need && above > below
    setPos({
      left: r.left,
      width: r.width,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      up,
    })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      close()
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      close()
      triggerRef.current?.focus()
    }
    const onScroll = (e) => {
      if (!menuRef.current?.contains(e.target)) close()
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', onScroll, true)
    menuRef.current?.querySelector('[aria-selected="true"] button')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const onTriggerKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      toggle()
    }
  }

  const onMenuKey = (e) => {
    const items = [...menuRef.current.querySelectorAll('button')]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1].focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const pick = (v) => {
    onChange(v)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className={styles.selectWrap}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={clsx(styles.selectBtn, open && styles.selectOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${labelledBy} ${id}`}
        onClick={toggle}
        onKeyDown={onTriggerKey}
      >
        <span>{selected?.label}</span>
        <ChevronDown className={clsx(styles.selectChev, open && styles.selectChevOpen)} aria-hidden="true" />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={labelledBy}
            className={clsx(styles.menu, pos.up && styles.menuUp)}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
            onKeyDown={onMenuKey}
          >
            {options.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button type="button" className={styles.option} data-selected={o.value === value} onClick={() => pick(o.value)}>
                  {o.label}
                </button>
              </li>
            ))}
          </ul>,
          document.getElementById('app-portal') ?? document.body,
        )}
    </div>
  )
}

/* ---------------- Page ---------------- */
export default function Notifications() {
  const { notify = () => {} } = useOutletContext() ?? {}
  const uid = useId()
  const root = useRef(null)

  const [saved, setSaved] = useState(null)
  const [items, setItems] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    settingsService
      .getNotifications()
      .then((list) => {
        if (!active) return
        setSaved(list)
        setItems(list)
      })
      .catch((err) => active && setLoadError(err))
    return () => {
      active = false
    }
  }, [reloadKey])

  const loading = !items && !loadError
  const dirty = useMemo(
    () =>
      !!items &&
      !!saved &&
      items.some((it, i) => it.enabled !== saved[i]?.enabled || it.duration !== saved[i]?.duration),
    [items, saved],
  )

  const groups = useMemo(() => {
    if (!items?.length) return []
    const map = new Map()
    for (const it of items) {
      const g = it.group || ''
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(it)
    }
    return [...map.entries()]
  }, [items])

  useGSAP(
    () => {
      if (loading || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-row]',
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.05, delay: 0.05, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root, dependencies: [loading] },
  )

  const patch = (key, change) => {
    if (key === 'notification_sound' && change.enabled) {
      playNotificationSound({ force: true })
    }
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)))
  }

  const save = async (e) => {
    e.preventDefault()
    if (saving || !dirty) return
    setSaving(true)
    try {
      await settingsService.updateNotifications(items)
      setSaved(items)
      notify('Notification preferences saved')
    } catch (err) {
      notify(err.userMessage || 'Could not save your preferences.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.wrap} ref={root}>
      <Helmet>
        <title>Notification | Settings | Nexgn</title>
      </Helmet>

      {loadError ? (
        <div className={form.alert} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{loadError.userMessage || 'Could not load your notification settings.'}</span>
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
      ) : (
        <form onSubmit={save}>
          {loading && (
            <div className={styles.groups} aria-busy="true">
              <ul className={styles.list}>
                {Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className={styles.skel} aria-hidden="true">
                    <span>
                      <b />
                      <em />
                    </span>
                    <i />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && groups.length > 0 && (
            <div className={styles.groups}>
              {groups.map(([groupName, groupItems]) => (
                <section key={groupName || 'general'} className={styles.section}>
                  {groupName && <h3 className={styles.groupTitle}>{groupName}</h3>}
                  <ul className={styles.list}>
                    {groupItems.map((it) => {
                      const labelId = `${uid}-${it.key}`
                      return (
                        <li key={it.key} className={styles.row} data-row>
                          <div className={styles.text}>
                            <span id={labelId} className={styles.title}>
                              {it.label}
                            </span>
                            {it.description && <span className={styles.desc}>{it.description}</span>}

                            {it.type === 'snooze' && (
                              <div className={styles.timeRow}>
                                <span id={`${labelId}-time`} className={styles.timeLabel}>
                                  Select time
                                </span>
                                <SnoozeSelect
                                  id={`${labelId}-select`}
                                  labelledBy={`${labelId}-time`}
                                  value={it.duration}
                                  onChange={(duration) => patch(it.key, { duration })}
                                />
                              </div>
                            )}
                          </div>
                          <Switch checked={it.enabled} onChange={(v) => patch(it.key, { enabled: v })} labelledBy={labelId} />
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className={styles.empty}>
              <Bell aria-hidden="true" />
              <strong>No notification settings available</strong>
              <span>Preferences will show up here as soon as they are available for your account.</span>
            </div>
          )}

          <div className={form.actions}>
            <button type="button" className={form.cancel} onClick={() => setItems(saved)} disabled={!dirty || saving}>
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
      )}
    </div>
  )
}