import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react'
import clsx from 'clsx'

import { authService } from '@/services/auth.service'
import { getPostLoginPath } from '@/utils/postLoginPath'
import { motion, prefersReducedMotion } from '@/utils/motion'
import LoadingScreen from '@/components/common/LoadingScreen'
import styles from './Verify2FA.module.css'

gsap.registerPlugin(useGSAP)

const OTP_LENGTH = 6

export default function Verify2FA() {
  const root = useRef(null)
  const formRef = useRef(null)
  const inputRefs = useRef([])

  const navigate = useNavigate()
  const location = useLocation()
  const { id: paramId } = useParams()

  // Resolves user ID from URL param (/verify-2fa/:id), router state, or localStorage
  const userId = paramId || location.state?.id || localStorage.getItem('nexgn_user_id')

  const [code, setCode] = useState(() => Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // GSAP entrance: staggered reveal + individual OTP box pop-in
  const { contextSafe } = useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const delay = motion.first ? 0.6 : 0.05

      gsap.fromTo(
        '[data-reveal]',
        { y: 24, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.08,
          delay,
          clearProps: 'transform',
        },
      )

      gsap.fromTo(
        '[data-otp]',
        { y: 14, scale: 0.92, autoAlpha: 0 },
        {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.55,
          ease: 'back.out(1.6)',
          stagger: 0.045,
          delay: delay + 0.1,
          clearProps: 'transform',
        },
      )
    },
    { scope: root },
  )

  // Server error banner animation
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

  const handleChange = (e, index) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (e.target.value && !raw) return

    if (error) setError('')
    if (serverError) setServerError('')

    const next = [...code]

    // Handle multi-character autofill from mobile keyboards
    if (raw.length > 1) {
      raw
        .slice(0, OTP_LENGTH - index)
        .split('')
        .forEach((char, offset) => {
          next[index + offset] = char
        })
      setCode(next)
      const focusIdx = Math.min(index + raw.length, OTP_LENGTH - 1)
      inputRefs.current[focusIdx]?.focus()
      return
    }

    next[index] = raw
    setCode(next)

    if (raw && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const next = [...code]
        next[index - 1] = ''
        setCode(next)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH).split('')
    if (!digits.length) return

    if (error) setError('')
    if (serverError) setServerError('')

    const next = Array(OTP_LENGTH).fill('')
    digits.forEach((char, idx) => {
      next[idx] = char
    })
    setCode(next)

    const focusIndex = digits.length < OTP_LENGTH ? digits.length : OTP_LENGTH - 1
    inputRefs.current[focusIndex]?.focus()
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const finalCode = code.join('')
    if (finalCode.length < OTP_LENGTH) {
      setError('Enter all 6 digits from your authenticator app.')
      const firstEmpty = code.findIndex((c) => !c)
      inputRefs.current[firstEmpty >= 0 ? firstEmpty : 0]?.focus()
      shake()
      return
    }

    setError('')
    setServerError('')
    setSubmitting(true)

    try {
      // Calls POST /admin/twofaverifylogin with { token: finalCode, id: userId }
      const data = await authService.verify2FA({ token: finalCode, id: userId })
      const user = data?.message ?? data?.user ?? data

      setCode(Array(OTP_LENGTH).fill(''))
      navigate(getPostLoginPath(user, { twoFactorVerified: true }), { replace: true })
    } catch (err) {
      setServerError(err.userMessage || 'Invalid authentication code')
      shake()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Verify Authenticator | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>Verify Authenticator</h1>
        <p className={styles.subtitle}>Enter your 6-digit authentication code.</p>
      </div>

      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
        {serverError && (
          <div className={styles.alert} role="alert" data-alert>
            <CircleAlert aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <div
          className={styles.otpGroup}
          role="group"
          aria-label="6-digit authentication code"
          onPaste={handlePaste}
        >
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              aria-label={`Digit ${index + 1}`}
              aria-invalid={!!(error || serverError)}
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={(e) => e.target.select()}
              className={clsx(
                styles.otpInput,
                digit && styles.filled,
                (error || serverError) && styles.invalid,
              )}
              data-otp
            />
          ))}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={submitting} data-reveal>
          {submitting ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span className={styles.srOnly}>Authenticating</span>
            </>
          ) : (
            <>
              <span>Authenticate</span>
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>

        <div data-reveal>
          <Link to="/login" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            <span>Back to login</span>
          </Link>
        </div>
      </form>

      {submitting && (
        <LoadingScreen
          state="connecting"
          size={64}
          message="Double-checking the locks"
        />
      )}
    </div>
  )
}