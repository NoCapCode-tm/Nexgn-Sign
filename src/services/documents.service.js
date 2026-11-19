import { apiClient } from './apiClient'

const PENDING_STATUSES = ['pending', 'sent', 'partially_signed']

const personLabel = (p) => (typeof p === 'string' ? p : p?.name || p?.fullName || p?.email || '')

function pickSigners(raw) {
  const list = raw.signers ?? raw.recipients ?? raw.signatories ?? (raw.signer ? [raw.signer] : [])
  const names = (Array.isArray(list) ? list : [list]).map(personLabel).filter(Boolean)
  if (!names.length && raw.signerName) names.push(raw.signerName)
  if (!names.length && raw.signerEmail) names.push(raw.signerEmail)
  return names
}

export function normalizeDocument(raw = {}) {
  const rawStatus = String(raw.status ?? raw.overallStatus ?? 'pending').toLowerCase()

  let status = 'pending'
  if (rawStatus === 'completed' || rawStatus === 'signed') {
    status = 'signed'
  } else if (rawStatus === 'expired') {
    status = 'expired'
  } else if (PENDING_STATUSES.includes(rawStatus)) {
    status = 'pending'
  }

  const signerNames = pickSigners(raw)

  return {
    ...raw,
    id: String(raw.id ?? raw._id ?? raw.title ?? ''),
    _id: raw._id ?? raw.id,
    title: raw.title ?? raw.name ?? raw.documentName ?? 'Untitled document',
    name: raw.name ?? raw.title ?? raw.documentName ?? 'Untitled document',
    note: raw.note ?? raw.message ?? '',
    signer: signerNames.length
      ? signerNames[0] + (signerNames.length > 1 ? ` +${signerNames.length - 1}` : '')
      : '—',
    signedAt: raw.signedAt ?? raw.updatedAt ?? raw.createdAt ?? null,
    owner: Array.isArray(raw.owners)
      ? raw.owners.map((o) => o?.name ?? String(o))
      : (raw.owner?.name ?? raw.ownerName ?? raw.owner ?? 'You'),
    status,
    rawStatus,
  }
}

export const documentsService = {
  // Fetches all documents from GET /document/getdocument
  getAllDocuments: async () => {
    const { data } = await apiClient.get('/document/getdocument')
    const list = data?.message ?? data?.documents ?? data ?? []
    return Array.isArray(list) ? list : []
  },

  // Fetches all sign requests from GET /sign/getrequests
  getSignRequests: async () => {
    const { data } = await apiClient.get('/sign/getrequests')
    const list = data?.message ?? data?.requests ?? data ?? []
    return Array.isArray(list) ? list : []
  },

  // Combined fetch used by Dashboard so /document/getdocument isn't called twice
  getDashboardOverview: async () => {
    const [rawDocs, rawRequests] = await Promise.all([
      documentsService.getAllDocuments(),
      documentsService.getSignRequests(),
    ])

    const completed = rawDocs.filter((d) => d.status === 'completed' || d.status === 'signed').length
    const total = rawDocs.length
    const pending = rawDocs.filter(
      (d) => d.status === 'sent' || d.status === 'partially_signed' || d.status === 'pending',
    ).length
    const expired = rawRequests.filter((r) => r.overallStatus === 'Expired' || r.status === 'expired').length

    return {
      rawDocs,
      documents: rawDocs.map(normalizeDocument),
      stats: {
        total,
        pending,
        signed: completed,
        expired,
        trends: { total: 12, pending: 8, signed: 18, expired: -3 },
      },
    }
  },

  stats: async () => {
    const { stats } = await documentsService.getDashboardOverview()
    return stats
  },

  recent: async ({ status = 'all', limit } = {}) => {
    const rawDocs = await documentsService.getAllDocuments()
    const normalized = rawDocs.map(normalizeDocument)
    const filtered = normalized.filter((d) => status === 'all' || d.status === status)
    return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
  },

  remind: async (id) => {
    const { data } = await apiClient.post(`/documents/${id}/remind`)
    return data
  },

  remove: async (id) => {
    const { data } = await apiClient.delete(`/documents/${id}`)
    return data
  },

  download: async (doc) => {
    const docId = doc.id ?? doc._id
    const res = await apiClient.get(`/documents/${docId}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.name || doc.title || 'document'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  },
}