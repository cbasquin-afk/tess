// Moteur de génération de constats et suggestions pour le baromètre
// TessPerf. Règles métier déterministes, rapides, sans dépendance externe.

import type {
  BarometreData,
  BarometreHebdoCommercial,
  BarometreHebdoEquipe,
  BarometreMensuelCommercial,
  BarometreMensuelEquipe,
  Constat,
  Suggestion,
} from '../types'
import { fmtEUR, fmtPct } from './format'

const n = (v: number | string | null | undefined): number => {
  const x = typeof v === 'number' ? v : v == null ? 0 : parseFloat(v)
  return Number.isFinite(x) ? x : 0
}

function fmtWeekLabel(debut: string, fin: string): string {
  const d = new Date(debut)
  const f = new Date(fin)
  const dm = d.toLocaleDateString('fr-FR', { day: 'numeric' })
  const fm = f.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `semaine ${dm}–${fm}`
}

// ──────────────────────────────────────────────────────────────
// MENSUEL ÉQUIPE
// ──────────────────────────────────────────────────────────────
export function buildBarometreMensuelEquipe(
  d: BarometreMensuelEquipe,
): BarometreData {
  const tauxTransfo = n(d.taux_transfo_productifs_pct)
  const cibleTransfo = n(d.taux_transfo_mapapp_cible) * 100
  const tauxConv = n(d.taux_conversion_productifs_pct)
  const cibleConv = n(d.taux_conversion_cible) * 100
  const ratioFS = n(d.ratio_frais_service_realise) * 100
  const cibleFS = n(d.ratio_frais_service_cible) * 100
  const ratioME = n(d.ratio_multi_equip_realise) * 100
  const cibleME = n(d.ratio_multi_equip_cible) * 100
  const pctObj = n(d.pct_objectif_a_date)
  const ca = n(d.ca_acquisition_productifs)
  const objADate = n(d.objectif_ca_a_date)
  const joursRestants = Math.max(0, n(d.jours_ouvres_total) - n(d.jours_ouvres_ecoules))
  const nbMultiEq = n(d.nb_multi_equip_productifs)
  const nbMut = n(d.nb_mutuelles_productifs)
  const nbRet = n(d.nb_retractations_productifs)

  const points_forts: Constat[] = []
  const points_ameliorer: Constat[] = []
  const suggestions: Suggestion[] = []

  // ── Points forts ──
  if (tauxConv > cibleConv) {
    const delta = tauxConv - cibleConv
    points_forts.push({
      icon: '✅',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleConv)} (+${delta.toFixed(2)} pt)`,
      statut: 'vert',
      metric_name: 'taux_conversion',
      valeur: tauxConv,
      cible: cibleConv,
    })
  }
  if (tauxTransfo > cibleTransfo) {
    const delta = tauxTransfo - cibleTransfo
    points_forts.push({
      icon: '✅',
      titre: `Taux de transfo Mapapp : ${fmtPct(tauxTransfo)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleTransfo)} (+${delta.toFixed(2)} pt)`,
      statut: 'vert',
    })
  }
  if (pctObj >= 100) {
    points_forts.push({
      icon: '🎉',
      titre: `Objectif CA atteint : ${fmtEUR(ca)}`,
      description: `${fmtPct(pctObj, 0)} de l'objectif (${fmtEUR(objADate)})`,
      statut: 'vert',
    })
  } else if (pctObj >= 90) {
    points_forts.push({
      icon: '✅',
      titre: `CA à ${fmtPct(pctObj, 0)} de l'objectif`,
      description: `${fmtEUR(ca)} sur ${fmtEUR(objADate)}, encore ${joursRestants} jour${joursRestants > 1 ? 's' : ''} ouvré${joursRestants > 1 ? 's' : ''}`,
      statut: 'vert',
    })
  }
  if (ratioFS > cibleFS) {
    points_forts.push({
      icon: '✅',
      titre: `Ratio frais de service : ${fmtPct(ratioFS)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleFS)}`,
      statut: 'vert',
    })
  }
  if (nbMultiEq >= 2) {
    points_forts.push({
      icon: '✅',
      titre: `${nbMultiEq} multi-équipement${nbMultiEq > 1 ? 's' : ''} signé${nbMultiEq > 1 ? 's' : ''}`,
      description: 'Bonne dynamique de vente croisée',
      statut: 'vert',
    })
  }

  // ── Points à améliorer ──
  if (tauxTransfo < cibleTransfo) {
    const delta = cibleTransfo - tauxTransfo
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Taux de transfo Mapapp : ${fmtPct(tauxTransfo)}`,
      description: `Sous la cible ${fmtPct(cibleTransfo)} (−${delta.toFixed(2)} pt)`,
      statut: delta > 2 ? 'rouge' : 'orange',
    })
  }
  if (tauxConv < cibleConv) {
    const delta = cibleConv - tauxConv
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Sous la cible ${fmtPct(cibleConv)} (−${delta.toFixed(2)} pt)`,
      statut: delta > 5 ? 'rouge' : 'orange',
    })
  }
  if (ratioME < cibleME * 0.5) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Ratio multi-équipement : ${fmtPct(ratioME)}`,
      description: `Loin de la cible ${fmtPct(cibleME)} (${nbMultiEq} multi-équip sur ${nbMut} mutuelles)`,
      statut: 'rouge',
    })
  }
  if (ratioFS < cibleFS * 0.7) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Ratio frais de service : ${fmtPct(ratioFS)}`,
      description: `Sous la cible ${fmtPct(cibleFS)}`,
      statut: 'orange',
    })
  }
  if (nbRet >= 3) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `${nbRet} rétractations`,
      description: 'Surveiller la qualité de signature (double-check dossier, relance post-signature)',
      statut: 'orange',
    })
  }
  if (d.mois_en_cours && pctObj < 70) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `CA à ${fmtPct(pctObj, 0)} de l'objectif`,
      description: `Rattrapage important à venir pour atteindre ${fmtEUR(objADate)}`,
      statut: 'rouge',
    })
  }
  // Placeholder avis (pas de source branchée) → systématique
  points_ameliorer.push({
    icon: '⚠️',
    titre: 'Aucun avis 5★ collecté',
    description: 'Objectif : 5 par mois (source data à venir)',
    statut: 'orange',
  })

  // ── Suggestions ──
  if (ratioME < cibleME * 0.5) {
    const manque = Math.max(3, Math.round(nbMut * 0.2 - nbMultiEq))
    suggestions.push({
      icon: '🎯',
      titre: 'Lancer une campagne multi-équipement',
      description: `Proposer l'obsèques ou la prévoyance aux ${nbMut} mutuelles signées ce mois.`,
      impact_estime: `+${manque} contrats × 200 € ≈ ${fmtEUR(manque * 200)}`,
    })
  }
  if (ratioFS < cibleFS * 0.7) {
    suggestions.push({
      icon: '🎯',
      titre: 'Systématiser les frais de service',
      description: 'Rappeler en formation interne : 1 frais de service sur 3 mutuelles signées. Script à revoir ?',
    })
  }
  if (d.mois_en_cours && pctObj < 100 && pctObj >= 70) {
    const manque = Math.max(0, objADate - ca)
    if (manque > 0 && joursRestants > 0) {
      suggestions.push({
        icon: '🎯',
        titre: 'Finir le mois fort',
        description: `+${fmtEUR(manque)} pour atteindre l'objectif. 1 contrat mutuelle standard ≈ 300 €.`,
        impact_estime: `${Math.ceil(manque / 300)} contrats supplémentaires sur ${joursRestants} jour${joursRestants > 1 ? 's' : ''} ouvré${joursRestants > 1 ? 's' : ''}`,
      })
    }
  }
  suggestions.push({
    icon: '🎯',
    titre: 'Collecter des avis Google',
    description: 'Envoyer un message de demande d’avis aux derniers clients satisfaits.',
    impact_estime: 'Objectif : 5 avis 5★ par mois',
  })

  return {
    periode: 'mensuel',
    scope: 'equipe',
    periode_libelle: d.mois_libelle,
    points_forts,
    points_ameliorer,
    suggestions,
  }
}

