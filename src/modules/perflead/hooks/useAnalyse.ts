import { useMemo } from 'react'
import type {
  AnalyseResult,
  Contrat,
  DeptStats,
  Lead,
  TelGroupStats,
  TelType,
} from '../types'

// ── Classification du téléphone ───────────────────────────────
export function classifyTel(tel: string | null): TelType {
  if (!tel) return 'inconnu'
  const cleaned = tel.replace(/\s/g, '')
  if (/^0[1-5]/.test(cleaned)) return 'fixe'
  if (/^0[6-7]/.test(cleaned)) return 'mobile'
  return 'inconnu'
}

// ── Parsing du code postal en code département ────────────────
// Gère DOM-TOM (97x → 971..976) et Corse (20 → 20)
export function getDept(codePostal: string | null): string | null {
  if (!codePostal) return null
  const cp = String(codePostal).replace(/\D/g, '').padStart(5, '0')
  if (cp.length < 2) return null
  // DOM-TOM : 971 = Guadeloupe, 972 = Martinique, etc.
  if (cp.startsWith('97')) return cp.slice(0, 3)
  // Corse 20xxx → on garde "20"
  if (cp.startsWith('20')) return '20'
  // Métropole : 2 premiers chiffres
  return cp.slice(0, 2)
}

// Renvoie TOUS les départements présents dans les leads (pas de filtre min,
// pas de limite). Le composant consommateur décide du tri/affichage.

// ── Hook ──────────────────────────────────────────────────────
export function useAnalyse(
  leads: Lead[],
  contrats: Contrat[],
): AnalyseResult {
  return useMemo(() => {
    // Index PM par identifiant_projet pour calcul rapide
    const pmByProj = new Map<number, number>()
    for (const c of contrats) {
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        pmByProj.set(c.identifiant_projet, c.prime_brute_mensuelle)
      }
    }

    // ── Section A : Fixe vs Mobile ────────────────────────
    interface TelBucket {
      count: number
      contrats: number
      nrp: number
    }
    const telBuckets: Record<TelType, TelBucket> = {
      fixe: { count: 0, contrats: 0, nrp: 0 },
      mobile: { count: 0, contrats: 0, nrp: 0 },
      inconnu: { count: 0, contrats: 0, nrp: 0 },
    }

    for (const l of leads) {
      const t = classifyTel(l.telephone)
      const b = telBuckets[t]
      b.count += 1
      if (l.categorie === 'Contrat') b.contrats += 1
      if (l.categorie === 'NRP') b.nrp += 1
    }

    const totalLeads = leads.length

    function makeTelStats(type: TelType): TelGroupStats {
      const b = telBuckets[type]
      return {
        type,
        count: b.count,
        pctTotal: totalLeads > 0 ? (b.count / totalLeads) * 100 : 0,
        contrats: b.contrats,
        txTransfo: b.count > 0 ? (b.contrats / b.count) * 100 : 0,
        txDecroches: b.count > 0 ? ((b.count - b.nrp) / b.count) * 100 : 0,
      }
    }

    const fixe = makeTelStats('fixe')
    const mobile = makeTelStats('mobile')
    const inconnu = makeTelStats('inconnu')

    // ── Section B : Cartographie départementale ───────────
    interface DeptBucket {
      total: number
      contrats: number
      nrp: number
      pmVals: number[]
    }
    const byDept = new Map<string, DeptBucket>()

    for (const l of leads) {
      const dept = getDept(l.code_postal)
      if (!dept) continue
      let b = byDept.get(dept)
      if (!b) {
        b = { total: 0, contrats: 0, nrp: 0, pmVals: [] }
        byDept.set(dept, b)
      }
      b.total += 1
      if (l.categorie === 'NRP') b.nrp += 1
      if (l.categorie === 'Contrat') {
        b.contrats += 1
        const pm = pmByProj.get(l.identifiant_projet)
        if (pm) b.pmVals.push(pm)
      }
    }

    const depts: DeptStats[] = Array.from(byDept.entries())
      .map(([dept, b]) => {
        const pmMoyen = b.pmVals.length
          ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
          : 0
        return {
          dept,
          total: b.total,
          contrats: b.contrats,
          nrp: b.nrp,
          txDecroches:
            b.total > 0 ? ((b.total - b.nrp) / b.total) * 100 : 0,
          txTransfo: b.total > 0 ? (b.contrats / b.total) * 100 : 0,
          pmMoyen,
          partLeads: totalLeads > 0 ? (b.total / totalLeads) * 100 : 0,
        }
      })
      .sort((a, b) => b.total - a.total)

    return {
      fixe,
      mobile,
      inconnu,
      totalLeads,
      depts,
    }
  }, [leads, contrats])
}
