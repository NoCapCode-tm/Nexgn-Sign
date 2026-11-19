import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowLeft, CircleAlert } from 'lucide-react'
import clsx from 'clsx'

import { authService } from '@/services/auth.service'
import { motion, prefersReducedMotion } from '@/utils/motion'
import LoadingOverlay from '@/components/common/LoadingOverlay'
import styles from './ForgotPassword.module.css'

gsap.registerPlugin(useGSAP)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const root = useRef(null)
  const formRef = useRef(null)
  const emailId = useId()
  const emailErrId = useId()

  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentNotice, setResentNotice] = useState('')

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
    { scope: root, dependencies: [sent] },
  )

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
    setEmail(e.target.value)
    if (error) setError('')
    if (serverError) setServerError('')
  }

  const sendResetLink = async (targetEmail, isResend = false) => {
    const clean = targetEmail.trim()
    if (!clean) {
      setError('Enter your e-mail address.')
      return false
    }
    if (!EMAIL_RE.test(clean)) {
      setError('Enter a valid e-mail address.')
      return false
    }

    setError('')
    setServerError('')
    setResentNotice('')
    if (isResend) setResending(true)
    else setSubmitting(true)

    try {
      await authService.forgotPassword(clean)
      setSentEmail(clean)
      setSent(true)
      if (isResend) {
        setResentNotice('Reset link sent again.')
      }
      return true
    } catch (err) {
      setServerError(err.userMessage || 'Unable to send reset link. Please try again.')
      shake()
      return false
    } finally {
      if (isResend) setResending(false)
      else setSubmitting(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const ok = await sendResetLink(email, false)
    if (!ok) {
      formRef.current?.querySelector('input[type="email"]')?.focus()
      shake()
    }
  }

  const onResend = async () => {
    if (resending || !sentEmail) return
    await sendResetLink(sentEmail, true)
  }

  const onTryAnotherEmail = (e) => {
    e.preventDefault()
    setSent(false)
    setError('')
    setServerError('')
    setResentNotice('')
  }

  if (sent) {
    return (
      <div className={styles.page} ref={root}>
        <Helmet>
          <title>Check your email | Nexgn</title>
        </Helmet>

        <div className={styles.successWrap}>
          <div className={styles.head} data-reveal>
            <h1 className={styles.title}>Check your email</h1>
            <p className={styles.successDesc}>
              If <strong className={styles.emailHighlight}>{sentEmail}</strong> is registered with
              Nexgn, we have sent a password reset link to your inbox. Go to your email and click
              the reset link to set a new password.
            </p>
          </div>

          {serverError && (
            <div className={styles.alert} role="alert" data-alert>
              <CircleAlert aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          {resentNotice && (
            <p className={styles.notice} role="status" data-reveal>
              {resentNotice}
            </p>
          )}

          <p className={styles.resendHint} data-reveal>
            Didn&apos;t receive the link? Check your spam folder, click below to resend the link, or
            try another{' '}
            <button type="button" className={styles.inlineLink} onClick={onTryAnotherEmail}>
              email
            </button>
            .
          </p>

          <button
            type="button"
            className={styles.resendBtn}
            onClick={onResend}
            disabled={resending}
            data-reveal
          >
            {resending ? 'Sending...' : 'Resend link'}
          </button>

          <div className={styles.footerAction} data-reveal>
            <Link to="/login" className={styles.backLink}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to login</span>
            </Link>
          </div>
        </div>

        {resending && <LoadingOverlay message="Resending password reset link..." />}
      </div>
    )
  }

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Forgot password | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>Forgot password?</h1>
        <p className={styles.subtitle}>We&apos;ll send a reset link to your email</p>
      </div>

      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
        {serverError && (
          <div className={styles.alert} role="alert" data-alert>
            <CircleAlert aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <div className={styles.field} data-reveal>
          <label htmlFor={emailId} className={styles.label}>
            E-mail
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your e-mail"
            value={email}
            onChange={onChange}
            className={clsx(styles.input, error && styles.invalid)}
            aria-invalid={!!error}
            aria-describedby={error ? emailErrId : undefined}
          />
          {error && (
            <p id={emailErrId} className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>

        <button type="submit" className={styles.submit} disabled={submitting} data-reveal>
          {submitting ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span className={styles.srOnly}>Sending link</span>
            </>
          ) : (
            'Send link'
          )}
        </button>

        <div className={styles.footerAction} data-reveal>
          <Link to="/login" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to login</span>
          </Link>
        </div>
      </form>

      {submitting && <LoadingOverlay message="Sending password reset link..." />}
    </div>
  )
}