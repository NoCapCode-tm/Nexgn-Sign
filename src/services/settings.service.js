import { apiClient } from './apiClient'
import { has2FA } from '@/utils/twoFactor'
import { syncNotificationPrefs } from '@/utils/notificationSound'

const ENDPOINTS = {
  me: '/admin/me',
  teams: '/admin/teams',
  updateAccount: '/admin/update',
  twoFactorSetup: '/admin/twofa',
  twoFactorVerify: '/admin/twofaverify',
  twoFactorDisable: '/admin/disabletwofa',
  notifications: '/notification/preferences',
  team: '/admin/getsubadmin',
  invite: '/admin/invite',
  addPermissions: '/admin/addpermissions',
  deleteMember: '/admin/delete',
  subscription: '/subscription/mysubscription',
  auditLogs: '/activity/getactivity',
  googleStatus: '/google/status',
  googleAuthUrl: '/google/auth-url',
  googleDisconnect: '/google/disconnect',
  recycleBin: '/settings/recycle-bin',
}

export const SNOOZE_OPTIONS = [
  { value: 15, label: '15 Minutes' },
  { value: 30, label: '30 Minutes' },
  { value: 60, label: '01 Hour' },
  { value: 720, label: '12 Hour' },
]

const NOTIFICATION_CATALOG = [
  // General (no heading, as in the design)
  {
    key: 'notification_sound',
    group: '',
    label: 'Notification Sound',
    description: 'Switch off notification sound',
    defaultEnabled: true,
  },
  {
    key: 'snooze_notification',
    group: '',
    type: 'snooze',
    durationKey: 'snooze_duration', // stored in minutes
    label: 'Snooze Notification',
    description: 'Switch off notification for certain period of time',
  },

  // Existing options (unchanged)
  {
    key: 'realtime_document_signed',
    group: 'Realtime Notification',
    label: 'Document Signed',
    description: 'Show an alert when someone signs your document',
  },
  {
    key: 'realtime_signature_request',
    group: 'Realtime Notification',
    label: 'Signature Request Received',
    description: 'Show an alert when you receive a new signature request',
  },
  {
    key: 'realtime_document_expired',
    group: 'Realtime Notification',
    label: 'Document Expired',
    description: 'Alert me when a pending document passes its expiration date',
  },
  {
    key: 'realtime_security',
    group: 'Realtime Notification',
    label: 'Security Alerts',
    description: 'Important alerts about logins, password changes, and two-factor authentication',
  },
  {
    key: 'email_document_signed',
    group: 'Email Notification',
    label: 'Document Signed',
    description: 'Receive an email when someone signs your document',
  },
  {
    key: 'email_signature_request',
    group: 'Email Notification',
    label: 'Signature Request Received',
    description: 'Get an email when you receive a new signature request',
  },
  {
    key: 'email_document_expired',
    group: 'Email Notification',
    label: 'Document Expired',
    description: 'Email me when a pending document passes its expiration date',
  },
  {
    key: 'email_security',
    group: 'Email Notification',
    label: 'Security Alerts',
    description: 'Email me about logins, password changes, and two-factor authentication',
  },
]

const text = (v) => (v == null ? '' : String(v).trim())

