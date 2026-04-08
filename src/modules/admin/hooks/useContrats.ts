import { useCallback, useEffect, useState } from 'react'
import { fetchContrats } from '../api'
import type { TadminContrat } from '../types'

export function useContrats() {
  const [contrats, setContrats] = useState<TadminContrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchContrats()
      setContrats(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { contrats, loading, error, reload }
}
