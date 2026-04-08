import { useMemo } from 'react'
import type { Contrat, GammeFormuleStats, GammeStats } from '../types'

export interface UseGammesResult {
  byProduit: GammeStats[]
  byFormule: GammeFormuleStats[]
}

export function useGammes(contrats: Contrat[]): UseGammesResult {
  return useMemo(() => {
    const total = contrats.length || 1

    // ── Agrégation par produit ──────────────────────────────
    interface ProduitBucket {
      produit: string
      compagnies: Set<string>
      contrats: number
      pmVals: number[]
    }
    const byProduitMap = new Map<string, ProduitBucket>()

    // ── Agrégation par produit × formule ───────────────────
    interface FormuleBucket {
      produit: string
      formule: string
      compagnie: string | null
      contrats: number
      pmVals: number[]
    }
    const byFormuleMap = new Map<string, FormuleBucket>()

    for (const c of contrats) {
      const produit = c.produit ?? 'Sans produit'
      const formule = c.formule ?? 'Sans formule'

      // Bucket produit
      let bp = byProduitMap.get(produit)
      if (!bp) {
        bp = { produit, compagnies: new Set(), contrats: 0, pmVals: [] }
        byProduitMap.set(produit, bp)
      }
      bp.contrats += 1
      if (c.compagnie) bp.compagnies.add(c.compagnie)
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        bp.pmVals.push(c.prime_brute_mensuelle)
      }

      // Bucket formule
      const formuleKey = `${produit}||${formule}||${c.compagnie ?? ''}`
      let bf = byFormuleMap.get(formuleKey)
      if (!bf) {
        bf = {
          produit,
          formule,
          compagnie: c.compagnie ?? null,
          contrats: 0,
          pmVals: [],
        }
        byFormuleMap.set(formuleKey, bf)
      }
      bf.contrats += 1
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        bf.pmVals.push(c.prime_brute_mensuelle)
      }
    }

    const byProduit: GammeStats[] = Array.from(byProduitMap.values())
      .map((b) => {
        const caMensuel = b.pmVals.reduce((a, x) => a + x, 0)
        const pmMoyen = b.pmVals.length ? caMensuel / b.pmVals.length : 0
        return {
          produit: b.produit,
          compagnies: Array.from(b.compagnies).sort(),
          contrats: b.contrats,
          pmMoyen,
          caMensuel,
          pctContrats: (b.contrats / total) * 100,
        }
      })
      .sort((a, b) => b.contrats - a.contrats)

    const byFormule: GammeFormuleStats[] = Array.from(byFormuleMap.values())
      .map((b) => {
        const pmMoyen = b.pmVals.length
          ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
          : 0
        return {
          produit: b.produit,
          formule: b.formule,
          compagnie: b.compagnie,
          contrats: b.contrats,
          pmMoyen,
          pctContrats: (b.contrats / total) * 100,
        }
      })
      .sort((a, b) => b.contrats - a.contrats)

    return { byProduit, byFormule }
  }, [contrats])
}
