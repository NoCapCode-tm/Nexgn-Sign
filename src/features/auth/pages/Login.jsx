import { useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import { env } from '@/config/env.config'
import { getPostLoginPath } from '@/utils/postLoginPath'
import { motion, prefersReducedMotion } from '@/utils/motion'
import styles from './Login.module.css'

gsap.registerPlugin(useGSAP)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={styles.googleIcon}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const root = useRef(null)
  const formRef = useRef(null)
  const ids = { email: useId(), password: useId(), emailErr: useId(), passwordErr: useId() }

  const [values, setValues] = useState({ email: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Entrance: staggered reveal (waits for the card intro on first load)
  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-reveal]',
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.08,
            delay: motion.first ? 0.6 : 0.05,
            clearProps: 'transform',
          },
        )
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  // Server error banner animates in
  useGSAP(
    () => {
      if (!serverError || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-alert]',
        { y: -8, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.4, ease: 'power2.out' },
      )
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

  const onChange = (e) => {
    const { name, type, value, checked } = e.target
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
    if (serverError) setServerError('')
  }

  const validate = () => {
    const next = {}
    if (!values.email.trim()) next.email = 'Enter your e-mail address.'
    else if (!EMAIL_RE.test(values.email.trim())) next.email = 'Enter a valid e-mail address.'
    if (!values.password) next.password = 'Enter your password.'
    return next
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      formRef.current?.querySelector(found.email ? '[name="email"]' : '[name="password"]')?.focus()
      shake()
      return
    }

    setSubmitting(true)
    setServerError('')
    try {
      const email = values.email.trim()
      const data = await login({ email, password: values.password, remember: values.remember })

      if (data?.requires2FA) {
        navigate('/verify-2fa', { state: { email, from: location.state?.from } })
      } else {
        navigate(getPostLoginPath(location), { replace: true })
      }
    } catch (err) {
      setServerError(err.userMessage || 'Could not log you in. Please try again.')
      shake()
    } finally {
      setSubmitting(false)
    }
  }

  // Placeholder: point this to your backend's Google OAuth start URL
  const onGoogle = () => {
    window.location.assign(`${env.API_URL}auth/google`)
  }

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Log in | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>Welcome back !</h1>
        <p className={styles.subtitle}>Log in to access your dashboard</p>
      </div>

      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
        {serverError && (
          <div className={styles.alert} role="alert" data-alert>
            <CircleAlert aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <div className={styles.field} data-reveal>
          <label htmlFor={ids.email}>E-mail</label>
          <input
            id={ids.email}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your e-mail"
            value={values.email}
            onChange={onChange}
            className={clsx(styles.input, errors.email && styles.invalid)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? ids.emailErr : undefined}
          />
          {errors.email && (
            <p id={ids.emailErr} className={styles.error}>{errors.email}</p>
          )}
        </div>

        <div className={styles.field} data-reveal>
          <label htmlFor={ids.password}>Password</label>
          <div className={styles.control}>
            <input
              id={ids.password}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={values.password}
              onChange={onChange}
              className={clsx(styles.input, styles.hasToggle, errors.password && styles.invalid)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? ids.passwordErr : undefined}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          </div>
          {errors.password && (
            <p id={ids.passwordErr} className={styles.error}>{errors.password}</p>
          )}
        </div>

        <div className={styles.row} data-reveal>
          <label className={styles.check}>
            <input type="checkbox" name="remember" checked={values.remember} onChange={onChange} />
            <span>Remember Me</span>
          </label>
          <Link to="/forgot-password" className={styles.forgot}>
            Forget password ?
          </Link>
        </div>

        <button type="submit" className={styles.submit} disabled={submitting} data-reveal>
          {submitting ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span className={styles.srOnly}>Logging in</span>
            </>
          ) : (
            'Log in'
          )}
        </button>
      </form>

      <div className={styles.divider} data-reveal />

      <button type="button" className={styles.google} onClick={onGoogle} data-reveal>
        <GoogleIcon />
        <span>Sign-in with Google</span>
      </button>

      <p className={styles.switch} data-reveal>
        Don&apos;t have an account ? <Link to="/signup">Sign-up</Link>
      </p>
    </div>
  )
}