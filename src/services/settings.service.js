import { apiClient } from './apiClient'

export const settingsService = {
  // Plan usage for Sidebar progress bar
  plan: async () => {
    const { data } = await apiClient.get('/settings/plan')
    const raw = data?.message ?? data?.plan ?? data ?? {}
    return {
      name: raw.name ?? raw.plan ?? 'Free',
      used: Number(raw.used ?? 0),
      limit: Number(raw.limit ?? 19),
    }
  },

  // Profile & Account
  getProfile: async () => {
    const { data } = await apiClient.get('/admin/me')
    return data?.message ?? data?.user ?? data
  },

  updateProfile: async (payload) => {
    const { data } = await apiClient.put('/settings/profile', payload)
    return data
  },

  updateAccount: async (payload) => {
    const { data } = await apiClient.put('/settings/account', payload)
    return data
  },

  // Security & 2FA
  updatePassword: async (payload) => {
    const { data } = await apiClient.post('/settings/security/password', payload)
    return data
  },

  // Notifications
  getNotifications: async () => {
    const { data } = await apiClient.get('/settings/notifications')
    return data?.message ?? data?.notifications ?? data
  },

  updateNotifications: async (payload) => {
    const { data } = await apiClient.put('/settings/notifications', payload)
    return data
  },

  // Team Management
  getTeam: async () => {
    const { data } = await apiClient.get('/settings/team')
    return data?.message ?? data?.members ?? data ?? []
  },

  inviteMember: async (payload) => {
    const { data } = await apiClient.post('/settings/team/invite', payload)
    return data
  },

  // Audit Logs & Recycle Bin
  getAuditLogs: async (params) => {
    const { data } = await apiClient.get('/settings/audit-logs', { params })
    return data?.message ?? data?.logs ?? data ?? []
  },

  getRecycleBin: async () => {
    const { data } = await apiClient.get('/settings/recycle-bin')
    return data?.message ?? data?.items ?? data ?? []
  },
}