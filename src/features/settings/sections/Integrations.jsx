import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Check, CircleAlert, Cloud, RefreshCw } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import Modal from '@/components/ui/Modal'
import { settingsService } from '@/services/settings.service'
import { prefersReducedMotion } from '@/utils/motion'
import form from '../components/form.module.css'
import styles from './Integrations.module.css'

gsap.registerPlugin(useGSAP)

const UPCOMING_TOOLS = [
  { id: 'onedrive', name: 'Microsoft OneDrive', desc: 'Automatically archive completed agreements to OneDrive folders.' },
  { id: 'dropbox', name: 'Dropbox', desc: 'Keep signed PDFs and audit trails synced with your Dropbox workspace.' },
]

function GoogleDriveLogo({ className }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}

function DisconnectModal({ open, mode = 'disconnect', busy, onClose, onConfirm }) {
  const isRemove = mode === 'remove'
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRemove ? 'Remove Integration ?' : 'Disconnect Integration ?'}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className={styles.modalCancel} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={clsx(form.save, styles.modalConfirm)}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <>
                <span className={form.spinner} aria-hidden="true" />
                <span className={form.srOnly}>{isRemove ? 'Removing' : 'Disconnecting'}</span>
              </>
            ) : isRemove ? (
              'Remove'
            ) : (
              'Disconnect'
            )}
          </button>
        </>
      }
    >
      <div className={styles.modalBody}>
        <p className={styles.modalLead} data-modal-in>
          Disconnecting will stop data sync and disable related workflows. Existing documents will not be affected.
        </p>
        <ul className={styles.modalList} data-modal-in>
          <li>No new document will sync</li>
          <li>Automations using this integration will stop</li>
          <li>You can reconnect anytime</li>
        </ul>
      </div>
    </Modal>
  )
}