const unwrapObject = (data) => {
  const body = data?.message ?? data?.data ?? data?.user ?? data
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

const unwrapList = (data, ...keys) =>
  [data?.message, ...keys.map((k) => data?.[k]), data].find(Array.isArray) ?? []

const toDateInput = (v) => {
  const s = text(v)
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function readActive(raw) {
  if (typeof raw.isActive === 'boolean') return raw.isActive ? 'active' : 'inactive'
  const s = text(raw.status).toLowerCase()
  if (['active', 'verified', 'enabled'].includes(s)) return 'active'
  if (['inactive', 'disabled', 'blocked', 'suspended'].includes(s)) return 'inactive'
  return ''
}

/* ---------------- Profile + Account ---------------- */
export function normalizeProfile(raw = {}, team = {}) {
  const rawLangs = raw.languages ?? raw.language
  const langs = Array.isArray(rawLangs)
    ? rawLangs
    : typeof rawLangs === 'string'
      ? rawLangs.split(',')
      : []

  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: text(raw.name ?? raw.fullName ?? raw.full_name),
    email: text(raw.email),
    company: text(team.company_name ?? raw.companyname ?? raw.companyName ?? raw.company),
    orgId: text(team.org_id ?? raw.orgId ?? raw.organisationId ?? raw.organizationId ?? raw.orgid ?? raw.tenantId),
    phone: text(raw.phone_no ?? raw.phone ?? raw.mobile ?? raw.contact ?? raw.phoneNumber),
    location: text(raw.location ?? raw.address),
    timezone: text(raw.time_zone ?? raw.timezone ?? raw.timeZone),
    languages: langs.map(text).filter(Boolean),
    birthday: toDateInput(raw.birthday ?? raw.dob ?? raw.dateOfBirth),
    photo: text(raw.profile_picture ?? raw.avatar ?? raw.photo ?? raw.profilePic ?? raw.image),
    status: readActive(raw),
    twoFA: has2FA(raw) || has2FA(raw.security) || Boolean(raw.twoFAsecret),
  }
}

const toProfilePayload = (v) => {
  const langs = Array.isArray(v.languages) ? v.languages.map(text).filter(Boolean) : []
  return {
    name: v.name,
    companyname: v.company,
    phone_no: v.phone,
    location: v.location,
    time_zone: v.timezone,
    language: langs.join(', '),
    languages: langs,
    birthday: v.birthday,
  }
}

/* ---------------- Notifications ---------------- */
function normalizeNotifications(data) {
  const candidates = [data?.message, data?.data, data?.preferences, data]
  const src = candidates.find((c) => c && typeof c === 'object' && !Array.isArray(c)) ?? {}

  return NOTIFICATION_CATALOG.map((item) => {
    const stored = src[item.key]
    const enabled = typeof stored === 'boolean' ? stored : Boolean(item.defaultEnabled)
    if (item.type !== 'snooze') return { ...item, enabled }

    const minutes = Number(src[item.durationKey])
    return {
      ...item,
      enabled,
      duration: Number.isFinite(minutes) && minutes > 0 ? minutes : SNOOZE_OPTIONS[0].value,
    }
  })
}

/* ---------------- Billing ---------------- */
function normalizeInvoiceStatus(raw) {
  const s = text(raw).toLowerCase()
  if (['paid', 'captured', 'succeeded', 'completed', 'active'].includes(s)) return 'paid'
  if (['failed', 'declined', 'cancelled', 'canceled', 'void', 'halted'].includes(s)) return 'failed'
  if (['pending', 'open', 'issued', 'processing', 'created'].includes(s)) return 'pending'
  return 'paid'
}

const fromSubunits = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n / 100 : 0
}

function normalizeBilling(data) {
  const sub = unwrapObject(data)
  const plan = sub.planId && typeof sub.planId === 'object' ? sub.planId : sub.plan ?? {}
  const currency = text(plan.currency ?? sub.currency).toUpperCase() || 'INR'
  const price = fromSubunits(plan.amount ?? sub.amount)

  const used = Number(sub.used ?? sub.envelopesUsed ?? sub.documentsUsed ?? 0)
  const limit = Number(plan.envelopeLimit ?? plan.documentLimit ?? plan.envelopes ?? plan.limit ?? sub.limit ?? 0)

  const card = sub.paymentMethod ?? sub.card ?? {}
  const rawInvoices = unwrapList(data, 'invoices').length
    ? unwrapList(data, 'invoices')
    : Array.isArray(sub.invoices)
      ? sub.invoices
      : []

  let invoices = rawInvoices.map((inv, idx) => {
    const invoiceId = text(inv.invoiceId ?? inv.razorpayInvoiceId ?? inv.number ?? inv._id ?? inv.id)
    const directUrl = text(inv.downloadUrl ?? inv.invoiceUrl ?? inv.shortUrl ?? inv.pdfUrl ?? inv.url)
    return {
      id: String(inv._id ?? inv.id ?? inv.invoiceId ?? idx),
      number:
        text(inv.invoiceNumber ?? inv.number ?? inv.label) ||
        (invoiceId ? `Invoice #${invoiceId.slice(-6)}` : `Invoice #${idx + 1}`),
      date: inv.date ?? inv.billingDate ?? inv.createdAt ?? sub.startDate ?? '',
      status: normalizeInvoiceStatus(inv.status),
      amount: fromSubunits(inv.amount ?? inv.total ?? plan.amount ?? sub.amount),
      currency: text(inv.currency).toUpperCase() || currency,
      plan: text(inv.planName ?? inv.plan ?? plan.name) || 'Free plan',
      url: directUrl || (invoiceId ? `https://invoices.razorpay.com/v1/t/${invoiceId}` : ''),
    }
  })

  // Legacy /subscription/mysubscription returns a single lastInvoiceId + startDate
  const lastInvoiceId = text(sub.lastInvoiceId)
  if (invoices.length === 0 && lastInvoiceId) {
    const d = sub.startDate ? new Date(sub.startDate) : null
    const monthTag =
      d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : ''
    const planLabel = text(plan.name)
    invoices = [
      {
        id: lastInvoiceId,
        number: `Invoice #${lastInvoiceId.slice(-4)}${monthTag ? `-${monthTag}` : ''}`,
        date: sub.startDate ?? '',
        status: normalizeInvoiceStatus(sub.status),
        amount: price,
        currency,
        plan: planLabel ? (/plan$/i.test(planLabel) ? planLabel : `${planLabel} plan`) : 'Current plan',
        url: `https://invoices.razorpay.com/v1/t/${lastInvoiceId}`,
      },
    ]
  }

  return {
    plan: {
      name: text(plan.name) || 'Free',
      billingPeriod: text(plan.billingPeriod ?? sub.billingPeriod) || 'Monthly',
      price,
      currency,
      features: Array.isArray(plan.features) ? plan.features.map(text).filter(Boolean) : [],
      used,
      limit,
    },
    paymentMethod: {
      brand: text(card.brand ?? card.network ?? sub.cardBrand) || 'Visa',
      last4: text(card.last4 ?? sub.cardLast4),
      expiry:
        text(card.expiry) ||
        (card.expMonth && card.expYear ? `${String(card.expMonth).padStart(2, '0')}/${card.expYear}` : ''),
    },
    nextBillingDate: sub.currentPeriodEnd ?? sub.nextBillingDate ?? '',
    billingEmail: text(sub.billingEmail ?? sub.billingAddress ?? sub.email),
    invoices,
  }
}