// ──────────────────────────────────────────────────────────────
// MENSUEL COMMERCIAL
// ──────────────────────────────────────────────────────────────
export function buildBarometreMensuelCommercial(
  d: BarometreMensuelCommercial,
): BarometreData {
  const tauxConv = n(d.taux_conversion_pct)
  const cibleConv = n(d.taux_conversion_cible) * 100
  const ratioFS = n(d.ratio_frais_service_realise) * 100
  const cibleFS = n(d.ratio_frais_service_cible) * 100
  const ratioME = n(d.ratio_multi_equip_realise) * 100
  const cibleME = n(d.ratio_multi_equip_cible) * 100
  const ca = n(d.ca_acquisition)
  const caMoy = n(d.ca_moyen_par_contrat)
  const caMoyRepere = n(d.ca_par_contrat_repere)
  const panier = n(d.panier_moyen_cotisation)
  const panierRepere = n(d.panier_moyen_repere)
  const nbMultiEq = n(d.nb_contrats_multi_equip)
  const nbMut = n(d.nb_contrats_mutuelle)
  const nbRet = n(d.nb_retractations)
  const nbSignes = n(d.nb_contrats_signes)
  const nbDecroches = n(d.nb_decroches)

  const points_forts: Constat[] = []
  const points_ameliorer: Constat[] = []
  const suggestions: Suggestion[] = []

  if (tauxConv > cibleConv) {
    const delta = tauxConv - cibleConv
    points_forts.push({
      icon: '✅',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleConv)} (+${delta.toFixed(2)} pt)`,
      statut: 'vert',
    })
  }
  if (ratioFS > cibleFS) {
    points_forts.push({
      icon: '✅',
      titre: `Ratio frais de service : ${fmtPct(ratioFS)}`,
      description: `${n(d.nb_frais_service)} frais sur ${nbMut} mutuelles — cible ${fmtPct(cibleFS)}`,
      statut: 'vert',
    })
  }
  if (caMoy > caMoyRepere) {
    points_forts.push({
      icon: '✅',
      titre: `CA moyen par contrat : ${fmtEUR(caMoy)}`,
      description: `Au-dessus du repère ${fmtEUR(caMoyRepere)}`,
      statut: 'vert',
    })
  }
  if (nbMultiEq >= 2) {
    points_forts.push({
      icon: '✅',
      titre: `${nbMultiEq} multi-équipement${nbMultiEq > 1 ? 's' : ''} signé${nbMultiEq > 1 ? 's' : ''}`,
      description: 'Bonne dynamique de vente croisée',
      statut: 'vert',
    })
  }

  if (tauxConv < cibleConv && nbDecroches > 0) {
    const delta = cibleConv - tauxConv
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Sous la cible ${fmtPct(cibleConv)} (−${delta.toFixed(2)} pt) — ${nbSignes} signés sur ${nbDecroches} décrochés`,
      statut: delta > 5 ? 'rouge' : 'orange',
    })
  }
  if (ratioME < cibleME * 0.5 && nbMut > 0) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Ratio multi-équipement : ${fmtPct(ratioME)}`,
      description: `Loin de la cible ${fmtPct(cibleME)} (${nbMultiEq}/${nbMut} mutuelles)`,
      statut: 'rouge',
    })
  }
  if (ratioFS < cibleFS * 0.7 && nbMut > 0) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Ratio frais de service : ${fmtPct(ratioFS)}`,
      description: `Sous la cible ${fmtPct(cibleFS)}`,
      statut: 'orange',
    })
  }
  if (panier < panierRepere) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Panier moyen : ${fmtEUR(panier)}`,
      description: `Sous le repère ${fmtEUR(panierRepere)}`,
      statut: 'orange',
    })
  }
  if (nbRet >= 2) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `${nbRet} rétractation${nbRet > 1 ? 's' : ''}`,
      description: 'Double-check dossier + relance J+3 pour consolider',
      statut: 'orange',
    })
  }

  if (ratioME < cibleME * 0.5 && nbMut > 0) {
    const manque = Math.max(2, Math.round(nbMut * 0.2 - nbMultiEq))
    suggestions.push({
      icon: '🎯',
      titre: 'Relancer les mutuelles récentes en multi-équipement',
      description: `${d.commercial_prenom}, propose l'obsèques ou la prévoyance sur tes ${nbMut} mutuelles du mois.`,
      impact_estime: `+${manque} contrats × 200 € ≈ ${fmtEUR(manque * 200)}`,
    })
  }
  if (ratioFS < cibleFS * 0.7 && nbMut > 0) {
    suggestions.push({
      icon: '🎯',
      titre: 'Frais de service à systématiser',
      description: 'Objectif : 1 sur 3 mutuelles signées. Script à relire si le taux reste bas.',
    })
  }
  if (ca > 0) {
    suggestions.push({
      icon: '🎯',
      titre: 'Demander des avis Google',
      description: `Contacte les derniers clients signés, objectif 2-3 avis 5★.`,
    })
  }

  return {
    periode: 'mensuel',
    scope: 'commercial',
    commercial_prenom: d.commercial_prenom,
    periode_libelle: d.mois_libelle,
    points_forts,
    points_ameliorer,
    suggestions,
  }
}

