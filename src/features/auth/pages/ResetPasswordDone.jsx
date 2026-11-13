import { useRef } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowRight } from 'lucide-react'

import { motion, prefersReducedMotion } from '@/utils/motion'
import styles from './ResetPasswordDone.module.css'

gsap.registerPlugin(useGSAP)

function DoneContent() {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-reveal]',
        { y: 22, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.1,
          delay: motion.first ? 0.9 : 0.4, // waits for the card to finish resizing
          clearProps: 'transform',
        },
      )
    },
    { scope: root },
  )

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Password reset | Nexgn</title>
      </Helmet>

      <h1 className={styles.title} data-reveal>
        All done!
      </h1>
      <p className={styles.subtitle} data-reveal>
        You&rsquo;ve successfully reset your password
      </p>
      <Link to="/login" replace className={styles.cta} data-reveal>
        <span>Back to login</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  )
}

export default function ResetPasswordDone() {
  const { state } = useLocation()
  // Only reachable right after a successful reset. Opening the URL directly goes to login.
  // (To preview the design without the API, comment out the next line temporarily.)
  if (!state?.reset) return <Navigate to="/login" replace />
  return <DoneContent />
}