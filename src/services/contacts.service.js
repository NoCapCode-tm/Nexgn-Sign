import { apiClient } from './apiClient'

const ENDPOINTS = {
  list: '/contact/getcontact',
  create: '/contact/addcontact',
  update: (id) => `/contact/updatecontact/${encodeURIComponent(id)}`,
  remove: (id) => `/contact/deletecontact/${encodeURIComponent(id)}`,
}

const text = (v) => (v == null ? '' : String(v).trim())

const ACTIVE = ['active', 'verified', 'enabled']
const INACTIVE = ['inactive', 'disabled', 'blocked', 'suspended']

function readStatus(raw) {
  if (typeof raw.isActive === 'boolean') return raw.isActive ? 'active' : 'inactive'
  const s = text(raw.status).toLowerCase()
  if (ACTIVE.includes(s)) return 'active'
  if (INACTIVE.includes(s)) return 'inactive'
  return '' // unknown: the UI hides the status pill and filter
}

function readGender(value) {
  const g = text(value).toLowerCase()
  if (!g) return ''
  if (g.startsWith('m')) return 'Male'
  if (g.startsWith('f')) return 'Female'
  return 'Other'
}

// Maps backend fields (_id, name, email, phone_no, gender) to the UI shape
export function normalizeContact(raw = {}) {
  const name = text(raw.name ?? raw.fullName ?? raw.fullname ?? raw.full_name)
  const email = text(raw.email ?? raw.emailAddress ?? raw.email_address)
  return {
    id: String(raw._id ?? raw.id ?? (email || name)),
    name: name || email || 'Unnamed contact',
    email,
    phone: text(raw.phone_no ?? raw.phone ?? raw.contact ?? raw.mobile ?? raw.phoneNumber ?? raw.phone_number),
    gender: readGender(raw.gender),
    status: readStatus(raw),
    photo: text(raw.avatar ?? raw.photo ?? raw.image ?? raw.profilePic),
  }
}

// Backend expects `contact` for the phone number on add/update
const toPayload = (v) => ({
  name: v.name,
  email: v.email,
  contact: v.phone,
  gender: v.gender,
})

const unwrapObject = (data) => {
  const body = data?.message ?? data?.contact ?? data
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

export const contactsService = {
  list: async () => {
    const { data } = await apiClient.get(ENDPOINTS.list)
    const list = data?.message ?? data?.contacts ?? data ?? []
    return (Array.isArray(list) ? list : [])
      .map(normalizeContact)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  },

  create: async (values) => {
    const payload = toPayload(values)
    const { data } = await apiClient.post(ENDPOINTS.create, payload)
    return normalizeContact({ ...payload, ...unwrapObject(data) })
  },

  update: async (id, values) => {
    const payload = toPayload(values)
    const { data } = await apiClient.put(ENDPOINTS.update(id), payload)
    return normalizeContact({ _id: id, ...payload, ...unwrapObject(data) })
  },

  remove: async (id) => {
    const { data } = await apiClient.delete(ENDPOINTS.remove(id))
    return data
  },
}