import { useEffect, useMemo, useState } from 'react'
import { fetchLeadsByPeriod } from '../api'
import { usePerfLeadFilters } from '../context/FiltersContext'
import type { Lead } from '../types'

export function useLeads() {
  const { filters } = usePerfLeadFilters()
  const [raw, setRaw] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Re-fetch quand la période change (filtre serveur)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchLeadsByPeriod(filters.dateFrom, filters.dateTo)
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

  // Filtres client-side : commercial / catégorie / origine / verticale
  const leads = useMemo(() => {
    return raw.filter((l) => {
      if (filters.commercial && l.attribution !== filters.commercial) return false
      if (filters.categorie && l.categorie !== filters.categorie) return false
      if (filters.origine && l.origine !== filters.origine) return false
      if (filters.typeContrat && l.type_contrat !== filters.typeContrat)
        return false
      return true
    })
  }, [
    raw,
    filters.commercial,
    filters.categorie,
    filters.origine,
    filters.typeContrat,
  ])

  return { leads, loading, error }
}
