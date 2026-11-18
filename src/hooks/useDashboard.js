import { useCallback, useState } from 'react'
import { documentsService } from '@/services/documents.service'
import { useResource } from './useResource'

export function useDashboard() {
  const [filter, setFilter] = useState('all')
  const stats = useResource(() => documentsService.stats(), 'stats')
  const docs = useResource(() => documentsService.recent({ status: filter }), `docs:${filter}`)
  const { mutate: mutateStats, reload: reloadStats } = stats
  const { mutate: mutateDocs, reload: reloadDocs } = docs

  const reload = useCallback(() => {
    reloadStats()
    reloadDocs()
  }, [reloadStats, reloadDocs])

  const remind = useCallback((doc) => documentsService.remind(doc.id), [])

  const remove = useCallback(
    async (doc) => {
      await documentsService.remove(doc.id)
      mutateDocs((list) => list.filter((d) => d.id !== doc.id))
      mutateStats((s) => ({
        ...s,
        total: Math.max(0, (s.total ?? 0) - 1),
        [doc.status]: Math.max(0, (s[doc.status] ?? 0) - 1),
      }))
    },
    [mutateDocs, mutateStats],
  )

  return {
    stats: stats.data,
    statsLoading: stats.loading,
    docs: docs.data ?? [],
    docsLoading: docs.loading,
    error: stats.error || docs.error,
    filter,
    setFilter,
    reload,
    remind,
    remove,
  }
}