import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Check, CircleAlert, CreditCard, FileText, RefreshCw } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import Modal from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { settingsService } from '@/services/settings.service'
import { formatDate, formatLongDate } from '@/utils/formatters'
import { prefersReducedMotion } from '@/utils/motion'
import form from '../components/form.module.css'
import styles from './Billing.module.css'

gsap.registerPlugin(useGSAP)

const CURRENCY_SYMBOL = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
}

const STATUS_LABEL = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
}

function formatPlanPrice(amount, currency = 'INR') {
  const num = Number(amount) || 0
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `
  const formatted = Number.isInteger(num) ? num.toLocaleString('en-IN') : num.toFixed(2)
  return `${symbol}${formatted}`
}

function formatInvoiceAmount(amount, currency = 'INR') {
  const num = Number(amount) || 0
  const formatted = Number.isInteger(num) ? String(num) : num.toFixed(2)
  return `${currency} ${formatted}`
}

function formatPeriodSuffix(period = 'Monthly') {
  const p = period.toLowerCase()
  if (p.includes('year') || p.includes('annual')) return '/year'
  if (p.includes('week')) return '/week'
  return '/month'
}

function CloudDownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 13v8l-3-3m3 3 3-3" />
      <path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    </svg>
  )
}

function CardBrandBadge({ brand = 'Visa' }) {
  const key = brand.toLowerCase()
  if (key.includes('visa')) {
    return (
      <span className={styles.brandBox} aria-label="Visa">
        <span className={styles.visa}>VISA</span>
      </span>
    )
  }
  return (
    <span className={styles.brandBox} aria-label={brand}>
      <CreditCard className={styles.brandIcon} aria-hidden="true" />
      <span className={styles.brandText}>{brand}</span>
    </span>
  )
}

function PaymentEditModal({ open, onClose, billingEmail, onUpgrade }) {
  const uid = useId()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment method"
      size="sm"
      footer={
        <>
          <button type="button" className={form.cancel} onClick={onClose}>
            Close
          </button>
          <button type="button" className={form.save} onClick={onUpgrade}>
            Manage plan
          </button>
        </>
      }
    >
      <div className={styles.modalBody} data-modal-in>
        <p>
          Your payment method is securely managed through your billing checkout provider. To switch cards or change your billing cycle, open the plans page.
        </p>
        {billingEmail && (
          <div className={form.field}>
            <label htmlFor={`${uid}-email`} className={form.label}>
              Billing address
            </label>
            <input id={`${uid}-email`} type="email" value={billingEmail} readOnly aria-readonly="true" className={form.input} />
          </div>
        )}
      </div>
    </Modal>
  )
}

function BillingSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading billing">
      <div className={styles.topGrid}>
        <div className={clsx(styles.card, styles.skCard)}>
          <div className={styles.skRow}>
            <b className={styles.skTitle} />
            <b className={styles.skPrice} />
          </div>
          <b className={styles.skLine} />
          <b className={styles.skLineShort} />
          <b className={styles.skBar} />
        </div>
        <div className={clsx(styles.card, styles.skCard)}>
          <b className={styles.skTitle} />
          <b className={styles.skLine} />
          <b className={styles.skLineShort} />
          <b className={styles.skLine} />
        </div>
      </div>

      <div className={styles.invoiceSection}>
        <div className={styles.invoiceHead}>
          <b className={styles.skTitle} />
          <b className={styles.skBtn} />
        </div>
        <div className={styles.table}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.skelRow} aria-hidden="true">
              <b />
              <b />
              <b />
              <b />
              <b />
              <b />
              <b />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Billing() {
  const { notify = () => {} } = useOutletContext() ?? {}
  const { user } = useAuth()
  const navigate = useNavigate()
  const root = useRef(null)

  const [billing, setBilling] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let active = true
    settingsService
      .getBilling()
      .then((data) => active && setBilling(data))
      .catch((err) => active && setLoadError(err))
    return () => {
      active = false
    }
  }, [reloadKey])

  const loading = !billing && !loadError

  useGSAP(
    () => {
      if (loading || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-reveal]',
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06, delay: 0.05, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
      if (root.current?.querySelector('[data-row]')) {
        gsap.fromTo(
          '[data-row]',
          { y: 12, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.04, delay: 0.14, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
        )
      }
    },
    { scope: root, dependencies: [loading] },
  )

  const usagePercent = useMemo(() => {
    if (!billing?.plan?.limit) return 0
    return Math.min(100, Math.max(0, Math.round((billing.plan.used / billing.plan.limit) * 100)))
  }, [billing])

  const triggerDownload = (invoice) => {
    if (!invoice?.url) {
      notify('Invoice file is not ready yet. Please try again later.', 'error')
      return
    }
    window.open(invoice.url, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadAll = () => {
    const downloadable = (billing?.invoices ?? []).filter((inv) => inv.url)
    if (!downloadable.length) {
      notify('No downloadable invoices available yet.', 'error')
      return
    }
    downloadable.forEach((inv, idx) => {
      window.setTimeout(() => {
        window.open(inv.url, '_blank', 'noopener,noreferrer')
      }, idx * 200)
    })
    notify(`Opening ${downloadable.length} ${downloadable.length === 1 ? 'invoice' : 'invoices'}`)
  }

  if (loadError) {
    return (
      <div className={styles.wrap}>
        <Helmet>
          <title>Billing | Settings | Nexgn</title>
        </Helmet>
        <div className={form.alert} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{loadError.userMessage || 'Could not load your billing details.'}</span>
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

  if (loading) return <BillingSkeleton />

  const { plan, paymentMethod, nextBillingDate, invoices } = billing
  const billingEmail = billing.billingEmail || user?.email || '—'
  const planTitle = /plan$/i.test(plan.name) ? plan.name : `${plan.name} Plan`
  const periodLabel = plan.billingPeriod ? plan.billingPeriod[0].toUpperCase() + plan.billingPeriod.slice(1) : 'Monthly'

  return (
    <div className={styles.wrap} ref={root}>
      <Helmet>
        <title>Billing | Settings | Nexgn</title>
      </Helmet>

      {/* ---------- Top Cards: Plan + Payment Method ---------- */}
      <div className={styles.topGrid}>
        <section className={styles.card} data-reveal aria-labelledby="billing-plan-heading">
          <div className={styles.planHead}>
            <div className={styles.planMeta}>
              <h3 id="billing-plan-heading" className={styles.cardTitle}>
                {planTitle}
              </h3>
              <span className={styles.periodBadge}>{periodLabel}</span>
            </div>

            <div className={styles.priceWrap}>
              <span className={styles.price}>{formatPlanPrice(plan.price, plan.currency)}</span>
              <span className={styles.period}>{formatPeriodSuffix(plan.billingPeriod)}</span>
            </div>
          </div>

          <hr className={styles.divider} />

          {plan.features.length > 0 && (
            <ul className={styles.features}>
              {plan.features.map((feat, i) => (
                <li key={i}>{feat}</li>
              ))}
            </ul>
          )}

          <div className={styles.usageBlock}>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Envelopes used this month"
              aria-valuemin={0}
              aria-valuemax={plan.limit || 0}
              aria-valuenow={plan.used}
            >
              <span className={styles.progressFill} style={{ width: `${usagePercent}%` }} />
            </div>
            <div className={styles.usageMeta}>
              <span>Envelopes used this month.</span>
              <span className={styles.usageCount}>
                {plan.limit > 0 ? `${plan.used}/${plan.limit}` : `${plan.used}`}
              </span>
            </div>
          </div>

          <div className={styles.planFoot}>
            <button type="button" className={styles.upgradeBtn} onClick={() => navigate('/pricing')}>
              Upgrade plan
            </button>
          </div>
        </section>

        <section className={styles.card} data-reveal aria-labelledby="billing-payment-heading">
          <div className={styles.paymentHead}>
            <h3 id="billing-payment-heading" className={styles.cardTitle}>
              Payment Method
            </h3>
            <p className={styles.cardSub}>Change how you pay for your plan</p>
          </div>

          <hr className={styles.divider} />

          <div className={styles.methodRow}>
            <div className={styles.methodLeft}>
              <CardBrandBadge brand={paymentMethod.brand} />
              <div className={styles.cardInfo}>
                <span className={styles.cardNumber}>
                  {paymentMethod.last4
                    ? `${paymentMethod.brand} ending in ${paymentMethod.last4}`
                    : `${paymentMethod.brand} on file`}
                </span>
                <span className={styles.cardExpiry}>
                  {paymentMethod.expiry ? `Expire by ${paymentMethod.expiry}` : 'Managed via checkout'}
                </span>
              </div>
            </div>

            <button type="button" className={styles.outlineBtn} onClick={() => setEditOpen(true)}>
              Edit
            </button>
          </div>

          <dl className={styles.billingFacts}>
            <div>
              <dt>Next billing date :</dt>
              <dd>{nextBillingDate ? formatLongDate(nextBillingDate) : '—'}</dd>
            </div>
            <div>
              <dt>Billing address :</dt>
              <dd>{billingEmail}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* ---------- Bottom Section: Billing and Invoice ---------- */}
      <section className={styles.invoiceSection} data-reveal aria-labelledby="billing-invoices-heading">
        <div className={styles.invoiceHead}>
          <h3 id="billing-invoices-heading" className={styles.sectionTitle}>
            Billing and Invoice
          </h3>
          <button
            type="button"
            className={clsx(styles.outlineBtn, styles.downloadAllBtn)}
            onClick={handleDownloadAll}
            disabled={!invoices.length}
          >
            <CloudDownloadIcon />
            <span>Download All</span>
          </button>
        </div>

        <div className={styles.table} role="table" aria-label="Billing invoices">
          <div className={styles.thead} role="row">
            <span role="columnheader">SL.NO</span>
            <span role="columnheader">INVOICE</span>
            <span role="columnheader" className={styles.cDate}>
              BILLING DATE
            </span>
            <span role="columnheader" className={styles.cStatus}>
              STATUS
            </span>
            <span role="columnheader" className={styles.cAmount}>
              AMOUNT
            </span>
            <span role="columnheader" className={styles.cPlan}>
              PLAN
            </span>
            <span role="columnheader" className={styles.cAction}>
              <span className={form.srOnly}>Download</span>
            </span>
          </div>

          <div role="rowgroup">
            {invoices.length === 0 ? (
              <div className={styles.empty}>
                <FileText aria-hidden="true" />
                <strong>No invoices yet</strong>
                <span>Your billing history and downloadable receipts will appear here.</span>
              </div>
            ) : (
              invoices.map((inv, idx) => (
                <div key={inv.id} className={styles.row} role="row" data-row>
                  <span className={styles.cSl} role="cell">
                    {idx + 1}.
                  </span>

                  <span className={styles.cInvoice} role="cell" title={inv.number}>
                    {inv.number}
                  </span>

                  <span className={styles.cDate} role="cell">
                    {formatDate(inv.date)}
                  </span>

                  <span className={styles.cStatus} role="cell">
                    <span className={styles.statusPill} data-s={inv.status}>
                      {inv.status === 'paid' && <Check aria-hidden="true" />}
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </span>

                  <span className={styles.cAmount} role="cell">
                    {formatInvoiceAmount(inv.amount, inv.currency)}
                  </span>

                  <span className={styles.cPlan} role="cell">
                    {inv.plan}
                  </span>

                  <span className={styles.cAction} role="cell">
                    <button
                      type="button"
                      className={styles.downloadLink}
                      onClick={() => triggerDownload(inv)}
                    >
                      Download
                    </button>
                  </span>

                  <p className={styles.mobileMeta}>
                    {formatDate(inv.date)} · {inv.plan} · <b>{formatInvoiceAmount(inv.amount, inv.currency)}</b>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <PaymentEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        billingEmail={billing.billingEmail || user?.email || ''}
        onUpgrade={() => {
          setEditOpen(false)
          navigate('/pricing')
        }}
      />
    </div>
  )
}