import { useEffect, useState } from 'react'
import { fetchRetractations } from '../api'
import type { RetractationRow } from '../types'

export function useRetractations() {
  const [rows, setRows] = useState<RetractationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchRetractations()
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
