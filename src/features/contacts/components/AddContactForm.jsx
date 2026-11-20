import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, CircleAlert } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import Modal from '@/components/ui/Modal'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './AddContactForm.module.css'

gsap.registerPlugin(useGSAP)

const GENDERS = ['Male', 'Female', 'Other']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9\s().-]{7,20}$/
const FIELD_ORDER = ['name', 'gender', 'phone', 'email']

function validate(v) {
  const e = {}
  if (!v.name.trim()) e.name = 'Enter the full name.'
  const email = v.email.trim()
  if (!email) e.email = 'Enter an e-mail address.'
  else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid e-mail address.'
  const phone = v.phone.trim()
  if (phone && !PHONE_RE.test(phone)) e.phone = 'Enter a valid phone number.'
  return e
}

function Field({ id, label, error, children }) {
  return (
    <div className={styles.field} data-modal-in>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p id={`${id}-err`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * mode 'add'  -> "Add contact" / "Save contact"
 * mode 'edit' -> "Edit contact" / "Save changes" (+ delete)
 * onSubmit(values) and onDelete(contact) must return a promise. Throw to show the error in the form.
 */
export default function AddContactForm({ open, mode = 'add', contact, onClose, onSubmit, onDelete }) {
  const uid = useId()
  const formId = `${uid}-form`
  const fid = (n) => `${uid}-${n}`
  const formRef = useRef(null)
  const edit = mode === 'edit'

  const [values, setValues] = useState(() => ({
    name: contact?.name ?? '',
    gender: contact?.gender ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { contextSafe } = useGSAP({ scope: formRef })

  const shake = contextSafe(() => {
    if (prefersReducedMotion() || !formRef.current) return
    gsap.to(formRef.current, {
      keyframes: [
        { x: -10, duration: 0.08 },
        { x: 10, duration: 0.08 },
        { x: -6, duration: 0.08 },
        { x: 6, duration: 0.08 },
        { x: 0, duration: 0.08 },
      ],
      ease: 'power1.inOut',
    })
  })

  // The "Delete contact" confirmation expires after a few seconds
  useEffect(() => {
    if (!confirmDelete) return undefined
    const t = window.setTimeout(() => setConfirmDelete(false), 4000)
    return () => window.clearTimeout(t)
  }, [confirmDelete])

  const onChange = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
    if (serverError) setServerError('')
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (submitting) return

    const found = validate(values)
    setErrors(found)
    const first = FIELD_ORDER.find((k) => found[k])
    if (first) {
      formRef.current?.querySelector(`[name="${first}"]`)?.focus()
      shake()
      return
    }

    setSubmitting(true)
    setServerError('')
    try {
      await onSubmit({
        name: values.name.trim(),
        gender: values.gender,
        phone: values.phone.trim(),
        email: values.email.trim(),
      })
      // the parent closes the modal; the form stays locked while it animates out
    } catch (err) {
      setServerError(err?.userMessage || 'Could not save the contact. Please try again.')
      shake()
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (submitting) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSubmitting(true)
    setServerError('')
    try {
      await onDelete?.(contact)
    } catch (err) {
      setServerError(err?.userMessage || 'Could not delete the contact. Please try again.')
      shake()
      setConfirmDelete(false)
      setSubmitting(false)
    }
  }

  const footer = (
    <>
      {edit && onDelete && (
        <button type="button" className={styles.danger} onClick={remove} disabled={submitting}>
          {confirmDelete ? 'Click again to confirm' : 'Delete contact'}
        </button>
      )}
      <button type="button" className={styles.cancel} onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      <button type="submit" form={formId} className={styles.save} disabled={submitting}>
        {submitting ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span className={styles.srOnly}>Saving</span>
          </>
        ) : edit ? (
          'Save changes'
        ) : (
          'Save contact'
        )}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit contact' : 'Add contact'} size="md" dismissible={!submitting} footer={footer}>
      <form id={formId} ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        {serverError && (
          <div className={styles.alert} role="alert" data-modal-in>
            <CircleAlert aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <div className={styles.section} data-modal-in>
          <span>Personal information</span>
          <i aria-hidden="true" />
        </div>

        <div className={styles.grid}>
          <Field id={fid('name')} label="Full Name" error={errors.name}>
            <input
              id={fid('name')}
              name="name"
              type="text"
              autoComplete="off"
              placeholder="e.g. John Doe"
              value={values.name}
              onChange={onChange}
              className={clsx(styles.input, errors.name && styles.invalid)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${fid('name')}-err` : undefined}
              data-autofocus
            />
          </Field>

          <Field id={fid('gender')} label="Gender" error={errors.gender}>
            <div className={styles.selectWrap}>
              <select
                id={fid('gender')}
                name="gender"
                value={values.gender}
                onChange={onChange}
                className={clsx(styles.input, styles.select)}
                data-empty={!values.gender}
              >
                <option value="">Select</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown className={styles.chev} aria-hidden="true" />
            </div>
          </Field>

          <Field id={fid('phone')} label="Contact" error={errors.phone}>
            <input
              id={fid('phone')}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+91 000 000 0000"
              value={values.phone}
              onChange={onChange}
              className={clsx(styles.input, errors.phone && styles.invalid)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? `${fid('phone')}-err` : undefined}
            />
          </Field>

          <Field id={fid('email')} label="Email Address" error={errors.email}>
            <input
              id={fid('email')}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@company.com"
              value={values.email}
              onChange={onChange}
              className={clsx(styles.input, errors.email && styles.invalid)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? `${fid('email')}-err` : undefined}
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}