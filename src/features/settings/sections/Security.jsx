import { useId, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CircleAlert } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import Modal from '@/components/ui/Modal'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import Switch from '@/components/ui/Switch'
import { useAuth } from '@/hooks/useAuth'
import { settingsService } from '@/services/settings.service'
import { isPasswordStrongEnough } from '@/utils/passwordStrength'
import { has2FA, mark2FAVerified } from '@/utils/twoFactor'
import { prefersReducedMotion } from '@/utils/motion'
import form from '../components/form.module.css'
import styles from './Security.module.css'

gsap.registerPlugin(useGSAP)

const EMPTY = { current: '', next: '', confirm: '' }

function validate(v) {
  const e = {}
  if (!v.current) e.current = 'Enter your current password.'
  if (!v.next) e.next = 'Enter a new password.'
  else if (!isPasswordStrongEnough(v.next)) e.next = 'Make it stronger: 8+ characters, upper and lowercase letters, and a number or symbol.'
  else if (v.next === v.current) e.next = 'The new password must be different from the current one.'
  if (!v.confirm) e.confirm = 'Re-enter the new password.'
  else if (v.confirm !== v.next) e.confirm = 'Passwords do not match.'
  return e
}

/* Only opens when the server hands back an authenticator secret/QR to confirm */
function TwoFactorSetup({ open, setup, onClose, onConfirm }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const qrIsImage = /^(data:image|https?:)/.test(setup?.qr ?? '')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (code.length !== 6) return setError('Enter the 6-digit code from your authenticator app.')
    setBusy(true)
    setError('')
    try {
      await onConfirm(code)
    } catch (err) {
      setError(err.userMessage || 'Incorrect authentication code.')
      setCode('')
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set up authenticator"
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className={form.cancel} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="twofa-setup" className={form.save} disabled={busy} aria-busy={busy}>
            Verify and enable
          </button>
        </>
      }
    >
      <form id="twofa-setup" className={styles.setup} onSubmit={submit} noValidate>
        <p data-modal-in>Scan this code with Google Authenticator, Authy or a similar app, then enter the 6-digit code it shows.</p>
        {qrIsImage && <img className={styles.qr} src={setup.qr} alt="Authenticator QR code" data-modal-in />}
        {setup?.secret && (
          <p data-modal-in>
            Can&apos;t scan? Enter this key instead: <code>{setup.secret}</code>
          </p>
        )}
        <div className={form.field} data-modal-in>
          <label htmlFor="twofa-code" className={form.label}>
            Authentication code
          </label>
          <input
            id="twofa-code"
            className={clsx(form.input, error && form.invalid)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''))
              if (error) setError('')
            }}
            aria-invalid={!!error}
            data-autofocus
          />
          {error && <p className={form.error}>{error}</p>}
        </div>
      </form>
    </Modal>
  )
}

