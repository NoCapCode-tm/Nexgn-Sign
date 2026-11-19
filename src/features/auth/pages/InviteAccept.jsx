import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Eye, EyeOff, CircleAlert } from 'lucide-react'
import clsx from 'clsx'

import { authService } from '@/services/auth.service'
import { isPasswordStrongEnough } from '@/utils/passwordStrength'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import Toast from '@/components/ui/Toast'
import LoadingOverlay from '@/components/common/LoadingOverlay'
import { prefersReducedMotion } from '@/utils/motion'
import base from './Login.module.css'
import styles from './InviteAccept.module.css'

gsap.registerPlugin(useGSAP)

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const root = useRef(null)
  const formRef = useRef(null)

  const [email, setEmail] = useState('')
  const [inviterName, setInviterName] = useState('John Doe')
  const [companyName, setCompanyName] = useState('XYZ Inc.')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const data = await authService.getInvitation(token)
        if (!mounted) return
        setEmail(data?.email || '')
        if (data?.inviterName) setInviterName(data.inviterName)
        if (data?.companyName) setCompanyName(data.companyName)
      } catch (err) {
        if (!mounted) return
        setServerError(err.response?.data?.message || err.userMessage || 'Invalid invitation link.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [token])

  useGSAP(
    () => {
      if (prefersReducedMotion() || loading) return
      gsap.fromTo(
        '[data-reveal]',
        { y: 22, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' }
      )
    },
    { scope: root, dependencies: [loading] }
  )

  const shake = () => {
    if (prefersReducedMotion() || !formRef.current) return
    gsap.to(formRef.current, {
      keyframes: [{ x: -10 }, { x: 10 }, { x: -6 }, { x: 6 }, { x: 0 }],
      duration: 0.4,
      ease: 'power1.inOut',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!isPasswordStrongEnough(password)) {
      setError('Please create a stronger password (8+ chars, upper & lower case, number/symbol).')
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
      await authService.acceptInvitation({ token, password })
      setToast({ id: Date.now(), text: 'Successfully joined workspace!', tone: 'ok' })
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1400)
    } catch (err) {
      setServerError(err.userMessage || 'Something went wrong joining the workspace.')
      shake()
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingOverlay message="Loading invitation details..." />
  }

  if (serverError && !email) {
    return (
      <div className={styles.page} ref={root}>
        <div className={styles.errorCard} data-reveal>
          <CircleAlert size={42} className={styles.errorIcon} />
          <h1 className={styles.title}>Invalid invitation</h1>
          <p className={styles.subtitle}>{serverError}</p>
          <button type="button" className={base.submit} onClick={() => navigate('/login')} data-reveal>
            Go to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Join Workspace | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>You&apos;re invited</h1>
        <p className={styles.subtitle}>
          <strong>{inviterName}</strong> has invited you to join the <strong>{companyName}</strong> workspace on Nexgn. Create a password to accept your invitation.
        </p>
      </div>

      <form ref={formRef} className={base.form} onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className={base.alert} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        {error && (
          <div className={base.alert} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className={base.field} data-reveal>
          <label htmlFor="email">E-mail (non-editable)</label>
          <input
            id="email"
            type="email"
            className={clsx(base.input, styles.readOnlyInput)}
            value={email}
            readOnly
          />
        </div>

        <div className={base.field} data-reveal>
          <label htmlFor="password">Create password</label>
          <div className={base.control}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={clsx(base.input, base.hasToggle)}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className={base.toggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <PasswordStrengthMeter password={password} />
        </div>

        <div className={base.field} data-reveal>
          <label htmlFor="confirmPassword">Confirm password</label>
          <div className={base.control}>
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              className={clsx(base.input, base.hasToggle)}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (error) setError('')
              }}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className={base.toggle}
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex="-1"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className={base.submit} disabled={submitting} data-reveal>
          {submitting ? 'Joining...' : 'Join Workspace'}
        </button>

        <p className={styles.terms} data-reveal>
          By joining this workspace, you agree to Nexgn&apos;s{' '}
          <a href="https://nexgn.cloud/en/legal/terms" target="_blank" rel="noreferrer">Terms of Service</a> and{' '}
          <a href="https://nexgn.cloud/en/legal/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</a>.
        </p>
      </form>

      <Toast toast={toast} onDone={() => setToast(null)} />
      {submitting && <LoadingOverlay message="Establishing tenant permissions..." />}
    </div>
  )
}