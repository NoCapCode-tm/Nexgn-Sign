import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import { authService } from '@/services/auth.service'
import { isPasswordStrongEnough } from '@/utils/passwordStrength'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import { motion, prefersReducedMotion } from '@/utils/motion'
import LoadingScreen from '@/components/common/LoadingScreen'
import styles from './SetNewPassword.module.css'

gsap.registerPlugin(useGSAP)

export default function SetNewPassword() {
  const root = useRef(null)
  const formRef = useRef(null)
  const navigate = useNavigate()
  const { id: paramId } = useParams() // Grabs :id from /reset-password/:id
  const [searchParams] = useSearchParams()
  const id = paramId || searchParams.get('id') || searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { contextSafe } = useGSAP(() => {
    if (prefersReducedMotion()) return
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
  }, { scope: root })

  const shake = contextSafe(() => {
    if (prefersReducedMotion() || !formRef.current) return
    gsap.to(formRef.current, {
      keyframes: [{ x: -10 }, { x: 10 }, { x: -6 }, { x: 6 }, { x: 0 }],
      duration: 0.4,
      ease: 'power1.inOut',
    })
  })

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!isPasswordStrongEnough(password)) {
      setError('Please create a stronger password.')
      shake()
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      shake()
      return
    }

    setError('')
    setServerError('')
    setSubmitting(true)

    try {
      // Calls POST /admin/resetpassword with { id, password }
      await authService.resetPassword({ id, password })
      // Navigate to compact "All done!" page
      navigate('/reset-password/done', { replace: true, state: { reset: true } })
    } catch (err) {
      setServerError(err.userMessage || 'Something went wrong. Please try again.')
      shake()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Set New Password | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.subtitle}>Set a new password for your account</p>
      </div>

      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
        {serverError && (
          <div className={styles.alert} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        {error && (
          <div className={styles.alert} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.field} data-reveal>
          <label htmlFor="password">Password</label>
          <div className={styles.inputWrap}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
                if (serverError) setServerError('')
              }}
              className={clsx(styles.input, error && styles.invalid)}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <PasswordStrengthMeter password={password} />
        </div>

        <div className={styles.field} data-reveal>
          <label htmlFor="confirmPassword">Confirm password</label>
          <div className={styles.inputWrap}>
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (error) setError('')
                if (serverError) setServerError('')
              }}
              className={clsx(styles.input, error && styles.invalid)}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submit} disabled={submitting} data-reveal>
          {submitting ? 'Updating...' : 'Reset password'}
        </button>

        <div data-reveal>
          <Link to="/login" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>
      </form>

      {submitting && (
        <LoadingScreen state="connecting" size={64} message="Forging your new keys" />
      )}
    </div>
  )
}