import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import { prefersReducedMotion } from '@/utils/motion'
import styles from './InviteDeny.module.css'

gsap.registerPlugin(useGSAP)

export default function InviteDeny() {
  const root = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-reveal]',
        { y: 22, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' }
      )
    },
    { scope: root }
  )

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Invitation declined | Nexgn</title>
      </Helmet>

      <div className={styles.head} data-reveal>
        <h1 className={styles.title}>Invitation declined</h1>
        <p className={styles.subtitle}>
          Got it. You have chosen not to register into Nexgn. We respect your decision and appreciate your consideration.
        </p>
      </div>

      <div className={styles.actions} data-reveal>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => window.location.assign('https://nexgn.cloud')}
        >
          Visit nexgn.cloud
        </button>

        <p className={styles.hint}>
          Changed your mind? Ask your workspace admin to send you a new invitation request.
        </p>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => navigate('/login')}
        >
          Back to login
        </button>
      </div>
    </div>
  )
}