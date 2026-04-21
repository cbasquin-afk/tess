// Moteur de calcul du Simulateur de rémunération (Phase 1).
// Les taux saisis en DB sont en %, les montants retournés en € entiers.

import type { OffreRemuneration, OffreVariante, SimulationLigne } from '../types'

export const DUREE_MIN_ANS = 1
export const DUREE_MAX_ANS = 20

// Barèmes de reprise par défaut, indexés sur l'année 1 → 4.
// Appliqués sur la com_an_1. Au-delà de l'année 4, reprise = 0%.
const REPRISE_BY_TYPE: Record<string, number[]> = {
  PA: [1.0, 0.9, 0.8, 0.7],
  LE: [0.9, 0.8, 0.6, 0.4],
  LR: [0, 0, 0, 0],
  PA_LR_PRECOMPTE: [1.0, 0.9, 0.8, 0.7],
  PA_LR_LINEAIRE: [0, 0, 0, 0],
}

function parseAbattement(conditions: string | null): number {
  if (!conditions) return 1
  const m = conditions.match(/Abattement\s+(\d+(?:[.,]\d+)?)\s*%/i)
  if (!m) return 1
  const pct = parseFloat(m[1].replace(',', '.'))
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return 1
  return pct / 100
}

function toNum(n: number | string | null | undefined): number | null {
  if (n === null || n === undefined) return null
  const x = typeof n === 'number' ? n : parseFloat(n)
  return Number.isFinite(x) ? x : null
}

// Certaines offres ont TOUS les taux renseignés → double mode.
// On éclate en 2 variantes.
export function expandOffreVariantes(o: OffreRemuneration): OffreVariante[] {
  const acq = toNum(o.taux_acq_pct)
  const rec = toNum(o.taux_rec_pct)
  const lin = toNum(o.taux_lin_pct)
  const type = (o.type_commission ?? '').toUpperCase()

  // Cas PA_LR : double mode
  if (type === 'PA_LR' || (acq != null && rec != null && lin != null)) {
    const variantes: OffreVariante[] = []
    if (acq != null && rec != null) {
      variantes.push({
        offre: o,
        variant_key: `${o.id}::precompte`,
        variant_label: 'Précompté',
        calc_type: 'PA_LR_PRECOMPTE',
      })
    }
    if (lin != null) {
      variantes.push({
        offre: o,
        variant_key: `${o.id}::lineaire`,
        variant_label: 'Linéaire',
        calc_type: 'PA_LR_LINEAIRE',
      })
    }
    if (variantes.length > 0) return variantes
  }

  // Cas LR avec fallback sur taux_acq si taux_lin est null
  if (type === 'LR') {
    return [{
      offre: o,
      variant_key: o.id,
      variant_label: null,
      calc_type: 'LR',
    }]
  }

  // PA / LE / autres
  return [{
    offre: o,
    variant_key: o.id,
    variant_label: null,
    calc_type: (type === 'LE' ? 'LE' : 'PA'),
  }]
}

export function computeLigne(
  variante: OffreVariante,
  cotisationMensuelle: number,
  dureeAns: number,
): SimulationLigne {
  const { offre, calc_type } = variante
  const cotAnn = cotisationMensuelle * 12
  const acq = toNum(offre.taux_acq_pct)
  const rec = toNum(offre.taux_rec_pct)
  const lin = toNum(offre.taux_lin_pct)
  const abattement = parseAbattement(offre.precompte_conditions)

  let com_an_1: number | null = null
  let com_an_recurrent: number | null = null
  let formule = ''

  switch (calc_type) {
    case 'LR': {
      // LR : taux_lin_pct sinon fallback sur taux_acq_pct
      const taux = lin ?? acq
      if (taux == null) break
      const val = cotAnn * (taux / 100) * abattement
      com_an_1 = val
      com_an_recurrent = val
      formule = `cotisation_annuelle × ${taux}%`
      if (abattement < 1) formule += ` × ${Math.round(abattement * 100)}% (abattement)`
      break
    }
    case 'PA': {
      if (acq == null) break
      com_an_1 = cotAnn * (acq / 100) * abattement
      com_an_recurrent = rec != null ? cotAnn * (rec / 100) * abattement : 0
      formule = `An 1 : cotisation_annuelle × ${acq}%`
      if (rec != null) formule += `, An 2+ : × ${rec}%`
      if (abattement < 1) formule += ` · Abattement ${Math.round(abattement * 100)}%`
      break
    }
    case 'LE': {
      if (acq == null) break
      com_an_1 = cotAnn * (acq / 100) * abattement
      const tauxRec = rec ?? lin
      com_an_recurrent = tauxRec != null ? cotAnn * (tauxRec / 100) * abattement : 0
      formule = `An 1 : cotisation_annuelle × ${acq}%`
      if (tauxRec != null) formule += `, An 2+ : × ${tauxRec}% (LE)`
      if (abattement < 1) formule += ` · Abattement ${Math.round(abattement * 100)}%`
      break
    }
    case 'PA_LR_PRECOMPTE': {
      if (acq == null || rec == null) break
      com_an_1 = cotAnn * (acq / 100) * abattement
      com_an_recurrent = cotAnn * (rec / 100) * abattement
      formule = `An 1 : cotisation_annuelle × ${acq}%, An 2+ : × ${rec}%`
      if (abattement < 1) formule += ` · Abattement ${Math.round(abattement * 100)}%`
      break
    }
    case 'PA_LR_LINEAIRE': {
      if (lin == null) break
      const val = cotAnn * (lin / 100) * abattement
      com_an_1 = val
      com_an_recurrent = val
      formule = `cotisation_annuelle × ${lin}% (linéaire)`
      if (abattement < 1) formule += ` · Abattement ${Math.round(abattement * 100)}%`
      break
    }
  }

  // Cumul sur dureeAns
  let cumul: number | null = null
  if (com_an_1 != null) {
    const rec_val = com_an_recurrent ?? 0
    cumul = com_an_1 + rec_val * Math.max(0, dureeAns - 1)
  }

  const com_an_N = dureeAns >= 2 ? com_an_recurrent : com_an_1

  // Reprises : com_an_1 × taux_reprise_anN pour N=1..3
  const bareme = REPRISE_BY_TYPE[calc_type] ?? [0, 0, 0, 0]
  const reprises: (number | null)[] = [null, null, null]
  if (com_an_1 != null) {
    for (let i = 0; i < 3; i++) {
      reprises[i] = -Math.abs(com_an_1 * bareme[i])
    }
  }

  return {
    key: variante.variant_key,
    offre,
    variant_label: variante.variant_label,
    calc_type,
    abattement,
    com_an_1,
    com_an_N,
    cumul,
    reprise_an_1: reprises[0],
    reprise_an_2: reprises[1],
    reprise_an_3: reprises[2],
    formule,
  }
}

export function fmtEur(n: number | null | undefined, { signed = false } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const formatted = abs.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
  if (rounded < 0) return `−${formatted} €`
  if (signed && rounded > 0) return `+${formatted} €`
  return `${formatted} €`
}

export function labelVerticale(v: string): string {
  return v
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
