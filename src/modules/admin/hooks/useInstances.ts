import { useCallback, useEffect, useState } from 'react'
import { fetchInstances } from '../api'
import type { TadminInstance } from '../types'

export function useInstances() {
  const [instances, setInstances] = useState<TadminInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchInstances()
      setInstances(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { instances, loading, error, reload }
}
