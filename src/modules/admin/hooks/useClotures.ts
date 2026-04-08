import { useCallback, useEffect, useState } from 'react'
import { fetchClotures } from '../api'
import type { TadminAsafCloture } from '../types'

export function useClotures() {
  const [clotures, setClotures] = useState<TadminAsafCloture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchClotures()
      setClotures(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { clotures, loading, error, reload }
}
