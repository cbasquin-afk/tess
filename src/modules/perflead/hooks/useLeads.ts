import { useEffect, useMemo, useState } from 'react'
import { fetchFournisseurLeads, fetchLeadsByPeriod } from '../api'
import { useAuth } from '@/shared/auth/useAuth'
import { usePerfLeadFilters } from '../context/FiltersContext'
import { PIOCHE_VALUE } from '../components/FilterBar'
import type { Lead } from '../types'

function matchCommercial(l: Lead, commercial: string): boolean {
  if (!commercial) return true
  if (commercial === PIOCHE_VALUE) {
    return !l.attribution || l.attribution === '< Pioche >'
  }
  return l.attribution === commercial
}

export function useLeads() {
  const { filters } = usePerfLeadFilters()
  const { role } = useAuth()
  const [raw, setRaw] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Re-fetch quand la période change (filtre serveur). Une chaîne vide est
  // passée en undefined => pas de filtre sur la requête Supabase.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const fetcher =
      role === 'fournisseur' ? fetchFournisseurLeads : fetchLeadsByPeriod
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

  // Filtres client-side : commercial / catégorie / origine / verticale
  const leads = useMemo(() => {
    return raw.filter((l) => {
      if (!matchCommercial(l, filters.commercial)) return false
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
