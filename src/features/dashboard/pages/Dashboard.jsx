import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  FileCheck2,
  FileText,
  FileX2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import Topbar from '@/components/layout/Topbar'
import StatCard, { StatCardDefs } from '@/components/ui/StatCard'
import Toast from '@/components/ui/Toast'
import RecentDocuments from '@/features/dashboard/components/RecentDocuments'
import { useAuth } from '@/hooks/useAuth'
import { documentsService, normalizeDocument } from '@/services/documents.service'
import { getDisplayName } from '@/utils/formatters'
import { prefersReducedMotion } from '@/utils/motion'
import { trendPercent } from '@/utils/trends'
import styles from './Dashboard.module.css'

gsap.registerPlugin(useGSAP)

const PAGE_SIZES = [5, 10, 20]
const KPIS = [
  { key: 'total', label: 'Total documents', Icon: FileText, to: '/documents' },
  { key: 'pending', label: 'Pending', Icon: Clock, to: '/documents?status=pending' },
  { key: 'signed', label: 'Signed', Icon: FileCheck2, to: '/documents?status=signed' },
  { key: 'expired', label: 'Expired', Icon: FileX2, to: '/documents?status=expired' },
]

const isExpiredRequest = (r) =>
  r?.overallStatus === 'Expired' || String(r?.status ?? '').toLowerCase() === 'expired'

export default function Dashboard() {
  const root = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(5)

  const isAdmin = user?.role === 'Admin'
  const canView = isAdmin || !!user?.permissions?.includes('Dashboard-View')
  const canAnalytics = isAdmin || !!user?.permissions?.includes('Dashboard-Analytics')
  const firstName = getDisplayName(user).split(' ')[0]

  // Same calls as the old dashboard: document/getdocument + sign/getrequests
  useEffect(() => {
    if (!canView) return undefined
    let active = true

    Promise.all([documentsService.getAllDocuments(), documentsService.getSignRequests()])
      .then(([rawDocs, requests]) => {
        if (!active) return
        if (import.meta.env.DEV) console.debug('[dashboard] first document from the API:', rawDocs[0])

        const docs = rawDocs.map(normalizeDocument)
        const pending = docs.filter((d) => d.status === 'pending')
        const signed = docs.filter((d) => d.status === 'signed')
        const expired = requests.filter(isExpiredRequest)

        setData({
          docs,
          expiredCount: expired.length,
          // Real trends: last 30 days vs the 30 days before. null = nothing to compare, badge is hidden.
          trends: {
            total: trendPercent(docs, (d) => d.createdAt),
            pending: trendPercent(pending, (d) => d.createdAt),
            signed: trendPercent(signed, (d) => d.signedAt ?? d.updatedAt ?? d.createdAt),
            expired: trendPercent(expired, (r) => r.createdAt),
          },
        })
      })
      .catch((err) => active && setLoadError(err))

    return () => {
      active = false
    }
  }, [canView, reloadKey])

  const loading = canView && !data && !loadError
  const docs = useMemo(() => data?.docs ?? [], [data])

  const stats = useMemo(
    () => ({
      total: docs.length,
      pending: docs.filter((d) => d.status === 'pending').length,
      signed: docs.filter((d) => d.status === 'signed').length,
      expired: data?.expiredCount ?? 0,
    }),
    [docs, data],
  )

  const filtered = useMemo(() => (filter === 'all' ? docs : docs.filter((d) => d.status === filter)), [docs, filter])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const rows = filtered.slice(start, start + perPage)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-enter]',
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.08, delay: 0.15, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root },
  )

  const showToast = useCallback((text, tone = 'ok') => setToast({ id: Date.now(), text, tone }), [])
  const clearToast = useCallback(() => setToast(null), [])

  const handleAction = useCallback(
    async (action, doc) => {
      const id = doc._id ?? doc.id
      try {
        switch (action) {
          case 'view':
            navigate(`/documents/${id}`)
            break
          case 'history':
            navigate(`/documents/${id}?tab=history`)
            break
          case 'download':
            await documentsService.download(doc)
            showToast('Download started')
            break
          case 'remind':
            await documentsService.remind(id)
            showToast(`Reminder sent for "${doc.name}"`)
            break
          case 'delete':
            await documentsService.remove(id)
            setData((d) => (d ? { ...d, docs: d.docs.filter((x) => x.id !== doc.id) } : d))
            showToast(`"${doc.name}" moved to Recycle bin`)
            break
          default:
            break
        }
        return true
      } catch (err) {
        showToast(err.userMessage || 'Action failed. Please try again.', 'error')
        return false
      }
    },
    [navigate, showToast],
  )

  const footer = !loading && total > 0 && (
    <footer className={styles.pagination}>
      <label className={styles.pageSize}>
        <span>Rows per page:</span>
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value))
            setPage(1)
          }}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.pageNav}>
        <span className={styles.pageInfo}>
          {start + 1} – {Math.min(start + perPage, total)} of {total}
        </span>
        <button type="button" className={styles.pageBtn} disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
          <ChevronLeft aria-hidden="true" />
        </button>
        <button type="button" className={styles.pageBtn} disabled={current === totalPages} onClick={() => setPage(current + 1)} aria-label="Next page">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </footer>
  )

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Dashboard | Nexgn</title>
      </Helmet>

      <StatCardDefs />

      <Topbar
        title={`Hello again, ${firstName}`}
        subtitle="Here's how your agreements are moving this week."
        onUpload={() => navigate('/documents/sign-yourself')}
      />

      {!canView ? (
        <section className={styles.restricted} data-enter>
          <span className={styles.restrictedIcon}>
            <ShieldAlert aria-hidden="true" />
          </span>
          <h3>Access restricted</h3>
          <p>You are not permitted to view the dashboard.</p>
        </section>
      ) : (
        <>
          {loadError && (
            <div className={styles.alert} role="alert">
              <CircleAlert aria-hidden="true" />
              <span>{loadError.userMessage || 'Failed to load dashboard'}</span>
              <button
                type="button"
                onClick={() => {
                  setLoadError(null)
                  setReloadKey((k) => k + 1)
                }}
              >
                <RefreshCw aria-hidden="true" /> Retry
              </button>
            </div>
          )}

          {canAnalytics && (
            <section className={styles.stats} aria-label="Document statistics">
              {KPIS.map(({ key, label, Icon, to }) => (
                <div key={key} data-enter>
                  <StatCard
                    label={label}
                    Icon={Icon}
                    to={to}
                    tone={key}
                    value={loading ? undefined : stats[key]}
                    trend={data?.trends[key]}
                    loading={loading}
                  />
                </div>
              ))}
            </section>
          )}

          <div data-enter data-tour="dashboard">
            <RecentDocuments
              docs={rows}
              loading={loading}
              filter={filter}
              onFilterChange={(key) => {
                setFilter(key)
                setPage(1)
              }}
              onAction={handleAction}
              skeletonRows={perPage}
              footer={footer}
            />
          </div>
        </>
      )}

      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}