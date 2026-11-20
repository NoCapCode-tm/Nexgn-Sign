import { useEffect, useId, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronDown, CircleAlert, Plus, RefreshCw, Users } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import Modal from '@/components/ui/Modal'
import { PERMISSION_GROUPS, ROLES } from '@/config/permissions.config'
import { useAuth } from '@/hooks/useAuth'
import { settingsService } from '@/services/settings.service'
import { prefersReducedMotion } from '@/utils/motion'
import form from '../components/form.module.css'
import styles from './TeamManagement.module.css'

gsap.registerPlugin(useGSAP)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STATUS_LABEL = { active: 'Active', pending: 'Pending', inactive: 'Inactive' }
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/* ---------------- Add member ---------------- */
function AddMemberModal({ open, onClose, onSubmit }) {
  const uid = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(ROLES.includes('Sub-admin') ? 'Sub-admin' : ROLES[ROLES.length - 1])
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const nextErrors = {}
    if (!cleanName) nextErrors.name = 'Enter the full name.'
    if (!cleanEmail) nextErrors.email = 'Enter an e-mail address.'
    else if (!EMAIL_RE.test(cleanEmail)) nextErrors.email = 'Enter a valid e-mail address.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    setServerError('')
    try {
      await onSubmit({ name: cleanName, email: cleanEmail, role })
    } catch (err) {
      setServerError(err.userMessage || 'Could not send the invitation. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add member"
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className={form.cancel} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form={`${uid}-add`} className={form.save} disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className={form.spinner} aria-hidden="true" />
                <span className={form.srOnly}>Sending</span>
              </>
            ) : (
              'Send invite'
            )}
          </button>
        </>
      }
    >
      <form id={`${uid}-add`} className={styles.modalForm} onSubmit={submit} noValidate>
        {serverError && (
          <div className={form.alert} role="alert" data-modal-in>
            <CircleAlert aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}
        <div className={form.field} data-modal-in>
          <label htmlFor={`${uid}-name`} className={form.label}>
            Full Name
          </label>
          <input
            id={`${uid}-name`}
            type="text"
            autoComplete="off"
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((er) => ({ ...er, name: undefined }))
            }}
            className={clsx(form.input, errors.name && form.invalid)}
            aria-invalid={!!errors.name}
            data-autofocus
          />
          {errors.name && <p className={form.error}>{errors.name}</p>}
        </div>
        <div className={form.field} data-modal-in>
          <label htmlFor={`${uid}-email`} className={form.label}>
            Email Address
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((er) => ({ ...er, email: undefined }))
            }}
            className={clsx(form.input, errors.email && form.invalid)}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className={form.error}>{errors.email}</p>}
        </div>
        <div className={form.field} data-modal-in>
          <label htmlFor={`${uid}-role`} className={form.label}>
            Role
          </label>
          <div className={form.selectWrap}>
            <select id={`${uid}-role`} value={role} onChange={(e) => setRole(e.target.value)} className={clsx(form.input, form.select)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className={form.chev} aria-hidden="true" />
          </div>
        </div>
      </form>
    </Modal>
  )
}

