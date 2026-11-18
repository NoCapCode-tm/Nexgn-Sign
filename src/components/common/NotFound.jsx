import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

import useNotFoundAnimations from '../../hooks/useNotFoundAnimations'
import illustration404 from '../../assets/core/404-illustration.svg'
import styles from './NotFound.module.css'

export default function NotFound() {
  const rootRef = useRef(null)

  // Initialize GSAP animations
  useNotFoundAnimations(rootRef)

  return (
    <div className={styles.page} ref={rootRef}>
      <Helmet>
        <title>Page Not Found | Nexgn</title>
        <meta
          name="description"
          content="The page you are looking for does not exist or has been moved."
        />
      </Helmet>

      <div className={styles.container}>
        <img
          src={illustration404}
          alt="404 Page Not Found"
          className={styles.illustration}
          data-nf="img"
        />

        <h1 className={styles.title} data-nf="text">
          Page Not Found
        </h1>

        <p className={styles.desc} data-nf="text">
          Sorry we are having some technical issue.
          <br />
          Try to refresh the page, after a while.
        </p>

        <Link to="/dashboard" className={styles.link} data-nf="text">
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}