import { useMemo } from 'react'
import type { Contrat, GammeStats } from '../types'

export function useGammes(contrats: Contrat[]): GammeStats[] {
  return useMemo(() => {
    interface Bucket {
      produit: string
      compagnie: string
      formule: string | null
      contrats: number
      pmVals: number[]
    }
    const byKey = new Map<string, Bucket>()

    for (const c of contrats) {
      const produit = c.produit ?? 'Non renseigné'
      const compagnie = c.compagnie ?? 'Non renseignée'
      const formule = c.formule
      const key = `${produit}||${compagnie}`
      let b = byKey.get(key)
      if (!b) {
        b = { produit, compagnie, formule, contrats: 0, pmVals: [] }
        byKey.set(key, b)
      }
      b.contrats += 1
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        b.pmVals.push(c.prime_brute_mensuelle)
      }
    }

    const total = contrats.length || 1
    return Array.from(byKey.values())
      .map<GammeStats>((b) => {
        const pmMoyen = b.pmVals.length
          ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
          : 0
        const caMensuel = b.pmVals.reduce((a, x) => a + x, 0)
        return {
          produit: b.produit,
          compagnie: b.compagnie,
          formule: b.formule,
          contrats: b.contrats,
          pmMoyen,
          caMensuel,
          pctContrats: (b.contrats / total) * 100,
        }
      })
      .sort((a, b) => b.contrats - a.contrats)
  }, [contrats])
}