/* ---------------- Permissions ---------------- */
function PermissionsModal({ open, member, onClose, onSubmit }) {
  const uid = useId()
  const [selected, setSelected] = useState(() => new Set(member?.permissions ?? []))
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  const toggle = (key) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setServerError('')
    try {
      await onSubmit([...selected])
    } catch (err) {
      setServerError(err.userMessage || 'Could not save the permissions. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Permissions${member ? ` · ${member.name}` : ''}`}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className={form.cancel} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form={`${uid}-perm`} className={form.save} disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className={form.spinner} aria-hidden="true" />
                <span className={form.srOnly}>Saving</span>
              </>
            ) : (
              'Save'
            )}
          </button>
        </>
      }
    >
      <form id={`${uid}-perm`} className={styles.modalForm} onSubmit={submit}>
        {serverError && (
          <div className={form.alert} role="alert" data-modal-in>
            <CircleAlert aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}
        {PERMISSION_GROUPS.map((g) => (
          <fieldset key={g.label} className={styles.group} data-modal-in>
            <legend>{g.label}</legend>
            <div className={styles.checks}>
              {g.items.map((it) => (
                <label key={it.key} className={styles.check}>
                  <input type="checkbox" checked={selected.has(it.key)} onChange={() => toggle(it.key)} />
                  <span>{it.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </form>
    </Modal>
  )
}

/* ---------------- Page ---------------- */
export default function TeamManagement() {
  const { notify = () => {} } = useOutletContext() ?? {}
  const { user } = useAuth()
  const root = useRef(null)

  const [members, setMembers] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [adding, setAdding] = useState({ open: false, key: 0 })
  const [editing, setEditing] = useState({ open: false, member: null, key: 0 })
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const canManage = String(user?.role ?? '').toLowerCase() === 'admin'
  const me = (user?.email ?? '').toLowerCase()
  const loading = members === null && !loadError

  useEffect(() => {
    let active = true
    settingsService
      .getTeam()
      .then((list) => active && setMembers(list))
      .catch((err) => active && setLoadError(err))
    return () => {
      active = false
    }
  }, [reloadKey])

  // The "Remove" confirmation expires after a few seconds
  useEffect(() => {
    if (!confirmId) return undefined
    const t = window.setTimeout(() => setConfirmId(null), 4000)
    return () => window.clearTimeout(t)
  }, [confirmId])

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

  const invite = async (values) => {
    await settingsService.inviteMember(values)
    setAdding((a) => ({ ...a, open: false }))
    notify('Invitation sent')
    setReloadKey((k) => k + 1)
  }

  const savePermissions = async (permissions) => {
    const m = editing.member
    await settingsService.updateMember(m.id, { permissions })
    setMembers((prev) => (prev ?? []).map((x) => (x.id === m.id ? { ...x, permissions } : x)))
    setEditing((e) => ({ ...e, open: false }))
    notify('Permissions updated')
  }

  const remove = async (m) => {
    if (confirmId !== m.id) {
      setConfirmId(m.id)
      return
    }
    setConfirmId(null)
    setBusyId(m.id)
    try {
      await settingsService.removeMember(m.id)
      setMembers((prev) => (prev ?? []).filter((x) => x.id !== m.id))
      notify(`${m.name} was removed`)
    } catch (err) {
      notify(err.userMessage || 'Could not remove this member.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const list = members ?? []

  return (
    <div className={styles.wrap} ref={root}>
      <Helmet>
        <title>Team Management | Settings | Nexgn</title>
      </Helmet>

      {loadError && (
        <div className={form.alert} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{loadError.userMessage || 'Could not load your team.'}</span>
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
      )}

      {!loadError && (
        <div className={styles.table} role="table" aria-label="Team members" aria-busy={loading}>
          <div className={styles.thead} role="row">
            <span role="columnheader">SL.NO</span>
            <span role="columnheader">Name</span>
            <span role="columnheader" className={styles.cRole}>
              Role
            </span>
            <span role="columnheader" className={styles.cStatus}>
              Status
            </span>
            <span role="columnheader" className={styles.cActions}>
              Action
            </span>
          </div>

          <div role="rowgroup">
            {loading &&
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={styles.skel} aria-hidden="true">
                  <b />
                  <b />
                  <b />
                  <b />
                  <b />
                </div>
              ))}

            {!loading && list.length === 0 && (
              <div className={styles.empty}>
                <Users aria-hidden="true" />
                <strong>No team members yet</strong>
                <span>Invite people to work together on your documents.</span>
              </div>
            )}

            {!loading &&
              list.map((m, i) => {
                const isSelf = !!m.email && m.email.toLowerCase() === me
                const busy = busyId === m.id
                return (
                  <div key={m.id} className={styles.row} role="row" data-row>
                    <span className={styles.cSl} role="cell">
                      {i + 1}.
                    </span>
                    <span className={styles.cName} role="cell" title={m.email || undefined}>
                      {m.name}
                    </span>
                    <span className={styles.cRole} role="cell">
                      {m.role}
                    </span>
                    <span className={styles.cStatus} role="cell" data-s={m.status}>
                      {STATUS_LABEL[m.status] ?? cap(m.status)}
                    </span>
                    <span className={styles.cActions} role="cell">
                      {canManage && (
                        <>
                          <button type="button" className={styles.link} onClick={() => setEditing((e) => ({ open: true, member: m, key: e.key + 1 }))}>
                            Permissions
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              className={clsx(styles.link, confirmId === m.id && styles.confirm)}
                              onClick={() => remove(m)}
                              disabled={busy}
                            >
                              {confirmId === m.id ? 'Confirm?' : 'Remove'}
                            </button>
                          )}
                        </>
                      )}
                    </span>
                    <p className={styles.sub}>
                      {m.role} · {STATUS_LABEL[m.status] ?? cap(m.status)}
                    </p>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {canManage && (
        <div className={form.actions}>
          <button type="button" className={clsx(form.save, styles.add)} onClick={() => setAdding((a) => ({ open: true, key: a.key + 1 }))}>
            <Plus aria-hidden="true" />
            <span>Add Member</span>
          </button>
        </div>
      )}

      <AddMemberModal key={`a${adding.key}`} open={adding.open} onClose={() => setAdding((a) => ({ ...a, open: false }))} onSubmit={invite} />
      {editing.member && (
        <PermissionsModal
          key={`p${editing.key}`}
          open={editing.open}
          member={editing.member}
          onClose={() => setEditing((e) => ({ ...e, open: false }))}
          onSubmit={savePermissions}
        />
      )}
    </div>
  )
}