function ConnectMoreModal({ open, connected, connecting, onClose, onConnectDrive }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect storage tools"
      size="sm"
      dismissible={!connecting}
      footer={
        <button type="button" className={styles.modalCancel} onClick={onClose} disabled={connecting}>
          Close
        </button>
      }
    >
      <div className={styles.catalog}>
        <div className={styles.catalogRow} data-modal-in>
          <div className={styles.catalogInfo}>
            <GoogleDriveLogo className={styles.catalogLogo} />
            <div>
              <strong>Google Drive</strong>
              <span>Sync signed documents directly to Drive</span>
            </div>
          </div>
          {connected ? (
            <span className={styles.connectedTag}>
              <Check aria-hidden="true" /> Connected
            </span>
          ) : (
            <button
              type="button"
              className={clsx(form.save, styles.catalogBtn)}
              onClick={onConnectDrive}
              disabled={connecting}
              aria-busy={connecting}
            >
              {connecting ? (
                <>
                  <span className={form.spinner} aria-hidden="true" />
                  <span className={form.srOnly}>Connecting</span>
                </>
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>

        {UPCOMING_TOOLS.map((tool) => (
          <div key={tool.id} className={clsx(styles.catalogRow, styles.catalogDisabled)} data-modal-in>
            <div className={styles.catalogInfo}>
              <span className={styles.catalogIconBox} aria-hidden="true">
                <Cloud />
              </span>
              <div>
                <strong>{tool.name}</strong>
                <span>{tool.desc}</span>
              </div>
            </div>
            <span className={styles.soonBadge}>Coming soon</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function IntegrationsSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading integrations">
      <div className={styles.card}>
        <div className={styles.head}>
          <div className={styles.skGroup}>
            <b className={styles.skTitle} />
            <b className={styles.skSub} />
          </div>
          <b className={styles.skBtn} />
        </div>
        <div className={styles.item}>
          <div className={styles.itemTop}>
            <div className={styles.brand}>
              <b className={styles.skLogo} />
              <div className={styles.skGroup}>
                <b className={styles.skName} />
                <b className={styles.skStatus} />
              </div>
            </div>
            <div className={styles.itemActions}>
              <b className={styles.skAction} />
              <b className={styles.skAction} />
            </div>
          </div>
          <b className={styles.skLine} />
          <b className={styles.skLineShort} />
        </div>
      </div>
    </div>
  )
}

export default function Integrations() {
  const { notify = () => {} } = useOutletContext() ?? {}
  const root = useRef(null)

  const [connected, setConnected] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, mode: 'disconnect' })
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    let active = true
    settingsService
      .getGoogleStatus()
      .then((status) => active && setConnected(Boolean(status)))
      .catch((err) => active && setLoadError(err))
    return () => {
      active = false
    }
  }, [reloadKey])

  const loading = connected === null && !loadError

  useGSAP(
    () => {
      if (loading || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-reveal]',
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.06, delay: 0.05, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root, dependencies: [loading] },
  )

  const handleConnect = async () => {
    if (connecting) return
    setConnecting(true)
    try {
      const url = await settingsService.getGoogleAuthUrl()
      if (!url) throw new Error('Missing Google authorization URL.')
      window.location.assign(url)
    } catch (err) {
      notify(err.userMessage || err.message || 'Could not start Google Drive connection.', 'error')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (disconnecting) return
    setDisconnecting(true)
    try {
      await settingsService.disconnectGoogle()
      setConnected(false)
      setConfirmModal((m) => ({ ...m, open: false }))
      notify(confirmModal.mode === 'remove' ? 'Google Drive removed' : 'Google Drive disconnected')
    } catch (err) {
      notify(err.userMessage || 'Could not disconnect Google Drive.', 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loadError) {
    return (
      <div className={styles.wrap}>
        <Helmet>
          <title>Integration | Settings | Nexgn</title>
        </Helmet>
        <div className={form.alert} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{loadError.userMessage || 'Could not load your integrations.'}</span>
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              setLoadError(null)
              setReloadKey((k) => k + 1)
            }}
          >
            <RefreshCw aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <IntegrationsSkeleton />

  return (
    <div className={styles.wrap} ref={root}>
      <Helmet>
        <title>Integration | Settings | Nexgn</title>
      </Helmet>

      <section className={styles.card} data-reveal aria-labelledby="integrations-heading">
        <header className={styles.head}>
          <div className={styles.headText}>
            <h3 id="integrations-heading" className={styles.title}>
              Bring your own storage
            </h3>
            <p className={styles.sub}>
              Connect Nexgn to your favourite tools to streamline your document workflow.
            </p>
          </div>

          <button
            type="button"
            className={clsx(form.save, styles.connectMoreBtn)}
            onClick={() => setMoreOpen(true)}
          >
            Connect more tool
          </button>
        </header>

        <div className={styles.list}>
          <article className={styles.item} data-reveal>
            <div className={styles.itemTop}>
              <div className={styles.brand}>
                <GoogleDriveLogo className={styles.logo} />
                <div className={styles.brandMeta}>
                  <h4 className={styles.name}>Google Drive</h4>
                  <span className={styles.status} data-connected={connected}>
                    {connected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>

              <div className={styles.itemActions}>
                {connected ? (
                  <>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => setConfirmModal({ open: true, mode: 'remove' })}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      className={styles.outlineBtn}
                      onClick={() => setConfirmModal({ open: true, mode: 'disconnect' })}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={clsx(form.save, styles.connectBtn)}
                    onClick={handleConnect}
                    disabled={connecting}
                    aria-busy={connecting}
                  >
                    {connecting ? (
                      <>
                        <span className={form.spinner} aria-hidden="true" />
                        <span className={form.srOnly}>Connecting</span>
                      </>
                    ) : (
                      'Connect'
                    )}
                  </button>
                )}
              </div>
            </div>

            <p className={styles.desc}>
              Sync your signed documents directly to Google Drive for instant access and secure storage. Enjoy seamless organization, real-time backup, and effortless sharing with your team.
            </p>
          </article>
        </div>
      </section>

      <DisconnectModal
        open={confirmModal.open}
        mode={confirmModal.mode}
        busy={disconnecting}
        onClose={() => setConfirmModal((m) => ({ ...m, open: false }))}
        onConfirm={handleDisconnect}
      />

      <ConnectMoreModal
        open={moreOpen}
        connected={connected}
        connecting={connecting}
        onClose={() => setMoreOpen(false)}
        onConnectDrive={handleConnect}
      />
    </div>
  )
}