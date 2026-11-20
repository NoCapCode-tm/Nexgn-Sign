import { Pencil } from 'lucide-react'

import Modal from '@/components/ui/Modal'
import { getInitials } from '@/utils/formatters'
import styles from './ContactDetailsModal.module.css'

const STATUS_LABEL = { active: 'Active', inactive: 'Inactive' }

export default function ContactDetailsModal({ open, contact, onClose, onEdit }) {
  if (!contact) return null

  const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Contact details"
      size="sm"
      headerExtra={
        <button type="button" className={styles.edit} onClick={() => onEdit(contact)}>
          <Pencil aria-hidden="true" />
          <span>Edit details</span>
        </button>
      }
    >
      <div className={styles.layout}>
        <div className={styles.identity} data-modal-in>
          <div className={styles.photo}>
            {contact.photo ? <img src={contact.photo} alt="" /> : <span aria-hidden="true">{getInitials(contact.name)}</span>}
          </div>
          <h3 className={styles.name}>{contact.name}</h3>
          {contact.status && (
            <span className={styles.pill} data-s={contact.status}>
              <i aria-hidden="true" />
              {STATUS_LABEL[contact.status]}
            </span>
          )}
        </div>

        <span className={styles.rule} aria-hidden="true" />

        <dl className={styles.facts}>
          <div data-modal-in>
            <dt>Full Name</dt>
            <dd>{contact.name || '—'}</dd>
          </div>
          <div data-modal-in>
            <dt>Gender</dt>
            <dd>{contact.gender || '—'}</dd>
          </div>
          <div data-modal-in>
            <dt>Contact</dt>
            <dd>{contact.phone ? <a href={phoneHref}>{contact.phone}</a> : '—'}</dd>
          </div>
          <div data-modal-in>
            <dt>Email Address</dt>
            <dd>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : '—'}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  )
}