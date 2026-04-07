import { useEffect, useMemo, useState } from 'react'
import { fetchContratsByPeriod } from '../api'
import { usePerfLeadFilters } from '../context/FiltersContext'
import type { Contrat } from '../types'

export function useContrats() {
  const { filters } = usePerfLeadFilters()
  const [raw, setRaw] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Re-fetch quand la période change (filtre serveur sur date_souscription)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchContratsByPeriod(filters.dateFrom, filters.dateTo)
      .then((d) => {
        if (!cancelled) setRaw(d)
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
  }, [filters.dateFrom, filters.dateTo])

  // Filtres client-side : commercial / origine / verticale
  // (le filtre catégorie ne s'applique pas aux contrats)
  const contrats = useMemo(() => {
    return raw.filter((c) => {
      if (filters.commercial && c.attribution !== filters.commercial)
        return false
      if (filters.origine && c.origine !== filters.origine) return false
      if (filters.typeContrat && c.type_contrat !== filters.typeContrat)
        return false
      return true
    })
  }, [raw, filters.commercial, filters.origine, filters.typeContrat])

  return { contrats, loading, error }
}