// ──────────────────────────────────────────────────────────────
// HEBDO ÉQUIPE
// ──────────────────────────────────────────────────────────────
export function buildBarometreHebdoEquipe(d: BarometreHebdoEquipe): BarometreData {
  const tauxTransfo = n(d.taux_transfo_pct)
  const cibleTransfo = n(d.taux_transfo_mapapp_cible) * 100
  const tauxConv = n(d.taux_conversion_pct)
  const cibleConv = n(d.taux_conversion_cible) * 100
  const ratioFS = n(d.ratio_frais_service_realise) * 100
  const cibleFS = n(d.ratio_frais_service_cible) * 100
  const ratioME = n(d.ratio_multi_equip_realise) * 100
  const cibleME = n(d.ratio_multi_equip_cible) * 100
  const ca = n(d.ca_acquisition_productifs)
  const caPrec = n(d.ca_acquisition_prec)
  const deltaCa = n(d.delta_ca_pct)
  const nbMultiEq = n(d.nb_signes_multi_equip)

  const points_forts: Constat[] = []
  const points_ameliorer: Constat[] = []
  const suggestions: Suggestion[] = []

  if (tauxTransfo > cibleTransfo) {
    points_forts.push({
      icon: '✅',
      titre: `Taux de transfo Mapapp : ${fmtPct(tauxTransfo)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleTransfo)}`,
      statut: 'vert',
    })
  }
  if (tauxConv > cibleConv) {
    points_forts.push({
      icon: '✅',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleConv)}`,
      statut: 'vert',
    })
  }
  if (ratioFS > cibleFS) {
    points_forts.push({
      icon: '✅',
      titre: `Ratio frais de service : ${fmtPct(ratioFS)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleFS)}`,
      statut: 'vert',
    })
  }
  if (deltaCa >= 15) {
    points_forts.push({
      icon: '📈',
      titre: `CA en progression : ${fmtPct(deltaCa)} vs sem. précédente`,
      description: `${fmtEUR(ca)} cette semaine (vs ${fmtEUR(caPrec)})`,
      statut: 'vert',
    })
  }
  if (nbMultiEq >= 1) {
    points_forts.push({
      icon: '✅',
      titre: `${nbMultiEq} multi-équipement${nbMultiEq > 1 ? 's' : ''} signé${nbMultiEq > 1 ? 's' : ''}`,
      description: 'Dynamique de vente croisée sur la semaine',
      statut: 'vert',
    })
  }

  if (tauxTransfo < cibleTransfo) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Taux de transfo Mapapp : ${fmtPct(tauxTransfo)}`,
      description: `Sous la cible ${fmtPct(cibleTransfo)}`,
      statut: cibleTransfo - tauxTransfo > 2 ? 'rouge' : 'orange',
    })
  }
  if (tauxConv < cibleConv) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Sous la cible ${fmtPct(cibleConv)}`,
      statut: cibleConv - tauxConv > 5 ? 'rouge' : 'orange',
    })
  }
  if (ratioME < cibleME * 0.5) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Ratio multi-équipement : ${fmtPct(ratioME)}`,
      description: `Loin de la cible ${fmtPct(cibleME)}`,
      statut: 'rouge',
    })
  }
  if (deltaCa <= -15) {
    points_ameliorer.push({
      icon: '📉',
      titre: `CA en baisse : ${fmtPct(deltaCa)} vs sem. précédente`,
      description: `${fmtEUR(ca)} cette semaine (vs ${fmtEUR(caPrec)})`,
      statut: 'orange',
    })
  }

  if (ratioME < cibleME * 0.5) {
    suggestions.push({
      icon: '🎯',
      titre: 'Brief multi-équipement lundi matin',
      description: 'Prévoir 10 min d’entraînement au pitch obsèques + prévoyance sur les mutuelles signées.',
    })
  }
  if (tauxTransfo < cibleTransfo) {
    suggestions.push({
      icon: '🎯',
      titre: 'Audit d’appels cette semaine',
      description: 'Écouter 2 appels décrochés non signés par commercial productif pour identifier les blocages.',
    })
  }
  suggestions.push({
    icon: '🎯',
    titre: 'Collecter 1 avis 5★ par productif',
    description: 'Objectif minimal 5/mois : viser 2 demandes par semaine.',
  })

  return {
    periode: 'hebdomadaire',
    scope: 'equipe',
    periode_libelle: fmtWeekLabel(d.semaine_debut, d.semaine_fin),
    points_forts,
    points_ameliorer,
    suggestions,
    tendance_ca: { delta_pct: deltaCa, ca_prec: caPrec },
  }
}

