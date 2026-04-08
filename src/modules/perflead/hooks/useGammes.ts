import { useMemo } from 'react'
import type { Contrat, GammeStats } from '../types'

export function useGammes(contrats: Contrat[]): GammeStats[] {
  return useMemo(() => {
    interface Bucket {
      produit: string
      compagnies: Set<string>
      contrats: number
      pmVals: number[]
    }
    // Groupement par produit uniquement (pas par produit×compagnie). Un même
    // produit vendu par plusieurs compagnies = une seule ligne fusionnée.
    const byProduit = new Map<string, Bucket>()

    for (const c of contrats) {
      const produit = c.produit ?? 'Sans produit'
      let b = byProduit.get(produit)
      if (!b) {
        b = { produit, compagnies: new Set(), contrats: 0, pmVals: [] }
        byProduit.set(produit, b)
      }
      b.contrats += 1
      if (c.compagnie) b.compagnies.add(c.compagnie)
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        b.pmVals.push(c.prime_brute_mensuelle)
      }
    }

    const total = contrats.length || 1
    return Array.from(byProduit.values())
      .map<GammeStats>((b) => {
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
  }, [contrats])
}
