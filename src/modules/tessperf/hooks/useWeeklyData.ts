import { useEffect, useState } from 'react'
import {
  fetchWeeklyKpisByCommercial,
  fetchWeeklyKpisEquipe,
} from '../api'
import type { WeeklyKpis } from '../types'

export function useWeeklyDataCommercial(
  commercial_id: string,
  debut: string,
  fin: string,
) {
  const [data, setData] = useState<WeeklyKpis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!commercial_id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchWeeklyKpisByCommercial(commercial_id, debut, fin)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [commercial_id, debut, fin])

  return { data, loading, error }
}

export function useWeeklyDataEquipe(debut: string, fin: string) {
  const [data, setData] = useState<WeeklyKpis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchWeeklyKpisEquipe(debut, fin)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debut, fin])

  return { data, loading, error }
}
