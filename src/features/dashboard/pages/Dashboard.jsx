import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  FileX2,
  ShieldAlert,
} from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import Topbar from '@/components/layout/Topbar'
import StatCard, { StatCardDefs } from '@/components/ui/StatCard'
import Toast from '@/components/ui/Toast'
import RecentDocuments from '@/features/dashboard/components/RecentDocuments'
import { authService } from '@/services/auth.service'
import { documentsService, normalizeDocument } from '@/services/documents.service'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './Dashboard.module.css'

gsap.registerPlugin(useGSAP)

export default function Dashboard() {
  const root = useRef(null)
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [rawDocs, setRawDocs] = useState([])
  const [expiredCount, setExpiredCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Filter & Pagination States
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const showToast = useCallback((text, tone = 'ok') => {
    setToast({ id: Date.now(), text, tone })
  }, [])

  // Fetch /admin/me, /document/getdocument, and /sign/getrequests
  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        setLoading(true)

        const currentUser = await authService.me()
        if (!mounted) return
        setUser(currentUser)

        const canView =
          currentUser?.role === 'Admin' ||
          currentUser?.permissions?.includes('Dashboard-View')

        if (!canView) {
          showToast('You are not permitted to view the dashboard', 'error')
          setLoading(false)
          return
        }

        const [docsList, signRequests] = await Promise.all([
          documentsService.getAllDocuments(),
          documentsService.getSignRequests(),
        ])

        if (!mounted) return

        setRawDocs(docsList)
        setExpiredCount(
          signRequests.filter(
            (req) => req.overallStatus === 'Expired' || req.status === 'expired',
          ).length,
        )
      } catch (err) {
        if (!mounted) return
        showToast(err.userMessage || 'Failed to load dashboard', 'error')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      mounted = false
    }
  }, [showToast])

  // Entrance GSAP animation
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-enter]',
        { y: 20, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      )
    },
    { scope: root },
  )

  // KPI counts matching Dashboard-old.jsx
  const { completed, total, pending } = useMemo(() => {
    const completedCount = rawDocs.filter(
      (d) => d.status === 'completed' || d.status === 'signed',
    ).length
    const totalCount = rawDocs.length
    const pendingCount = rawDocs.filter(
      (d) =>
        d.status === 'sent' ||
        d.status === 'partially_signed' ||
        d.status === 'pending',
    ).length

    return { completed: completedCount, total: totalCount, pending: pendingCount }
  }, [rawDocs])

  const kpiCards = useMemo(
    () => [
      {
        label: 'Total documents',
        value: total,
        trend: 12,
        tone: 'total',
        to: '/documents',
        Icon: FileText,
      },
      {
        label: 'Pending',
        value: pending,
        trend: 8,
        tone: 'pending',
        to: '/documents?status=pending',
        Icon: Clock,
      },
      {
        label: 'Signed',
        value: completed,
        trend: 18,
        tone: 'signed',
        to: '/documents?status=signed',
        Icon: FileCheck2,
      },
      {
        label: 'Expired',
        value: expiredCount,
        trend: -3,
        tone: 'expired',
        to: '/documents?status=expired',
        Icon: FileX2,
      },
    ],
    [total, pending, completed, expiredCount],
  )

  // Normalize documents for RecentDocuments.jsx
  const normalizedDocs = useMemo(() => rawDocs.map(normalizeDocument), [rawDocs])

  // Filter normalized docs by active tab ('all' | 'pending' | 'signed' | 'expired')
  const filteredDocs = useMemo(() => {
    if (filter === 'all') return normalizedDocs
    return normalizedDocs.filter((d) => d.status === filter)
  }, [normalizedDocs, filter])

  // Pagination slice
  const totalItems = filteredDocs.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentDocs = filteredDocs.slice(indexOfFirstItem, indexOfLastItem)

  const handleFilterChange = useCallback((nextFilter) => {
    setFilter(nextFilter)
    setCurrentPage(1)
  }, [])

  // Handle QuickActions & RowMenu actions from RecentDocuments.jsx
  const handleAction = useCallback(
    async (action, doc) => {
      try {
        if (action === 'view') {
          navigate(`/documents/${doc.id}`)
          return true
        }
        if (action === 'history') {
          navigate(`/documents/${doc.id}?tab=history`)
          return true
        }
        if (action === 'download') {
          await documentsService.download(doc)
          showToast('Download started')
          return true
        }
        if (action === 'remind') {
          await documentsService.remind(doc.id)
          showToast(`Reminder sent for "${doc.name}"`)
          return true
        }
        if (action === 'delete') {
          await documentsService.remove(doc.id)
          setRawDocs((prev) =>
            prev.filter((d) => String(d._id ?? d.id ?? d.title) !== String(doc.id)),
          )
          showToast(`"${doc.name}" moved to Recycle bin`)
          return true
        }
      } catch (err) {
        showToast(err.userMessage || 'Action failed. Please try again.', 'error')
        return false
      }
      return true
    },
    [navigate, showToast],
  )

  const canViewDashboard =
    !user ||
    user?.role === 'Admin' ||
    user?.permissions?.includes('Dashboard-View')

  const canViewAnalytics =
    user?.role === 'Admin' ||
    user?.permissions?.includes('Dashboard-Analytics')

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Dashboard | Nexgn</title>
      </Helmet>

      <StatCardDefs />

      <Topbar
        title="Dashboard"
        subtitle="Overview of your document signing activity"
        onUpload={() => navigate('/documents/sign-yourself')}
      />

      {!loading && !canViewDashboard ? (
        <section className={styles.emptyState} data-enter>
          <div className={styles.emptyIcon}>
            <ShieldAlert size={24} />
          </div>
          <h3>Access Restricted</h3>
          <p>You are not permitted to view the dashboard.</p>
        </section>
      ) : (
        <>
          {(loading || canViewAnalytics) && (
            <section className={styles.statsGrid} aria-label="Document statistics" data-enter>
              {kpiCards.map((card) => (
                <StatCard key={card.label} {...card} loading={loading} />
              ))}
            </section>
          )}

          <div className={styles.recentWrap} data-tour="dashboard" data-enter>
            <RecentDocuments
              docs={currentDocs}
              loading={loading}
              filter={filter}
              onFilterChange={handleFilterChange}
              onAction={handleAction}
            />

            {!loading && totalItems > 0 && (
              <footer className={styles.pagination}>
                <div className={styles.paginationLeft}>
                  <label htmlFor="dashboard-rows-select" className={styles.paginationLabel}>
                    Rows per page:
                  </label>
                  <select
                    id="dashboard-rows-select"
                    className={styles.paginationSelect}
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className={styles.paginationRight}>
                  <span className={styles.paginationInfo}>
                    {indexOfFirstItem + 1} – {Math.min(indexOfLastItem, totalItems)} of {totalItems}
                  </span>
                  <div className={styles.paginationControls}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </footer>
            )}
          </div>
        </>
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  )
}