import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/services/apiClient'

const POLL_MS = 20000
const MAX_ITEMS = 30

const ENDPOINTS = {
  list: '/notification',
  stream: '/notification/stream',
  markRead: (id) => `/notification/${encodeURIComponent(id)}/read`,
  markAllRead: '/notification/read-all',
  remove: (id) => `/notification/${encodeURIComponent(id)}`,
}

const listeners = new Set()
const incomingListeners = new Set()
const seenIds = new Set()

let state = { items: [], loading: true }
let source = null
let pollTimer = null
let subscribers = 0
let hasLoaded = false

function emit() {
  const snapshot = { items: state.items.slice(), loading: state.loading }
  listeners.forEach((listener) => listener(snapshot))
}

function notifyIncoming(item) {
  incomingListeners.forEach((fn) => fn(item))
}

function getStreamUrl() {
  const base = (apiClient.defaults.baseURL || '').replace(/\/+$/, '')
  return `${base}${ENDPOINTS.stream}`
}

function remember(list, { announce }) {
  list.forEach((item) => {
    const id = item?._id ?? item?.id
    if (!id) return
    if (announce && hasLoaded && !seenIds.has(id)) {
      notifyIncoming(item)
    }
    seenIds.add(id)
  })
  hasLoaded = true
}

export async function refreshNotifications({ announce = true } = {}) {
  try {
    const { data } = await apiClient.get(ENDPOINTS.list)
    const next = Array.isArray(data?.message)
      ? data.message
      : Array.isArray(data?.notifications)
        ? data.notifications
        : Array.isArray(data)
          ? data
          : []

    remember(next, { announce })

    state = {
      items: next
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, MAX_ITEMS),
      loading: false,
    }
    emit()
  } catch {
    if (state.loading) {
      state = { ...state, loading: false }
      emit()
    }
  }
}

export async function markNotificationRead(id) {
  const prev = state.items
  state = {
    ...state,
    items: prev.map((item) => ((item._id ?? item.id) === id ? { ...item, isRead: true, read: true } : item)),
  }
  emit()

  try {
    await apiClient.patch(ENDPOINTS.markRead(id), {})
  } catch (err) {
    state = { ...state, items: prev }
    emit()
    throw err
  }
}

export async function markAllNotificationsRead() {
  const prev = state.items
  state = {
    ...state,
    items: prev.map((item) => ({ ...item, isRead: true, read: true })),
  }
  emit()

  try {
    await apiClient.patch(ENDPOINTS.markAllRead, {})
  } catch (err) {
    state = { ...state, items: prev }
    emit()
    throw err
  }
}

export async function deleteNotification(id) {
  const prev = state.items
  state = {
    ...state,
    items: prev.filter((item) => (item._id ?? item.id) !== id),
  }
  emit()

  try {
    await apiClient.delete(ENDPOINTS.remove(id))
  } catch (err) {
    state = { ...state, items: prev }
    emit()
    throw err
  }
}

function start() {
  refreshNotifications({ announce: false })

  pollTimer = window.setInterval(() => {
    if (!document.hidden) refreshNotifications({ announce: true })
  }, POLL_MS)

  if (typeof window.EventSource !== 'function') return

  source = new EventSource(getStreamUrl(), { withCredentials: true })

  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      const incoming = payload?.notification
      const id = incoming?._id ?? incoming?.id
      if (payload?.type !== 'notification' || !id) return
      if (seenIds.has(id)) return

      remember([incoming], { announce: true })
      state = {
        items: [incoming, ...state.items.filter((item) => (item._id ?? item.id) !== id)].slice(0, MAX_ITEMS),
        loading: false,
      }
      emit()
    } catch {
      // Ignore malformed SSE frames
    }
  }

  source.onerror = () => {
    source?.close()
    source = null
  }
}

function stop() {
  window.clearInterval(pollTimer)
  pollTimer = null
  source?.close()
  source = null
}

export function useNotifications({ onIncoming } = {}) {
  const [snapshot, setSnapshot] = useState(() => ({ items: state.items.slice(), loading: state.loading }))

  useEffect(() => {
    listeners.add(setSnapshot)
    subscribers += 1
    setSnapshot({ items: state.items.slice(), loading: state.loading })

    if (subscribers === 1) start()

    return () => {
      listeners.delete(setSnapshot)
      subscribers -= 1
      if (subscribers === 0) {
        stop()
        state = { items: [], loading: true }
        seenIds.clear()
        hasLoaded = false
      }
    }
  }, [])

  useEffect(() => {
    if (!onIncoming) return undefined
    incomingListeners.add(onIncoming)
    return () => incomingListeners.delete(onIncoming)
  }, [onIncoming])

  const unreadCount = useMemo(
    () => snapshot.items.filter((item) => !(item.isRead ?? item.read)).length,
    [snapshot.items],
  )

  const refresh = useCallback((opts) => refreshNotifications(opts), [])
  const markAsRead = useCallback((id) => markNotificationRead(id), [])
  const markAllAsRead = useCallback(() => markAllNotificationsRead(), [])
  const remove = useCallback((id) => deleteNotification(id), [])

  return {
    notifications: snapshot.items,
    loading: snapshot.loading,
    unreadCount,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification: remove,
  }
}