import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Check, X, CircleAlert } from 'lucide-react'

import { authService } from '@/services/auth.service'
import { prefersReducedMotion } from '@/utils/motion'
import LoadingOverlay from '@/components/common/LoadingOverlay'
import styles from './InviteLanding.module.css'

gsap.registerPlugin(useGSAP)

export default function InviteLanding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const root = useRef(null)

  const [inviteData, setInviteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const data = await authService.getInvitation(token)
        if (!mounted) return
        setInviteData(data)
      } catch (err) {
        if (!mounted) return
        const msg = err.response?.data?.message || err.userMessage || 'Invalid or expired invitation.'
        setServerError(msg)
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

  const handleDecline = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await authService.declineInvitation(token)
      navigate(`/invite/deny?email=${encodeURIComponent(inviteData?.email || '')}`, { replace: true })
    } catch (err) {
      setServerError(err.userMessage || 'Failed to decline invitation.')
      setSubmitting(false)
    }
  }

  const handleAcceptClick = () => {
    navigate(`/invite/accept/${token}`)
  }

  if (loading) {
    return <LoadingOverlay message="Validating invitation credentials..." />
  }

  if (serverError) {
    return (
      <div className={styles.page} ref={root}>
        <div className={styles.errorCard} data-reveal>
          <CircleAlert size={42} className={styles.errorIcon} />
          <h1 className={styles.title}>Invitation unavailable</h1>
          <p className={styles.subtitle}>{serverError}</p>
          <button type="button" className={styles.acceptBtn} onClick={() => navigate('/login')} data-reveal>
            Return to login
          </button>
        </div>
      </div>
    )
  }

  const inviterName = inviteData?.inviterName || 'John Doe'
  const companyName = inviteData?.companyName || 'XYZ Inc.'

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>You're invited | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>You&apos;re invited</h1>
        <p className={styles.subtitle}>
          <strong>{inviterName}</strong> has invited you to join the <strong>{companyName}</strong> workspace on Nexgn.
        </p>
      </div>

      <div className={styles.form} data-reveal>
        <button type="button" className={styles.acceptBtn} onClick={handleAcceptClick} disabled={submitting}>
          <Check size={18} />
          <span>Accept invitation</span>
        </button>

        <button type="button" className={styles.declineBtn} onClick={handleDecline} disabled={submitting}>
          <X size={18} />
          <span>Decline</span>
        </button>

        <p className={styles.terms} data-reveal>
          By accepting, you agree to Nexgn&apos;s{' '}
          <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and{' '}
          <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
        </p>
      </div>

      {submitting && <LoadingOverlay message="Processing workspace response..." />}
    </div>
  )
}