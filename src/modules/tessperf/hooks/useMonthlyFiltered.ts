import { useEffect, useState } from 'react'
import {
  fetchMonthlyEquipe,
  fetchMonthlyKpisAllCommerciaux,
  fetchMonthlyKpisByCommercial,
  fetchMonthlyParOrigine,
  fetchMonthlyParOrigineCommercial,
} from '../api'
import type {
  MonthlyEquipe,
  MonthlyKpis,
  MonthlyParOrigine,
  MonthlyParOrigineCommercial,
  Origine,
} from '../types'

interface ProduitCounts {
  mutuelle: number
  obseques: number
  prevoyance: number
  emprunteur: number
  animal: number
  autre: number
}

/**
 * État combiné pour la vue Équipe.
 *
 *   - `base` = tessperf_v_monthly_equipe (toujours présent) : fournit l'objectif
 *     CA, les cibles, les données contextuelles (jours ouvrés, flags temporels).
 *   - `origineData` = tessperf_v_monthly_par_origine (présent SI origine ≠ toutes)
 *     : fournit les KPIs FILTRÉS (leads, décrochés, signés, CA, ratios).
 *   - `origine` = valeur active du filtre.
 *
 * Quand `origine === 'toutes'`, on expose juste `base` et tous les KPIs
 * viennent de là (pas de merge nécessaire).
 */
export interface FilteredEquipe {
  base: MonthlyEquipe
  origine: Origine
  origineData: MonthlyParOrigine | null
}

export function useMonthlyFilteredEquipe(
  annee: number,
  mois: number,
  origine: Origine,
  _productifIds: string[], // plus utilisé (agrégation DB), gardé pour compat
) {
  void _productifIds
  const [data, setData] = useState<FilteredEquipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchMonthlyEquipe(annee, mois),
      origine === 'toutes'
        ? Promise.resolve(null)
        : fetchMonthlyParOrigine(annee, mois, origine),
    ])
      .then(([base, origineData]) => {
        if (cancelled) return
        if (!base) {
          setData(null)
          return
        }
        setData({ base, origine, origineData })
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [annee, mois, origine])

  return { data, loading, error }
}

/**
 * Projette les compteurs produit de MonthlyParOrigine vers un objet homogène.
 * Utilisé par la vue équipe quand un filtre d'origine est actif.
 */
export function produitCountsFromOrigine(p: MonthlyParOrigine): ProduitCounts {
  return {
    mutuelle: Number(p.nb_signes_mutuelle ?? 0),
    obseques: Number(p.nb_signes_obseques ?? 0),
    prevoyance: Number(p.nb_signes_prevoyance ?? 0),
    emprunteur: Number(p.nb_signes_emprunteur ?? 0),
    animal: Number(p.nb_signes_animal ?? 0),
    autre: Number(p.nb_signes_autre ?? 0),
  }
}

/**
 * Projette les compteurs produit d'un MonthlyEquipe (sans filtre).
 * Renvoie seulement les mutuelles + une ventilation nulle pour les autres
 * produits : la vue monthly_equipe n'a pas le détail par produit (seulement
 * nb_mutuelles_productifs). Pour la ventilation complète on bascule sur
 * MonthlyKpis agrégé par commercial.
 */
export function produitCountsFromKpis(rows: MonthlyKpis[]): ProduitCounts {
  return rows.reduce(
    (acc, r) => ({
      mutuelle: acc.mutuelle + Number(r.nb_contrats_mutuelle ?? 0),
      obseques: acc.obseques + Number(r.nb_contrats_obseques ?? 0),
      prevoyance: acc.prevoyance + Number(r.nb_contrats_prevoyance ?? 0),
      emprunteur: acc.emprunteur + Number(r.nb_contrats_emprunteur ?? 0),
      animal: acc.animal + Number(r.nb_contrats_animal ?? 0),
      autre: acc.autre + Number(r.nb_contrats_autre ?? 0),
    }),
    { mutuelle: 0, obseques: 0, prevoyance: 0, emprunteur: 0, animal: 0, autre: 0 },
  )
}

export interface FilteredCommercial {
  base: MonthlyKpis
  origine: Origine
  origineData: MonthlyParOrigineCommercial | null
}

export function useMonthlyFilteredCommercial(
  commercial_id: string,
  annee: number,
  mois: number,
  origine: Origine,
) {
  const [data, setData] = useState<FilteredCommercial | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!commercial_id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchMonthlyKpisByCommercial(commercial_id, annee, mois),
      origine === 'toutes'
        ? Promise.resolve(null)
        : fetchMonthlyParOrigineCommercial(commercial_id, annee, mois, origine),
    ])
      .then(([base, origineData]) => {
        if (cancelled) return
        if (!base) {
          setData(null)
          return
        }
        setData({ base, origine, origineData })
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [commercial_id, annee, mois, origine])

  return { data, loading, error }
}

// ── Utilitaire pour le footer équipe ──
export function useMonthlyAllCommerciauxHook(annee: number, mois: number) {
  const [data, setData] = useState<MonthlyKpis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMonthlyKpisAllCommerciaux(annee, mois)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [annee, mois])

  return { data, loading, error }
}