/* ---------------- Team ---------------- */
function readMemberStatus(raw) {
  const s = text(raw.status || raw.invitestatus).toLowerCase()
  if (typeof raw.isActive === 'boolean' && !s) return raw.isActive ? 'active' : 'inactive'
  if (s.includes('pend') || s.includes('invit')) return 'pending'
  if (
    s.includes('inactive') ||
    s.includes('suspend') ||
    s.includes('block') ||
    s.includes('disabled') ||
    s.includes('declin') ||
    s.includes('deny')
  ) {
    return 'inactive'
  }
  if (s.includes('active') || s.includes('verified') || s.includes('accept')) return 'active'
  return s || 'active'
}

export function normalizeMember(raw = {}) {
  const email = text(raw.email)
  const name = text(raw.name ?? raw.fullName ?? raw.full_name)
  return {
    id: String(raw._id ?? raw.id ?? email),
    name: name || email || 'Unnamed member',
    email,
    role: text(raw.role ?? raw.designation) || 'Sub-admin',
    status: readMemberStatus(raw),
    permissions: Array.isArray(raw.permissions) ? raw.permissions.map(String) : [],
  }
}

const rejectIfFailed = (data, fallback) => {
  const msg = typeof data?.message === 'string' ? data.message : ''
  if (data?.success === false || data?.verified === false || data?.valid === false) {
    const err = new Error(msg || fallback)
    err.userMessage = msg || fallback
    throw err
  }
}

