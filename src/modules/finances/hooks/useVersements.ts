import { useEffect, useState } from 'react'
import { fetchVersements } from '../api'
import type { Versement } from '../types'

export function useVersements() {
  const [versements, setVersements] = useState<Versement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchVersements()
      .then((d) => {
        if (!cancelled) setVersements(d)
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

  return { versements, loading, error }
}
