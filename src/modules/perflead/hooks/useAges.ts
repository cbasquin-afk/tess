import { useMemo } from 'react'
import type { AgeStats, Contrat, Lead } from '../types'

export const TRANCHES_ORDER = [
  '<55',
  '55-59',
  '60-64',
  '65-69',
  '70-74',
  '75-79',
  '80-84',
  '85+',
] as const

export function useAges(leads: Lead[], contrats: Contrat[]): AgeStats[] {
  return useMemo(() => {
    const pmByProj = new Map<number, number>()
    for (const c of contrats) {
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        pmByProj.set(c.identifiant_projet, c.prime_brute_mensuelle)
      }
    }

    interface Bucket {
      leads: number
      contrats: number
      enCours: number
      pmVals: number[]
    }
    const byTranche = new Map<string, Bucket>()
    for (const t of TRANCHES_ORDER) {
      byTranche.set(t, { leads: 0, contrats: 0, enCours: 0, pmVals: [] })
    }

    let totalLeads = 0
    for (const l of leads) {
      const t = l.tranche_age
      if (!t || !byTranche.has(t)) continue
      const b = byTranche.get(t)!
      b.leads += 1
      totalLeads += 1
      if (l.categorie === 'Contrat') {
        b.contrats += 1
        const pm = pmByProj.get(l.identifiant_projet)
        if (pm) b.pmVals.push(pm)
      } else if (l.categorie === 'En cours') {
        b.enCours += 1
      }
    }

    return TRANCHES_ORDER.map<AgeStats>((tranche) => {
      const b = byTranche.get(tranche)!
      const pipe = b.contrats + b.enCours
      const txTransformation = b.leads > 0 ? (b.contrats / b.leads) * 100 : 0
      const txConversion = pipe > 0 ? (b.contrats / pipe) * 100 : 0
      const pmMoyen = b.pmVals.length
        ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
        : 0
      return {
        tranche,
        leads: b.leads,
        contrats: b.contrats,
        enCours: b.enCours,
        txTransformation,
        txConversion,
        pmMoyen,
        pctLeads: totalLeads > 0 ? (b.leads / totalLeads) * 100 : 0,
      }
    })
  }, [leads, contrats])
}