export const settingsService = {
  /* Plan / Subscription */
  plan: async () => {
    const { data } = await apiClient.get(ENDPOINTS.subscription)
    const sub = unwrapObject(data)
    const plan = sub.planId ?? sub.plan ?? sub
    return {
      name: text(plan?.name) || 'Free',
      used: Number(sub.used ?? sub.envelopesUsed ?? 0),
      limit: Number(plan?.envelopeLimit ?? plan?.documentLimit ?? plan?.limit ?? sub.limit ?? 0),
      subscription: sub,
    }
  },

  getBilling: async () => {
    const { data } = await apiClient.get(ENDPOINTS.subscription)
    return normalizeBilling(data)
  },

  /* Profile + Account */
  getProfile: async () => {
    const [userRes, teamRes] = await Promise.all([
      apiClient.get(ENDPOINTS.me),
      apiClient.get(ENDPOINTS.teams).catch(() => ({ data: null })),
    ])
    const rawUser = unwrapObject(userRes.data)
    const teams = unwrapList(teamRes.data, 'teams')
    const currentTeam =
      teams.find((t) => String(t?._id ?? t?.id) === String(rawUser.teamid ?? rawUser.teamId ?? '')) ?? {}
    return normalizeProfile(rawUser, currentTeam)
  },

  updateProfile: async (values) => {
    await apiClient.put(ENDPOINTS.updateAccount, toProfilePayload(values))
    return settingsService.getProfile()
  },

  uploadAvatar: async (file) => {
    const body = new FormData()
    body.append('profile_picture', file)
    const { data } = await apiClient.put(ENDPOINTS.updateAccount, body)
    if (typeof data?.message === 'string' && /^(https?:|data:|\/)/.test(data.message)) return data.message
    const o = unwrapObject(data)
    const direct = text(o.profile_picture ?? o.avatar ?? o.photo ?? o.url ?? o.image)
    if (direct) return direct
    const refreshed = await settingsService.getProfile()
    return refreshed.photo
  },

  /* Security */
  changePassword: async ({ currentPassword, newPassword }) => {
    const { data } = await apiClient.put(ENDPOINTS.updateAccount, {
      currentpass: currentPassword,
      updatepass: newPassword,
    })
    rejectIfFailed(data, 'Could not change the password.')
    return data
  },

  setTwoFactor: async (enabled) => {
    if (!enabled) {
      await apiClient.post(ENDPOINTS.twoFactorDisable, {})
      return { setup: null }
    }
    const { data } = await apiClient.get(ENDPOINTS.twoFactorSetup)
    const o = unwrapObject(data)
    const qr = text(o.qrCode ?? o.qr ?? o.qrcode ?? o.otpauth ?? o.otpauthUrl)
    const secret = text(o.secret ?? o.key ?? o.base32)
    return { setup: qr || secret ? { qr, secret } : null }
  },

  confirmTwoFactor: async (code) => {
    const { data } = await apiClient.post(ENDPOINTS.twoFactorVerify, { token: code })
    rejectIfFailed(data, 'Incorrect authentication code.')
    return data
  },

  /* Notifications */
  getNotifications: async () => {
    const { data } = await apiClient.get(ENDPOINTS.notifications)
    const list = normalizeNotifications(data)
    const sound = list.find((i) => i.key === 'notification_sound')
    const snooze = list.find((i) => i.key === 'snooze_notification')
    const raw = unwrapObject(data)
    const serverUntil = raw.snooze_until ? new Date(raw.snooze_until).getTime() : undefined

    syncNotificationPrefs({
      sound: sound?.enabled,
      snoozed: snooze?.enabled,
      snoozeMinutes: snooze?.duration,
      snoozeUntil: Number.isFinite(serverUntil) ? serverUntil : undefined,
      preserveActiveSnooze: true,
    })
    return list
  },

  updateNotifications: async (items) => {
    const payload = {}
    for (const it of items) {
      payload[it.key] = Boolean(it.enabled)
      if (it.type === 'snooze') payload[it.durationKey] = it.duration
    }
    const { data } = await apiClient.put(ENDPOINTS.notifications, payload)

    const sound = items.find((i) => i.key === 'notification_sound')
    const snooze = items.find((i) => i.key === 'snooze_notification')
    syncNotificationPrefs({
      sound: sound?.enabled,
      snoozed: snooze?.enabled,
      snoozeMinutes: snooze?.duration,
    })
    return data
  },

  /* Team */
  getTeam: async () => {
    const { data } = await apiClient.get(ENDPOINTS.team)
    return unwrapList(data, 'members', 'team', 'users').map(normalizeMember)
  },

  inviteMember: async ({ name, email, role }) => {
    const { data } = await apiClient.post(ENDPOINTS.invite, { name, email, role })
    return data
  },

  updateMember: async (id, patch) => {
    const { data } = await apiClient.post(ENDPOINTS.addPermissions, { id, ...patch })
    return data
  },

  removeMember: async (id) => {
    const { data } = await apiClient.post(ENDPOINTS.deleteMember, { id })
    return data
  },

  /* Integrations (Google Drive) */
  getGoogleStatus: async () => {
    const { data } = await apiClient.get(ENDPOINTS.googleStatus)
    return Boolean(unwrapObject(data).connected)
  },

  getGoogleAuthUrl: async () => {
    const { data } = await apiClient.get(ENDPOINTS.googleAuthUrl)
    if (typeof data?.message === 'string') return text(data.message)
    return text(unwrapObject(data).url ?? data?.url)
  },

  disconnectGoogle: async () => {
    const { data } = await apiClient.get(ENDPOINTS.googleDisconnect)
    return data
  },

  /* Audit Logs & Recycle Bin */
  getAuditLogs: async (params) => {
    const { data } = await apiClient.get(ENDPOINTS.auditLogs, { params })
    return unwrapList(data, 'logs')
  },

  getRecycleBin: async () => {
    const { data } = await apiClient.get(ENDPOINTS.recycleBin)
    return unwrapList(data, 'items')
  },
}