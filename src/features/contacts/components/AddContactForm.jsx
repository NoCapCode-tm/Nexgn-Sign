import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, CircleAlert } from 'lucide-react'
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

function GenderSelect({ id, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const listId = `${id}-listbox`

  const options = [
    { value: '', label: 'Select' },
    ...GENDERS.map((g) => ({ value: g, label: g })),
  ]

  const toggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left, width: r.width })
    }
    setOpen((o) => !o)
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
    const onScrollOrResize = () => setOpen(false)

    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open])

  const choose = (next) => {
    onChange({ target: { name: 'gender', value: next } })
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className={styles.selectWrap} data-open={open}>
      <button
        ref={triggerRef}
        id={id}
        name="gender"
        type="button"
        className={clsx(styles.input, styles.select, open && styles.selectOpen)}
        data-empty={!value}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
      >
        <span className={styles.selectValue}>{value || 'Select'}</span>
      </button>
      <ChevronDown className={clsx(styles.chev, open && styles.chevOpen)} aria-hidden="true" />

      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-labelledby={id}
            className={styles.selectMenu}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {options.map((opt) => {
              const selected = value === opt.value
              return (
                <li key={opt.label} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={clsx(styles.selectOption, !opt.value && styles.selectPlaceholder)}
                    data-selected={selected}
                    onClick={() => choose(opt.value)}
                  >
                    <span>{opt.label}</span>
                    {selected && opt.value && <Check className={styles.selectCheck} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.getElementById('app-portal') ?? document.body,
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
            <GenderSelect id={fid('gender')} value={values.gender} onChange={onChange} />
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