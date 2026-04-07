import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchContrats, fetchLeads } from '../api'
import type { Contrat, DerivedStats, Lead } from '../types'

export function buildStats(leads: Lead[], contrats: Contrat[]): DerivedStats {
  const total = leads.length

  const byCategorie: Record<string, number> = {}
  const byStatut: Record<string, number> = {}
  const byStatutCategorie: Record<string, string> = {}

  for (const l of leads) {
    byCategorie[l.categorie] = (byCategorie[l.categorie] ?? 0) + 1
    byStatut[l.statut] = (byStatut[l.statut] ?? 0) + 1
    if (l.statut) byStatutCategorie[l.statut] = l.categorie
  }

  const totalContrats = byCategorie['Contrat'] ?? 0
  const totalEnCours = byCategorie['En cours'] ?? 0
  const txTransformation = total > 0 ? (totalContrats / total) * 100 : 0

  const pmVals = contrats
    .map((c) => c.prime_brute_mensuelle)
    .filter((v): v is number => typeof v === 'number' && v > 0)
  const totalMensuel = pmVals.reduce((a, b) => a + b, 0)
  const pmMoyen = pmVals.length ? totalMensuel / pmVals.length : 0

  return {
    total,
    byCategorie,
    byStatut,
    byStatutCategorie,
    txTransformation,
    totalContrats,
    totalEnCours,
    pmMoyen,
    totalMensuel,
  }
}

export function useStats() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [l, c] = await Promise.all([fetchLeads(), fetchContrats()])
      setLeads(l)
      setContrats(c)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const stats = useMemo(() => buildStats(leads, contrats), [leads, contrats])

  return { leads, contrats, stats, loading, error, refetch }
}
