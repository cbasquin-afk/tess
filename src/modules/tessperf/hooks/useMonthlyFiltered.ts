import { useEffect, useMemo, useState } from 'react'
import {
  fetchContratsDaily,
  fetchLeadsDaily,
  fetchMonthlyEquipe,
  fetchMonthlyKpisAllCommerciaux,
  fetchMonthlyKpisByCommercial,
} from '../api'
import type {
  ContratsDaily,
  LeadsDaily,
  MonthlyEquipe,
  MonthlyKpis,
  Origine,
} from '../types'

function monthRange(annee: number, mois: number): { debut: string; fin: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const debut = `${annee}-${pad(mois)}-01`
  const finDate = new Date(annee, mois, 0)
  const fin = `${annee}-${pad(mois)}-${pad(finDate.getDate())}`
  return { debut, fin }
}

// Mapping Origine UI → valeur `source` dans tessperf_v_contrats_daily
function sourceFor(o: Origine): string | null {
  switch (o) {
    case 'mapapp': return 'mapapp'
    case 'site': return 'site'
    case 'recommandation': return 'recommandation'
    case 'multi_equipement': return 'multi_equipement'
    case 'back_office': return 'back_office'
    case 'toutes': return null
  }
}

// Mapping Origine UI → valeur `origine` dans tessperf_v_leads_daily (si identique)
function originFor(o: Origine): string | null {
  switch (o) {
    case 'mapapp': return 'mapapp'
    case 'site': return 'site'
    case 'recommandation': return 'recommandation'
    case 'multi_equipement': return 'multi_equipement'
    case 'back_office': return 'back_office'
    case 'toutes': return null
  }
}

interface ProduitCounts {
  mutuelle: number
  obseques: number
  prevoyance: number
  emprunteur: number
  animal: number
  autre: number
}

interface SourceCounts {
  mapapp: number
  site: number
  back_office: number
  recommandation: number
  multi_equipement: number
}

/**
 * Filtre les KPIs équipe côté front quand une origine est sélectionnée.
 *
 * Ce qui est recalculé :
 *  - nb_leads / nb_decroches / nb_signes
 *  - ventilations source + produit
 *  - CA acquisition / projection (sur la sélection)
 *  - ratios frais service / multi-équipement
 *
 * Ce qui reste identique (Mapapp-based) :
 *  - objectif_ca_a_date, objectif_ca_projete_fin_mois
 *  - pct_objectif_a_date (CA productifs total / objectif Mapapp)
 */
interface FilteredEquipe {
  base: MonthlyEquipe
  origine: Origine
  // Overrides calculés depuis daily quand origine ≠ 'toutes'
  nb_leads_filtre: number
  nb_decroches_productifs_filtre: number
  nb_signes_productifs_filtre: number
  ca_acquisition_productifs_filtre: number
  source_counts: SourceCounts
  produit_counts: ProduitCounts
  taux_transfo_filtre_pct: number
  taux_conversion_filtre_pct: number
}