export default function Security() {
  const { notify = () => {} } = useOutletContext() ?? {}
  const { user, refreshUser } = useAuth()
  const uid = useId()
  const fid = (n) => `${uid}-${n}`
  const root = useRef(null)
  const formRef = useRef(null)

  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)
  const [twoFA, setTwoFA] = useState(() => has2FA(user))
  const [twoBusy, setTwoBusy] = useState(false)
  const [setup, setSetup] = useState({ open: false, key: 0, data: null })

  const dirty = !!(values.current || values.next || values.confirm)

  const { contextSafe } = useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-reveal]',
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, delay: 0.05, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
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

  const onChange = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
    if (serverError) setServerError('')
  }

  const reset = () => {
    setValues(EMPTY)
    setErrors({})
    setServerError('')
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (saving || !dirty) return
    const found = validate(values)
    setErrors(found)
    const first = ['current', 'next', 'confirm'].find((k) => found[k])
    if (first) {
      formRef.current?.querySelector(`[name="${first}"]`)?.focus()
      shake()
      return
    }
    setSaving(true)
    setServerError('')
    try {
      await settingsService.changePassword({ currentPassword: values.current, newPassword: values.next })
      notify('Password updated')
      reset()
    } catch (err) {
      setServerError(err.userMessage || 'Could not change your password. Please try again.')
      shake()
    } finally {
      setSaving(false)
    }
  }

  // The user just proved they hold the authenticator, so this browser counts as verified
  const finishTwoFactor = (enabled) => {
    setTwoFA(enabled)
    if (enabled) mark2FAVerified(user?._id || user?.id)
    notify(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled')
    refreshUser().catch(() => {})
  }

  const toggleTwoFactor = async (next) => {
    if (twoBusy) return
    setTwoBusy(true)
    try {
      const { setup: data } = await settingsService.setTwoFactor(next)
      if (next && data) setSetup((s) => ({ open: true, key: s.key + 1, data }))
      else finishTwoFactor(next)
    } catch (err) {
      notify(err.userMessage || 'Could not update two-factor authentication.', 'error')
    } finally {
      setTwoBusy(false)
    }
  }

  const confirmSetup = async (code) => {
    await settingsService.confirmTwoFactor(code)
    setSetup((s) => ({ ...s, open: false }))
    finishTwoFactor(true)
  }

  return (
    <div className={styles.wrap} ref={root}>
      <Helmet>
        <title>Security | Settings | Nexgn</title>
      </Helmet>

      <form ref={formRef} onSubmit={submit} noValidate>
        <div className={styles.fields}>
          {serverError && (
            <div className={form.alert} role="alert" data-reveal>
              <CircleAlert aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <div className={form.field} data-reveal>
            <label htmlFor={fid('current')} className={form.label}>
              Current Password
            </label>
            <input
              id={fid('current')}
              name="current"
              type="password"
              autoComplete="current-password"
              placeholder="Enter current password"
              value={values.current}
              onChange={onChange}
              className={clsx(form.input, errors.current && form.invalid)}
              aria-invalid={!!errors.current}
              aria-describedby={errors.current ? `${fid('current')}-err` : undefined}
            />
            {errors.current && (
              <p id={`${fid('current')}-err`} className={form.error}>
                {errors.current}
              </p>
            )}
          </div>

          <div className={form.field} data-reveal>
            <label htmlFor={fid('next')} className={form.label}>
              New Password
            </label>
            <input
              id={fid('next')}
              name="next"
              type="password"
              autoComplete="new-password"
              placeholder="Enter new password"
              value={values.next}
              onChange={onChange}
              className={clsx(form.input, errors.next && form.invalid)}
              aria-invalid={!!errors.next}
              aria-describedby={errors.next ? `${fid('next')}-err` : undefined}
            />
            {values.next && <PasswordStrengthMeter password={values.next} />}
            {errors.next && (
              <p id={`${fid('next')}-err`} className={form.error}>
                {errors.next}
              </p>
            )}
          </div>

          <div className={form.field} data-reveal>
            <label htmlFor={fid('confirm')} className={form.label}>
              Confirm New Password
            </label>
            <input
              id={fid('confirm')}
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Enter your new password again"
              value={values.confirm}
              onChange={onChange}
              className={clsx(form.input, errors.confirm && form.invalid)}
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? `${fid('confirm')}-err` : undefined}
            />
            {errors.confirm && (
              <p id={`${fid('confirm')}-err`} className={form.error}>
                {errors.confirm}
              </p>
            )}
          </div>

          <div className={form.field} data-reveal>
            <span id={fid('2fa')} className={form.label}>
              Two-factor Authentication
            </span>
            <div className={styles.twofa}>
              <p>Add an extra layer of security to your account by enabling two-factor authentication.</p>
              <Switch checked={twoFA} onChange={toggleTwoFactor} labelledBy={fid('2fa')} disabled={twoBusy} />
            </div>
          </div>
        </div>

        <div className={form.actions}>
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

      <TwoFactorSetup
        key={setup.key}
        open={setup.open}
        setup={setup.data}
        onClose={() => setSetup((s) => ({ ...s, open: false }))}
        onConfirm={confirmSetup}
      />
    </div>
  )
}