// ──────────────────────────────────────────────────────────────
// HEBDO COMMERCIAL
// ──────────────────────────────────────────────────────────────
export function buildBarometreHebdoCommercial(
  d: BarometreHebdoCommercial,
): BarometreData {
  const tauxConv = n(d.taux_conversion_pct)
  const cibleConv = n(d.taux_conversion_cible) * 100
  const ratioFS = n(d.ratio_frais_service_realise) * 100
  const cibleFS = n(d.ratio_frais_service_cible) * 100
  const ratioME = n(d.ratio_multi_equip_realise) * 100
  const cibleME = n(d.ratio_multi_equip_cible) * 100
  const ca = n(d.ca_acquisition)
  const caPrec = n(d.ca_prec)
  const deltaCa = n(d.delta_ca_pct)
  const nbMultiEq = n(d.nb_signes_multi_equip)

  const points_forts: Constat[] = []
  const points_ameliorer: Constat[] = []
  const suggestions: Suggestion[] = []

  if (tauxConv > cibleConv) {
    points_forts.push({
      icon: '✅',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleConv)}`,
      statut: 'vert',
    })
  }
  if (ratioFS > cibleFS) {
    points_forts.push({
      icon: '✅',
      titre: `Ratio frais de service : ${fmtPct(ratioFS)}`,
      description: `Au-dessus de la cible ${fmtPct(cibleFS)}`,
      statut: 'vert',
    })
  }
  if (deltaCa >= 15) {
    points_forts.push({
      icon: '📈',
      titre: `CA en progression : ${fmtPct(deltaCa)} vs sem. précédente`,
      description: `${fmtEUR(ca)} cette semaine (vs ${fmtEUR(caPrec)})`,
      statut: 'vert',
    })
  }
  if (nbMultiEq >= 1) {
    points_forts.push({
      icon: '✅',
      titre: `${nbMultiEq} multi-équipement${nbMultiEq > 1 ? 's' : ''} signé${nbMultiEq > 1 ? 's' : ''}`,
      description: 'Belle dynamique cette semaine',
      statut: 'vert',
    })
  }

  if (tauxConv < cibleConv) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Taux de conversion : ${fmtPct(tauxConv)}`,
      description: `Sous la cible ${fmtPct(cibleConv)}`,
      statut: cibleConv - tauxConv > 5 ? 'rouge' : 'orange',
    })
  }
  if (ratioME < cibleME * 0.5) {
    points_ameliorer.push({
      icon: '⚠️',
      titre: `Ratio multi-équipement : ${fmtPct(ratioME)}`,
      description: `Loin de la cible ${fmtPct(cibleME)}`,
      statut: 'rouge',
    })
  }
  if (deltaCa <= -15) {
    points_ameliorer.push({
      icon: '📉',
      titre: `CA en baisse : ${fmtPct(deltaCa)} vs sem. précédente`,
      description: `${fmtEUR(ca)} cette semaine (vs ${fmtEUR(caPrec)})`,
      statut: 'orange',
    })
  }

  if (ratioME < cibleME * 0.5) {
    suggestions.push({
      icon: '🎯',
      titre: 'Proposer un multi-équipement cette semaine',
      description: `${d.commercial_prenom}, sélectionne 3 clients récents et propose-leur une 2ᵉ garantie.`,
    })
  }
  suggestions.push({
    icon: '🎯',
    titre: 'Demander 1 avis 5★',
    description: `${d.commercial_prenom}, choisis 1 client satisfait signé cette semaine et envoie-lui la demande d’avis.`,
  })

  return {
    periode: 'hebdomadaire',
    scope: 'commercial',
    commercial_prenom: d.commercial_prenom,
    periode_libelle: fmtWeekLabel(d.semaine_debut, d.semaine_fin),
    points_forts,
    points_ameliorer,
    suggestions,
    tendance_ca: { delta_pct: deltaCa, ca_prec: caPrec },
  }
}
