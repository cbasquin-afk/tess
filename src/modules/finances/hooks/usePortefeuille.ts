import { useEffect, useState } from 'react'
import { fetchPortefeuille } from '../api'
import type { PortefeuilleRow } from '../types'

export function usePortefeuille() {
  const [rows, setRows] = useState<PortefeuilleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPortefeuille()
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
