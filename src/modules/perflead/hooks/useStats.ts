import { useMemo } from 'react'
import { useLeads } from './useLeads'
import { useContrats } from './useContrats'
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

// useStats orchestre useLeads + useContrats — les filtres sont appliqués
// une seule fois, en amont, dans ces deux hooks. Pas de double filtrage.
export function useStats() {
  const { leads, loading: loadingL, error: errorL } = useLeads()
  const { contrats, loading: loadingC, error: errorC } = useContrats()

  const stats = useMemo(() => buildStats(leads, contrats), [leads, contrats])

  return {
    leads,
    contrats,
    stats,
    loading: loadingL || loadingC,
    error: errorL ?? errorC,
  }
}
