import { useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowLeft, ChevronDown, CircleAlert, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'

import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import { authService } from '@/services/auth.service'
import { env } from '@/config/env.config'
import { isPasswordStrongEnough } from '@/utils/passwordStrength'
import { motion, prefersReducedMotion } from '@/utils/motion'
import base from './Login.module.css' // shared form look: a tweak there applies to both pages
import styles from './SignUp.module.css'

gsap.registerPlugin(useGSAP)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'Real Estate', 'Other']
const TEAM_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '50+', label: '50+ employees' },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={base.googleIcon}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function Field({ id, label, error, children }) {
  return (
    <div className={base.field} data-reveal>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p id={`${id}-err`} className={base.error}>
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordInput({ id, name, value, onChange, placeholder, autoComplete, error, show, onToggle }) {
  return (
    <div className={base.control}>
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={clsx(base.input, base.hasToggle, error && base.invalid)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      <button
        type="button"
        className={base.toggle}
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? <Eye /> : <EyeOff />}
      </button>
    </div>
  )
}

export default function SignUp() {
  const navigate = useNavigate()
  const root = useRef(null)
  const formRef = useRef(null)
  const dirRef = useRef(0) // 0 = first load, 1 = forward, -1 = back
  const busy = useRef(false)
  const uid = useId()
  const id = (n) => `${uid}-${n}`

  const [step, setStep] = useState(1)
  const [values, setValues] = useState({
    email: '',
    password: '',
    confirm: '',
    name: '',
    company: '',
    industry: '',
    teamSize: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Entrance for every step: first load rises up, later steps slide in from the travel direction
  const { contextSafe } = useGSAP(
    () => {
      busy.current = false
      if (prefersReducedMotion()) return
      const dir = dirRef.current
      const from = dir === 0 ? { y: 24, autoAlpha: 0 } : { x: 28 * dir, autoAlpha: 0 }
      gsap.fromTo('[data-reveal]', from, {
        x: 0,
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.07,
        delay: dir === 0 ? (motion.first ? 0.6 : 0.05) : 0.02,
        clearProps: 'transform',
      })
    },
    { scope: root, dependencies: [step] },
  )

  // Success screen: ring draws, tick draws, then a small pulse
  useGSAP(
    () => {
      if (step !== 3 || prefersReducedMotion()) return
      const tl = gsap.timeline({ delay: 0.45, defaults: { ease: 'power2.out' } })
      tl.fromTo('[data-ring]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7 })
        .fromTo('[data-tick]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4 }, '-=0.1')
        .fromTo('[data-pulse]', { scale: 1 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    },
    { scope: root, dependencies: [step] },
  )

  // Server error banner
  useGSAP(
    () => {
      if (!serverError || prefersReducedMotion()) return
      gsap.fromTo('[data-alert]', { y: -8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
    },
    { scope: root, dependencies: [serverError] },
  )

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

  // Animate the current step out, then switch
  const goTo = contextSafe((next) => {
    if (busy.current) return
    dirRef.current = next > step ? 1 : -1
    if (prefersReducedMotion()) {
      setStep(next)
      return
    }
    busy.current = true
    gsap.to('[data-reveal]', {
      x: -28 * dirRef.current,
      autoAlpha: 0,
      duration: 0.3,
      stagger: 0.03,
      ease: 'power2.in',
      onComplete: () => setStep(next),
    })
  })

  const onChange = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
    if (serverError) setServerError('')
  }

  const validateStep1 = () => {
    const e = {}
    const email = values.email.trim()
    if (!email) e.email = 'Enter your e-mail address.'
    else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid e-mail address.'

    if (!values.password) e.password = 'Create a password.'
    else if (!isPasswordStrongEnough(values.password))
      e.password = 'Make it stronger: 8+ characters, upper and lowercase letters, and a number or symbol.'

    if (!values.confirm) e.confirm = 'Re-enter your password.'
    else if (values.confirm !== values.password) e.confirm = 'Passwords do not match.'
    return e
  }

  const validateStep2 = () => {
    const e = {}
    if (!values.name.trim()) e.name = 'Enter your full name.'
    if (!values.company.trim()) e.company = 'Enter your company name.'
    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    if (submitting) return

    const found = step === 1 ? validateStep1() : validateStep2()
    setErrors(found)
    const firstKey = Object.keys(found)[0]
    if (firstKey) {
      formRef.current?.querySelector(`[name="${firstKey}"]`)?.focus()
      shake()
      return
    }

    setServerError('')
    if (step === 1) {
      goTo(2)
      return
    }

    setSubmitting(true)
    try {
      await authService.signup({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        companyname: values.company.trim(),
        industry: values.industry,
        team_size: values.teamSize,
      })
      goTo(3)
    } catch (err) {
      if (err.response?.status === 409) {
        // Assumption: your API answers 409 for an existing account. Adjust if it uses another status.
        setErrors({ email: 'An account with this e-mail already exists.' })
        goTo(1)
      } else {
        setServerError(err.userMessage || 'Could not create your account. Please try again.')
        shake()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Placeholder: point this to your backend's Google OAuth start URL
  const onGoogle = () => {
    window.location.assign(`${env.API_URL}auth/google`)
  }

  const togglePassword = () => setShowPassword((s) => !s)

  return (
    <div className={base.page} ref={root}>
      <Helmet>
        <title>Sign up | Nexgn</title>
      </Helmet>

      {/* ---------------- Step 1: account ---------------- */}
      {step === 1 && (
        <>
          <div className={base.head} data-reveal>
            <h1 className={base.title}>Create an Account</h1>
            <p className={base.subtitle}>Sign up to get started with Nexgn</p>
          </div>

          <form ref={formRef} className={base.form} onSubmit={onSubmit} noValidate>
            <Field id={id('email')} label="E-mail" error={errors.email}>
              <input
                id={id('email')}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your e-mail"
                value={values.email}
                onChange={onChange}
                className={clsx(base.input, errors.email && base.invalid)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${id('email')}-err` : undefined}
              />
            </Field>

            <Field id={id('password')} label="Password" error={errors.password}>
              <PasswordInput
                id={id('password')}
                name="password"
                value={values.password}
                onChange={onChange}
                placeholder="Create a strong password"
                autoComplete="new-password"
                error={errors.password}
                show={showPassword}
                onToggle={togglePassword}
              />
            </Field>

            <div className={styles.meter} data-reveal>
              <PasswordStrengthMeter password={values.password} />
            </div>

            <Field id={id('confirm')} label="Confirm password" error={errors.confirm}>
              <PasswordInput
                id={id('confirm')}
                name="confirm"
                value={values.confirm}
                onChange={onChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                error={errors.confirm}
                show={showPassword}
                onToggle={togglePassword}
              />
            </Field>

            <button type="submit" className={base.submit} data-reveal>
              Sign-up
            </button>
          </form>

          <div className={base.divider} data-reveal />

          <button type="button" className={base.google} onClick={onGoogle} data-reveal>
            <GoogleIcon />
            <span>Sign-up with Google</span>
          </button>

          <p className={base.switch} data-reveal>
            Having an account ? <Link to="/login">Sign-in</Link>
          </p>
        </>
      )}

      {/* ---------------- Step 2: about you + company ---------------- */}
      {step === 2 && (
        <>
          <div className={base.head} data-reveal>
            <h1 className={base.title}>Your company</h1>
            <p className={base.subtitle}>Tell us about you and your company</p>
          </div>

          <form ref={formRef} className={base.form} onSubmit={onSubmit} noValidate>
            {serverError && (
              <div className={base.alert} role="alert" data-alert>
                <CircleAlert aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}

            <Field id={id('name')} label="Full name" error={errors.name}>
              <input
                id={id('name')}
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={values.name}
                onChange={onChange}
                className={clsx(base.input, errors.name && base.invalid)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${id('name')}-err` : undefined}
              />
            </Field>

            <Field id={id('company')} label="Company name" error={errors.company}>
              <input
                id={id('company')}
                name="company"
                type="text"
                autoComplete="organization"
                placeholder="Acme Corp"
                value={values.company}
                onChange={onChange}
                className={clsx(base.input, errors.company && base.invalid)}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? `${id('company')}-err` : undefined}
              />
            </Field>

            <Field id={id('industry')} label="Industry (Optional)">
              <div className={styles.selectWrap}>
                <select
                  id={id('industry')}
                  name="industry"
                  value={values.industry}
                  onChange={onChange}
                  className={clsx(base.input, styles.select)}
                  data-empty={!values.industry}
                >
                  <option value="" disabled hidden>
                    Select industry
                  </option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.chev} aria-hidden="true" />
              </div>
            </Field>

            <Field id={id('teamSize')} label="Team size (Optional)">
              <div className={styles.selectWrap}>
                <select
                  id={id('teamSize')}
                  name="teamSize"
                  value={values.teamSize}
                  onChange={onChange}
                  className={clsx(base.input, styles.select)}
                  data-empty={!values.teamSize}
                >
                  <option value="" disabled hidden>
                    Select team size
                  </option>
                  {TEAM_SIZES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.chev} aria-hidden="true" />
              </div>
            </Field>

            <button type="submit" className={base.submit} disabled={submitting} data-reveal>
              {submitting ? (
                <>
                  <span className={base.spinner} aria-hidden="true" />
                  <span className={base.srOnly}>Creating your account</span>
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <button type="button" className={styles.back} onClick={() => goTo(1)} disabled={submitting} data-reveal>
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
        </>
      )}

      {/* ---------------- Step 3: success ---------------- */}
      {step === 3 && (
        <div className={styles.success}>
          <div className={styles.badge} data-reveal>
            <svg viewBox="0 0 52 52" data-pulse aria-hidden="true">
              <circle className={styles.ring} data-ring cx="26" cy="26" r="24" pathLength="1" transform="rotate(-90 26 26)" />
              <path className={styles.tick} data-tick d="M15.5 27l7.5 7.5L37 19" pathLength="1" />
            </svg>
          </div>

          <h1 className={base.title} data-reveal>
            Locked and loaded.
          </h1>
          <p className={styles.lead} data-reveal>
            Your Nexgn workspace is ready. We just sent a verification link to <strong>{values.email.trim()}</strong>.
            Give it a click to activate your dashboard. See you on the inside.
          </p>

          <button type="button" className={styles.outline} onClick={() => navigate('/login')} data-reveal>
            <span>Back to</span>
            <span className={styles.red}>Login</span>
          </button>
        </div>
      )}
    </div>
  )
}