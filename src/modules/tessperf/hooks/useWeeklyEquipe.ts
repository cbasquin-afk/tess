import { useEffect, useState } from 'react'
import { fetchWeeklyEquipe } from '../api'
import type { WeeklyEquipe } from '../types'

export function useWeeklyEquipe(annee: number, mois: number) {
  const [data, setData] = useState<WeeklyEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchWeeklyEquipe(annee, mois)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [annee, mois])

  return { data, loading, error }
}
