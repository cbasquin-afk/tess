import { useEffect, useMemo, useState } from 'react'
import { fetchContratsByPeriod, fetchFournisseurContrats } from '../api'
import { useAuth } from '@/shared/auth/useAuth'
import { usePerfLeadFilters } from '../context/FiltersContext'
import { PIOCHE_VALUE } from '../components/FilterBar'
import type { Contrat } from '../types'

function matchCommercial(c: Contrat, commercial: string): boolean {
  if (!commercial) return true
  if (commercial === PIOCHE_VALUE) {
    return !c.attribution || c.attribution === '< Pioche >'
  }
  return c.attribution === commercial
}

export function useContrats() {
  const { filters } = usePerfLeadFilters()
  const { role } = useAuth()
  const [raw, setRaw] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const fetcher =
      role === 'fournisseur' ? fetchFournisseurContrats : fetchContratsByPeriod
    fetcher(
      filters.dateFrom || undefined,
      filters.dateTo || undefined,
    )
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
  }, [filters.dateFrom, filters.dateTo, role])

  // Filtres client-side : commercial / origine / verticale
  // (le filtre catégorie ne s'applique pas aux contrats)
  const contrats = useMemo(() => {
    return raw.filter((c) => {
      if (!matchCommercial(c, filters.commercial)) return false
      if (filters.origine && c.origine !== filters.origine) return false
      if (filters.typeContrat && c.type_contrat !== filters.typeContrat)
        return false
      return true
    })
  }, [raw, filters.commercial, filters.origine, filters.typeContrat])

  return { contrats, loading, error }
}
