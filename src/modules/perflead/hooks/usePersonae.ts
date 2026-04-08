import { useMemo } from 'react'
import { getDept } from './useAnalyse'
import type {
  Contrat,
  Lead,
  PersonaDeptStats,
  PersonaGroup,
  RegimeGroupe,
} from '../types'

const REGIME_GROUPE: Record<string, RegimeGroupe> = {
  Salarié: 'SECU',
  'Fonction publique': 'SECU',
  'Retraité salarié': 'SECU',
  'Salarié agricole': 'MSA',
  'Exploitant agricole': 'MSA',
  'Retraité TNS': 'TNS',
  'Travailleur non salarié (TNS)': 'TNS',
  'Alsace-Moselle': 'ALSMO',
  'Retraité Alsace-Moselle': 'ALSMO',
}

function groupeRegime(r: string | null): RegimeGroupe {
  if (!r) return 'Autre'
  return REGIME_GROUPE[r] ?? 'Autre'
}

export interface UsePersonaeResult {
  groups: PersonaGroup[]
  deptAge: PersonaDeptStats[]
}

const DEPT_MIN_LEADS = 5
const DEPT_MIN_CONTRATS = 2
const DEPT_MAX_ROWS = 30

export function usePersonae(
  leads: Lead[],
  contrats: Contrat[],
  minLeads = 5,
): UsePersonaeResult {
  return useMemo(() => {
    const contratIdx = new Map<number, Contrat>()
    for (const c of contrats) contratIdx.set(c.identifiant_projet, c)

    // ── Aggregation par groupe régime × tranche d'âge ───────
    interface GroupBucket {
      groupe: RegimeGroupe
      trancheAge: string
      total: number
      contrats: number
      pmVals: number[]
      produits: Map<string, number>
    }
    const byKey = new Map<string, GroupBucket>()

    // ── Aggregation par dept × tranche d'âge ────────────────
    interface DeptBucket {
      dept: string
      trancheAge: string
      total: number
      contrats: number
      pmVals: number[]
      produits: Map<string, number>
    }
    const byDeptKey = new Map<string, DeptBucket>()

    for (const l of leads) {
      const trancheAge = l.tranche_age ?? 'Inconnu'

      // Groupe régime × tranche
      const grp = groupeRegime(l.regime)
      const key = `${grp}|${trancheAge}`
      let b = byKey.get(key)
      if (!b) {
        b = {
          groupe: grp,
          trancheAge,
          total: 0,
          contrats: 0,
          pmVals: [],
          produits: new Map(),
        }
        byKey.set(key, b)
      }
      b.total += 1

      // Dept × tranche
      const dept = getDept(l.code_postal)
      let bd: DeptBucket | null = null
      if (dept && l.tranche_age) {
        const dKey = `${dept}|${l.tranche_age}`
        bd = byDeptKey.get(dKey) ?? null
        if (!bd) {
          bd = {
            dept,
            trancheAge: l.tranche_age,
            total: 0,
            contrats: 0,
            pmVals: [],
            produits: new Map(),
          }
          byDeptKey.set(dKey, bd)
        }
        bd.total += 1
      }

      if (l.categorie === 'Contrat') {
        b.contrats += 1
        if (bd) bd.contrats += 1
        const c = contratIdx.get(l.identifiant_projet)
        if (c) {
          if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
            b.pmVals.push(c.prime_brute_mensuelle)
            if (bd) bd.pmVals.push(c.prime_brute_mensuelle)
          }
          if (c.produit && c.formule) {
            const pk = `${c.produit}|${c.formule}|${c.compagnie ?? ''}`
            b.produits.set(pk, (b.produits.get(pk) ?? 0) + 1)
            if (bd) bd.produits.set(pk, (bd.produits.get(pk) ?? 0) + 1)
          }
        }
      }
    }

    // ── Build groups ────────────────────────────────────────
    const groups: PersonaGroup[] = Array.from(byKey.values())
      .filter((b) => b.total >= minLeads)
      .map((b) => {
        const txConversion = b.total > 0 ? (b.contrats / b.total) * 100 : 0
        const pmMoyen = b.pmVals.length
          ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
          : 0
        const topEntry = Array.from(b.produits.entries()).sort(
          (a, x) => x[1] - a[1],
        )[0]
        let topProduit: string | null = null
        let topFormule: string | null = null
        let topCompagnie: string | null = null
        if (topEntry) {
          const parts = topEntry[0].split('|')
          topProduit = parts[0] ?? null
          topFormule = parts[1] ?? null
          topCompagnie = parts[2] || null
        }
        return {
          key: `${b.groupe}|${b.trancheAge}`,
          groupe: b.groupe,
          trancheAge: b.trancheAge,
          totalLeads: b.total,
          totalContrats: b.contrats,
          txConversion,
          pmMoyen,
          topProduit,
          topFormule,
          topCompagnie,
        }
      })
      .sort((a, b) => b.txConversion - a.txConversion)

    // ── Build deptAge ───────────────────────────────────────
    const deptAge: PersonaDeptStats[] = Array.from(byDeptKey.values())
      .filter(
        (b) => b.total >= DEPT_MIN_LEADS && b.contrats >= DEPT_MIN_CONTRATS,
      )
      .map<PersonaDeptStats>((b) => {
        const txConversion = b.total > 0 ? (b.contrats / b.total) * 100 : 0
        const pmMoyen = b.pmVals.length
          ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
          : 0
        const topEntry = Array.from(b.produits.entries()).sort(
          (a, x) => x[1] - a[1],
        )[0]
        const topProduit = topEntry ? (topEntry[0].split('|')[0] ?? null) : null
        return {
          key: `${b.dept}|${b.trancheAge}`,
          dept: b.dept,
          trancheAge: b.trancheAge,
          totalLeads: b.total,
          totalContrats: b.contrats,
          txConversion,
          pmMoyen,
          topProduit,
        }
      })
      .sort((a, b) => b.txConversion - a.txConversion)
      .slice(0, DEPT_MAX_ROWS)

    return { groups, deptAge }
  }, [leads, contrats, minLeads])
}
