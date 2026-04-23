import { useEffect, useState } from 'react'
import { fetchContratsDaily, fetchLeadsDaily } from '../api'
import type { ContratsDaily, LeadsDaily } from '../types'

export function useDailyDrilldown(
  commercial_id: string | null,
  jour_debut: string,
  jour_fin: string,
) {
  const [contrats, setContrats] = useState<ContratsDaily[]>([])
  const [leads, setLeads] = useState<LeadsDaily[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchContratsDaily(commercial_id, jour_debut, jour_fin),
      fetchLeadsDaily(commercial_id, jour_debut, jour_fin),
    ])
      .then(([c, l]) => {
        if (cancelled) return
        setContrats(c)
        setLeads(l)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [commercial_id, jour_debut, jour_fin])

  return { contrats, leads, loading, error }
}
