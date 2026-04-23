import { useEffect, useState } from 'react'
import { fetchContratsDetail } from '../api'
import type { ContratDetail } from '../types'

export function useContratsDetail(
  commercial_id: string | null,
  annee: number,
  mois: number,
  enabled = true,
) {
  const [data, setData] = useState<ContratDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !commercial_id) {
      setData([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchContratsDetail(commercial_id, annee, mois)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [commercial_id, annee, mois, enabled])

  return { data, loading, error }
}
