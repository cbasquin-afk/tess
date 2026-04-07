import { useEffect, useState } from 'react'
import { fetchContrats } from '../api'
import type { Contrat } from '../types'

export function useContrats() {
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchContrats()
      .then((d) => {
        if (!cancelled) setContrats(d)
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

  return { contrats, loading, error }
}
