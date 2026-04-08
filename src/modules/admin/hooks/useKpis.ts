import { useEffect, useState } from 'react'
import { fetchKpis } from '../api'
import type { TadminKpis } from '../types'

export function useKpis() {
  const [kpis, setKpis] = useState<TadminKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchKpis()
      .then((d) => {
        if (!cancelled) setKpis(d)
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

  return { kpis, loading, error }
}
