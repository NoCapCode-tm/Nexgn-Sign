import { Link } from 'react-router-dom'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <h1 className={styles.code}>404</h1>
      <p className={styles.text}>This page doesn't exist or was moved.</p>
      <Link to="/dashboard" className={styles.link}>Go to dashboard</Link>
    </main>
  )
}