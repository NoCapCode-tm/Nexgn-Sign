import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, CheckCircle2, CircleAlert } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import { authService } from '@/services/auth.service'
import { motion, prefersReducedMotion } from '@/utils/motion'
import LoadingScreen from '@/components/common/LoadingScreen'
import styles from './ForgotPassword.module.css'

gsap.registerPlugin(useGSAP)

export default function ForgotPassword() {
  const root = useRef(null)
  const formRef = useRef(null)
  
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const { contextSafe } = useGSAP(() => {
    if (prefersReducedMotion()) return
    // Entrance animation matching Login/Signup
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
      }
    )
  }, { scope: root })

  // Animate success screen entrance
  useGSAP(() => {
    if (success && !prefersReducedMotion()) {
      gsap.fromTo(
        '[data-success]',
        { scale: 0.9, autoAlpha: 0, y: 15 },
        { scale: 1, autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'back.out(1.5)' }
      )
    }
  }, { scope: root, dependencies: [success] })

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

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid e-mail address.')
      shake()
      return
    }

    setError('')
    setServerError('')
    setSubmitting(true)

    try {
      // Calls apiClient.post('/admin/forgot-password', { email }) under the hood
      await authService.forgotPassword(email.trim())
      
      // Instead of navigating away immediately, we show the beautiful success UI
      setSuccess(true)
    } catch (err) {
      // Maps error.response.data.message just like your old toast.error
      setServerError(err.userMessage || 'Something went wrong. Please try again.')
      shake()
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page} ref={root}>
        <div className={styles.successWrap}>
          <div className={styles.successIcon} data-success>
            <CheckCircle2 size={40} strokeWidth={2} />
          </div>
          <h1 className={styles.title} data-success>Check your email</h1>
          <p className={styles.subtitle} data-success style={{ marginTop: '0.8em', lineHeight: '1.5' }}>
            We sent a password reset link to<br />
            <strong>{email}</strong>
          </p>
          <Link to="/login" className={styles.submit} style={{ width: '100%', textDecoration: 'none', marginTop: '2.5em' }} data-success>
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Forgot Password | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>Forgot password?</h1>
        <p className={styles.subtitle}>We'll send a code to your email</p>
      </div>

      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
        {serverError && (
          <div className={styles.alert} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <div className={styles.field} data-reveal>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your e-mail"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError('')
              if (serverError) setServerError('')
            }}
            className={clsx(styles.input, error && styles.invalid)}
            aria-invalid={!!error}
          />
        </div>

        <button type="submit" className={styles.submit} disabled={submitting} data-reveal>
          {submitting ? 'Sending...' : 'Reset password'}
        </button>

        <div data-reveal>
          <Link to="/login" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>
      </form>

      {/* Shows the full-screen dark loading overlay from your old code */}
      {submitting && (
        <LoadingScreen 
          state="connecting" 
          size={64} 
          message="Sending a digital lifeline" 
        />
      )}
    </div>
  )
}