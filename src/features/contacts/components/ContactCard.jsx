import { ChevronRight } from 'lucide-react'

import { getInitials } from '@/utils/formatters'
import styles from './ContactCard.module.css'

export default function ContactCard({ contact, onOpen }) {
  const sub = contact.email || contact.phone

  return (
    <li className={styles.item} data-row>
      <button type="button" className={styles.row} onClick={() => onOpen(contact)} aria-haspopup="dialog">
        <span className={styles.avatar} aria-hidden="true">
          {contact.photo ? <img src={contact.photo} alt="" loading="lazy" /> : <b>{getInitials(contact.name)}</b>}
        </span>
        <span className={styles.text}>
          <span className={styles.name}>{contact.name}</span>
          {sub && <span className={styles.sub}>{sub}</span>}
        </span>
        <ChevronRight className={styles.chev} aria-hidden="true" />
      </button>
    </li>
  )
}