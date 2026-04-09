import { supabase } from '@/shared/supabase'
import type {
  CommissionDetail,
  CommissionRow,
  ContratLean,
  PortefeuilleRow,
  RetractationRow,
  Versement,
} from './types'

export async function fetchAllCommissions(): Promise<CommissionRow[]> {
  // type_ligne='commission' uniquement — exclut les 'renouvellement'
  // qui sont des projections futures et fausseraient les KPIs CA réel.
  const { data, error } = await supabase
    .from('tadmin_v_commissions')
    .select(
      'contrat_id, annee, mois, montant_com_societe, montant_com_mandataire, montant_frais, type_ligne',
    )
    .eq('type_ligne', 'commission')
  if (error) throw new Error(`tadmin_v_commissions: ${error.message}`)
  return (data ?? []).map((r) => ({
    contrat_id: r.contrat_id as string,
    annee: Number(r.annee),
    mois: Number(r.mois),
    montant_com_societe: Number(r.montant_com_societe) || 0,
    montant_com_mandataire: Number(r.montant_com_mandataire) || 0,
    montant_frais: Number(r.montant_frais) || 0,
    type_ligne: (r.type_ligne as string | null) ?? null,
  }))
}

export async function fetchContratsLean(): Promise<ContratLean[]> {
  const { data, error } = await supabase
    .from('tadmin_v_contrats')
    .select(
      'id, commercial_prenom, compagnie_assureur, origine, cotisation_mensuelle, type_commission, date_signature',
    )
  if (error) throw new Error(`tadmin_v_contrats (lean): ${error.message}`)
  return (data ?? []) as ContratLean[]
}

// ── Vue commissions enrichies (avec contrat + commercial) ────
export async function fetchCommissionsDetail(): Promise<CommissionDetail[]> {
  const { data, error } = await supabase
    .from('tadmin_v_commissions_detail')
    .select('*')
    .order('annee', { ascending: false })
    .order('mois', { ascending: false })
    .order('montant_com_societe', { ascending: false })
  if (error)
    throw new Error(`tadmin_v_commissions_detail: ${error.message}`)
  return (data ?? []).map((r) => ({
    id: r.id as string,
    contrat_id: r.contrat_id as string,
    annee: Number(r.annee),
    mois: Number(r.mois),
    type_ligne: (r.type_ligne as string | null) ?? null,
    montant_com_societe: Number(r.montant_com_societe) || 0,
    montant_com_mandataire: Number(r.montant_com_mandataire) || 0,
    montant_frais: Number(r.montant_frais) || 0,
    client: (r.client as string | null) ?? '',
    compagnie_assureur: (r.compagnie_assureur as string | null) ?? null,
    origine: (r.origine as string | null) ?? null,
    type_commission: (r.type_commission as string | null) ?? null,
    cotisation_mensuelle:
      r.cotisation_mensuelle !== null && r.cotisation_mensuelle !== undefined
        ? Number(r.cotisation_mensuelle)
        : null,
    frais_service:
      r.frais_service !== null && r.frais_service !== undefined
        ? Number(r.frais_service)
        : null,
    date_signature: (r.date_signature as string | null) ?? null,
    statut_compagnie: (r.statut_compagnie as string | null) ?? null,
    commercial_id: (r.commercial_id as string | null) ?? null,
    commercial_prenom: (r.commercial_prenom as string | null) ?? null,
  }))
}

// ── Vue portefeuille (renouvellements prévisionnels par mois) ─
// 1 ligne par mois de renouvellement prévu pour chaque contrat actif.
// Tri annee ASC, mois ASC pour avoir l'ordre chronologique.
export async function fetchPortefeuille(): Promise<PortefeuilleRow[]> {
  const { data, error } = await supabase
    .from('tadmin_v_portefeuille')
    .select('*')
    .order('annee', { ascending: true })
    .order('mois', { ascending: true })
  if (error) throw new Error(`tadmin_v_portefeuille: ${error.message}`)
  return (data ?? []).map((r) => ({
    commercial_id: (r.commercial_id as string | null) ?? null,
    commercial_prenom: (r.commercial_prenom as string | null) ?? null,
    contrat_id: r.contrat_id as string,
    client: (r.client as string | null) ?? '',
    compagnie_assureur: (r.compagnie_assureur as string | null) ?? null,
    date_signature: (r.date_signature as string | null) ?? null,
    date_effet: (r.date_effet as string | null) ?? null,
    cotisation_mensuelle:
      r.cotisation_mensuelle !== null && r.cotisation_mensuelle !== undefined
        ? Number(r.cotisation_mensuelle)
        : null,
    type_commission: (r.type_commission as string | null) ?? null,
    origine: (r.origine as string | null) ?? null,
    annee: Number(r.annee),
    mois: Number(r.mois),
    com_societe: Number(r.com_societe) || 0,
    com_mandataire: Number(r.com_mandataire) || 0,
  }))
}

// ── Vue rétractations + taux mandataire calculé serveur ──────
export async function fetchRetractations(): Promise<RetractationRow[]> {
  const { data, error } = await supabase
    .from('tadmin_v_retractations')
    .select('*')
  if (error) throw new Error(`tadmin_v_retractations: ${error.message}`)
  return (data ?? []).map((r) => ({
    contrat_id: r.contrat_id as string,
    client: (r.client as string | null) ?? '',
    compagnie_assureur: (r.compagnie_assureur as string | null) ?? null,
    date_signature: (r.date_signature as string | null) ?? null,
    cotisation_mensuelle:
      r.cotisation_mensuelle !== null && r.cotisation_mensuelle !== undefined
        ? Number(r.cotisation_mensuelle)
        : null,
    type_commission: (r.type_commission as string | null) ?? null,
    origine: (r.origine as string | null) ?? null,
    statut_compagnie: (r.statut_compagnie as string | null) ?? null,
    commercial_id: (r.commercial_id as string | null) ?? null,
    commercial_prenom: (r.commercial_prenom as string | null) ?? null,
    taux_mandataire: Number(r.taux_mandataire) || 0.25,
  }))
}

export async function fetchVersements(): Promise<Versement[]> {
  const { data, error } = await supabase
    .from('tadmin_v_versements')
    .select('*')
    .order('annee', { ascending: false })
    .order('mois', { ascending: false })
  if (error) throw new Error(`tadmin_v_versements: ${error.message}`)
  return (data ?? []).map((r) => ({
    compagnie: (r.compagnie as string | null) ?? '',
    annee: Number(r.annee),
    mois: Number(r.mois),
    verse: r.verse !== null && r.verse !== undefined ? Number(r.verse) : null,
    prevu: r.prevu !== null && r.prevu !== undefined ? Number(r.prevu) : null,
    ecart: r.ecart !== null && r.ecart !== undefined ? Number(r.ecart) : null,
    date_versement: (r.date_versement as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  }))
}