export function useMonthlyFilteredEquipe(
  annee: number,
  mois: number,
  origine: Origine,
  productifIds: string[],
) {
  const [base, setBase] = useState<MonthlyEquipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyContrats, setDailyContrats] = useState<ContratsDaily[]>([])
  const [dailyLeads, setDailyLeads] = useState<LeadsDaily[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const { debut, fin } = monthRange(annee, mois)
    Promise.all([
      fetchMonthlyEquipe(annee, mois),
      fetchContratsDaily(null, debut, fin),
      fetchLeadsDaily(null, debut, fin),
    ])
      .then(([m, cs, ls]) => {
        if (cancelled) return
        setBase(m)
        setDailyContrats(cs)
        setDailyLeads(ls)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [annee, mois])

  const filtered = useMemo<FilteredEquipe | null>(() => {
    if (!base) return null

    const src = sourceFor(origine)
    const orig = originFor(origine)
    const productifSet = new Set(productifIds)

    // Contrats filtrés par source si besoin, limités aux productifs
    const contratsFiltres = dailyContrats.filter((c) => {
      if (!c.commercial_id || !productifSet.has(c.commercial_id)) return false
      if (src !== null && c.source !== src) return false
      return true
    })
    // Leads filtrés par origine si besoin, limités aux productifs
    const leadsFiltres = dailyLeads.filter((l) => {
      if (!l.commercial_id || !productifSet.has(l.commercial_id)) return false
      if (orig !== null && (l as { origine?: string | null }).origine !== orig) {
        // LeadsDaily n'a pas d'origine côté vue actuelle — fallback : on laisse passer
        // quand orig est défini et qu'on ne peut pas filtrer (dégradation douce).
        return true
      }
      return true
    })

    const nb_signes_productifs_filtre = contratsFiltres.reduce(
      (s, c) => s + Number(c.nb_contrats ?? 0),
      0,
    )
    const ca_acquisition_productifs_filtre = contratsFiltres.reduce(
      (s, c) => s + Number(c.ca_acquisition_societe ?? 0),
      0,
    )
    const nb_decroches_productifs_filtre = leadsFiltres.reduce(
      (s, l) => s + Number(l.nb_decroches ?? 0),
      0,
    )
    const nb_leads_filtre = leadsFiltres.reduce(
      (s, l) => s + Number(l.nb_leads ?? 0),
      0,
    )

    // Ventilations
    const source_counts: SourceCounts = {
      mapapp: 0, site: 0, back_office: 0, recommandation: 0, multi_equipement: 0,
    }
    const produit_counts: ProduitCounts = {
      mutuelle: 0, obseques: 0, prevoyance: 0, emprunteur: 0, animal: 0, autre: 0,
    }
    for (const c of contratsFiltres) {
      const n = Number(c.nb_contrats ?? 0)
      if ((Object.keys(source_counts) as (keyof SourceCounts)[]).includes(c.source as keyof SourceCounts)) {
        source_counts[c.source as keyof SourceCounts] += n
      }
      const k = c.type_produit as keyof ProduitCounts
      if ((Object.keys(produit_counts) as (keyof ProduitCounts)[]).includes(k)) {
        produit_counts[k] += n
      } else {
        produit_counts.autre += n
      }
    }

    // Taux — seulement significatif quand origine Mapapp sélectionnée
    const taux_transfo_filtre_pct =
      origine === 'mapapp' && Number(base.nb_leads_equipe_mapapp) > 0
        ? (nb_signes_productifs_filtre / Number(base.nb_leads_equipe_mapapp)) * 100
        : Number(base.taux_transfo_productifs_pct)
    const taux_conversion_filtre_pct =
      nb_decroches_productifs_filtre > 0
        ? (nb_signes_productifs_filtre / nb_decroches_productifs_filtre) * 100
        : 0

    return {
      base,
      origine,
      nb_leads_filtre,
      nb_decroches_productifs_filtre,
      nb_signes_productifs_filtre,
      ca_acquisition_productifs_filtre,
      source_counts,
      produit_counts,
      taux_transfo_filtre_pct,
      taux_conversion_filtre_pct,
    }
  }, [base, dailyContrats, dailyLeads, origine, productifIds])

  return { data: filtered, loading, error }
}

// ── Commercial individuel — override ventilations par source + produit ──
interface FilteredCommercial {
  base: MonthlyKpis
  origine: Origine
  // Override contrats filtrés par source si origine ≠ toutes
  nb_contrats_signes_filtre: number
  ca_acquisition_filtre: number
  nb_decroches_filtre: number
  source_counts: SourceCounts
  produit_counts: ProduitCounts
  taux_conversion_filtre_pct: number
}

export function useMonthlyFilteredCommercial(
  commercial_id: string,
  annee: number,
  mois: number,
  origine: Origine,
) {
  const [base, setBase] = useState<MonthlyKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyContrats, setDailyContrats] = useState<ContratsDaily[]>([])
  const [dailyLeads, setDailyLeads] = useState<LeadsDaily[]>([])

  useEffect(() => {
    if (!commercial_id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const { debut, fin } = monthRange(annee, mois)
    Promise.all([
      fetchMonthlyKpisByCommercial(commercial_id, annee, mois),
      fetchContratsDaily(commercial_id, debut, fin),
      fetchLeadsDaily(commercial_id, debut, fin),
    ])
      .then(([m, cs, ls]) => {
        if (cancelled) return
        setBase(m)
        setDailyContrats(cs)
        setDailyLeads(ls)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [commercial_id, annee, mois])

  const filtered = useMemo<FilteredCommercial | null>(() => {
    if (!base) return null

    const src = sourceFor(origine)
    const orig = originFor(origine)

    const contrats = dailyContrats.filter((c) =>
      src === null ? true : c.source === src,
    )
    const leads = dailyLeads.filter((l) => {
      if (orig === null) return true
      const o = (l as { origine?: string | null }).origine
      return o === orig || !o // dégradation douce si colonne absente
    })

    const nb_contrats_signes_filtre = contrats.reduce((s, c) => s + Number(c.nb_contrats ?? 0), 0)
    const ca_acquisition_filtre = contrats.reduce((s, c) => s + Number(c.ca_acquisition_societe ?? 0), 0)
    const nb_decroches_filtre = leads.reduce((s, l) => s + Number(l.nb_decroches ?? 0), 0)

    const source_counts: SourceCounts = {
      mapapp: 0, site: 0, back_office: 0, recommandation: 0, multi_equipement: 0,
    }
    const produit_counts: ProduitCounts = {
      mutuelle: 0, obseques: 0, prevoyance: 0, emprunteur: 0, animal: 0, autre: 0,
    }
    for (const c of contrats) {
      const n = Number(c.nb_contrats ?? 0)
      if ((Object.keys(source_counts) as (keyof SourceCounts)[]).includes(c.source as keyof SourceCounts)) {
        source_counts[c.source as keyof SourceCounts] += n
      }
      const k = c.type_produit as keyof ProduitCounts
      if ((Object.keys(produit_counts) as (keyof ProduitCounts)[]).includes(k)) {
        produit_counts[k] += n
      } else {
        produit_counts.autre += n
      }
    }

    const taux_conversion_filtre_pct =
      nb_decroches_filtre > 0
        ? (nb_contrats_signes_filtre / nb_decroches_filtre) * 100
        : 0

    return {
      base,
      origine,
      nb_contrats_signes_filtre,
      ca_acquisition_filtre,
      nb_decroches_filtre,
      source_counts,
      produit_counts,
      taux_conversion_filtre_pct,
    }
  }, [base, dailyContrats, dailyLeads, origine])

  return { data: filtered, loading, error }
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
