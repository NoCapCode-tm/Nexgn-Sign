import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Bell, CircleAlert, RefreshCw } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import Switch from '@/components/ui/Switch'
import { settingsService } from '@/services/settings.service'
import { prefersReducedMotion } from '@/utils/motion'
import form from '../components/form.module.css'
import styles from './Notifications.module.css'

gsap.registerPlugin(useGSAP)

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
    () => !!items && !!saved && items.some((it, i) => it.enabled !== saved[i]?.enabled),
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

  const toggle = (key, enabled) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, enabled } : it)))

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
            <ul className={styles.list} aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className={styles.skel} aria-hidden="true">
                  <b />
                  <i />
                </li>
              ))}
            </ul>
          )}

          {!loading && groups.length > 0 && (
            <div className={styles.groups}>
              {groups.map(([groupName, groupItems]) => (
                <section key={groupName || 'default'} className={styles.section}>
                  {groupName && <h3 className={styles.groupTitle}>{groupName}</h3>}
                  <ul className={styles.list}>
                    {groupItems.map((it) => (
                      <li key={it.key} className={styles.row} data-row>
                        <div className={styles.text}>
                          <span id={`${uid}-${it.key}`} className={styles.title}>
                            {it.label}
                          </span>
                          {it.description && <span className={styles.desc}>{it.description}</span>}
                        </div>
                        <Switch checked={it.enabled} onChange={(v) => toggle(it.key, v)} labelledBy={`${uid}-${it.key}`} />
                      </li>
                    ))}
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