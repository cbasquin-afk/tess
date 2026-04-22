import { useEffect, useState } from 'react'
import {
  fetchMonthlyKpisAllCommerciaux,
  fetchMonthlyKpisByCommercial,
} from '../api'
import type { MonthlyKpis } from '../types'

export function useMonthlyCommercial(
  commercial_id: string,
  annee: number,
  mois: number,
) {
  const [data, setData] = useState<MonthlyKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!commercial_id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchMonthlyKpisByCommercial(commercial_id, annee, mois)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [commercial_id, annee, mois])

  return { data, loading, error }
}

export function useMonthlyAllCommerciaux(annee: number, mois: number) {
  const [data, setData] = useState<MonthlyKpis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchMonthlyKpisAllCommerciaux(annee, mois)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [annee, mois])

  return { data, loading, error }
}
