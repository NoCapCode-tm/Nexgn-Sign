import { Outlet } from 'react-router-dom'
import styles from './PublicSignLayout.module.css'

export default function PublicSignLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <img src="/brand/logo.svg" alt="Nexgn" />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}