import { useEffect, useState } from 'react'
import { fetchCommissionsDetail } from '../api'
import type { CommissionDetail } from '../types'

export function useCommissionsDetail() {
  const [rows, setRows] = useState<CommissionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCommissionsDetail()
      .then((d) => {
        if (!cancelled) setRows(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { rows, loading, error }
}
