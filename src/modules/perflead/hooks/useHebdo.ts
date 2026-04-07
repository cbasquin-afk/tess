import { useMemo } from 'react'
import { format, getISOWeek, parseISO, startOfISOWeek } from 'date-fns'
import type { Contrat, Lead, WeeklyStats } from '../types'

interface UseHebdoOptions {
  nbSemaines?: number // 0 = toutes
}

export function useHebdo(
  leads: Lead[],
  contrats: Contrat[],
  { nbSemaines = 0 }: UseHebdoOptions = {},
): WeeklyStats[] {
  return useMemo(() => {
    // Index PM par identifiant_projet pour calcul rapide du PM moyen hebdo
    const pmByProj = new Map<number, number>()
    for (const c of contrats) {
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        pmByProj.set(c.identifiant_projet, c.prime_brute_mensuelle)
      }
    }

    interface Bucket {
      weekKey: string
      dateDebut: Date
      leads: number
      contrats: number
      enCours: number
      nrp: number
      perdu: number
      inexploitable: number
      pmVals: number[]
    }
    const byWeek = new Map<string, Bucket>()

    for (const l of leads) {
      if (!l.date_creation) continue
      const d = parseISO(l.date_creation.slice(0, 10))
      const monday = startOfISOWeek(d)
      const weekKey = format(monday, 'yyyy-MM-dd')

      let b = byWeek.get(weekKey)
      if (!b) {
        b = {
          weekKey,
          dateDebut: monday,
          leads: 0,
          contrats: 0,
          enCours: 0,
          nrp: 0,
          perdu: 0,
          inexploitable: 0,
          pmVals: [],
        }
        byWeek.set(weekKey, b)
      }
      b.leads += 1
      if (l.categorie === 'Contrat') {
        b.contrats += 1
        const pm = pmByProj.get(l.identifiant_projet)
        if (pm) b.pmVals.push(pm)
      } else if (l.categorie === 'En cours') b.enCours += 1
      else if (l.categorie === 'NRP') b.nrp += 1
      else if (l.categorie === 'Perdu') b.perdu += 1
      else if (l.categorie === 'Inexploitable') b.inexploitable += 1
    }

    const all: WeeklyStats[] = Array.from(byWeek.values())
      .map((b) => {
        const pipe = b.contrats + b.enCours
        const txConversion = pipe > 0 ? (b.contrats / pipe) * 100 : 0
        const txTransformation = b.leads > 0 ? (b.contrats / b.leads) * 100 : 0
        const pmMoyen = b.pmVals.length
          ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
          : 0
        return {
          weekKey: b.weekKey,
          weekLabel: `Sem ${getISOWeek(b.dateDebut)} (${format(b.dateDebut, 'dd/MM')})`,
          dateDebut: b.dateDebut,
          leads: b.leads,
          contrats: b.contrats,
          enCours: b.enCours,
          nrp: b.nrp,
          perdu: b.perdu,
          inexploitable: b.inexploitable,
          txTransformation,
          txConversion,
          pmMoyen,
        }
      })
      // Plus récent en premier
      .sort((a, b) => b.dateDebut.getTime() - a.dateDebut.getTime())

    return nbSemaines > 0 ? all.slice(0, nbSemaines) : all
  }, [leads, contrats, nbSemaines])
}
