import { supabase } from '@/shared/supabase'
import type {
  ChargeMensuelle,
  CommissionDetail,
  CommissionMandataire,
  CommissionMandataireDetail,
  CommissionRow,
  ContratLean,
  FactureMandataire,
  MargeMensuelle,
  PortefeuilleRow,
  RepriseRow,
  RetractationRow,
  StatutFacture,
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

// ── Vue portefeuille (1 ligne par contrat actif, agrégats serveur) ─
export async function fetchPortefeuille(): Promise<PortefeuilleRow[]> {
  const { data, error } = await supabase
    .from('tadmin_v_portefeuille')
    .select('*')
    .order('client', { ascending: true })
  if (error) throw new Error(`tadmin_v_portefeuille: ${error.message}`)
  return (data ?? []).map((r) => ({
    commercial_id: (r.commercial_id as string | null) ?? null,
    commercial_prenom: (r.commercial_prenom as string | null) ?? null,
    contrat_id: r.contrat_id as string,
    client: (r.client as string | null) ?? '',
    compagnie_assureur: (r.compagnie_assureur as string | null) ?? null,
    type_commission: (r.type_commission as string | null) ?? null,
    cotisation_mensuelle:
      r.cotisation_mensuelle !== null && r.cotisation_mensuelle !== undefined
        ? Number(r.cotisation_mensuelle)
        : null,
    date_signature: (r.date_signature as string | null) ?? null,
    date_effet: (r.date_effet as string | null) ?? null,
    statut_compagnie: (r.statut_compagnie as string | null) ?? null,
    origine: (r.origine as string | null) ?? null,
    com_societe_24m: Number(r.com_societe_24m) || 0,
    com_mandataire_24m: Number(r.com_mandataire_24m) || 0,
    com_societe_mois: Number(r.com_societe_mois) || 0,
    com_societe_mois_suivant: Number(r.com_societe_mois_suivant) || 0,
  }))
}

// ── Commissions mandataires (par date_signature) ────────────
export async function fetchCommissionsMandataires(
  annee?: number,
): Promise<CommissionMandataire[]> {
  let q = supabase.from('tadmin_v_commissions_mandataires').select('*')
  if (annee) q = q.eq('annee', annee)
  const { data, error } = await q
    .order('annee', { ascending: true })
    .order('mois', { ascending: true })
    .order('commercial_prenom', { ascending: true })
  if (error) throw new Error(`tadmin_v_commissions_mandataires: ${error.message}`)
  return (data ?? []) as CommissionMandataire[]
}

export async function fetchCommissionsMandataireDetail(
  annee: number,
  mois: number,
  commercial_id: string,
): Promise<CommissionMandataireDetail[]> {
  const { data, error } = await supabase
    .from('tadmin_v_commissions_mandataires_detail')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .eq('commercial_id', commercial_id)
    .order('date_signature', { ascending: true })
    .order('client', { ascending: true })
  if (error)
    throw new Error(`tadmin_v_commissions_mandataires_detail: ${error.message}`)
  return (data ?? []) as CommissionMandataireDetail[]
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

// ── Commissions détaillées pour un mois spécifique (drill-down CA) ──
export async function fetchCommissionsParMois(
  annee: number,
  mois: number,
): Promise<CommissionDetail[]> {
  const { data, error } = await supabase
    .from('tadmin_v_commissions_detail')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .eq('type_ligne', 'commission')
    .order('client', { ascending: true })
  if (error) throw new Error(`tadmin_v_commissions_detail: ${error.message}`)
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

// ── Reprises ─────────────────────────────────────────────────
export async function fetchReprises(): Promise<RepriseRow[]> {
  const { data, error } = await supabase
    .from('tadmin_v_reprises')
    .select('*')
    .order('annee', { ascending: false })
    .order('mois', { ascending: false })
  if (error) throw new Error(`tadmin_v_reprises: ${error.message}`)
  return (data ?? []) as RepriseRow[]
}

export async function upsertReprise(params: {
  id?: string
  contrat_id?: string | null
  client: string
  compagnie?: string | null
  motif?: string | null
  montant: number
  annee: number
  mois: number
  notes?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('tadmin_upsert_reprise', {
    p_id: params.id ?? null,
    p_contrat_id: params.contrat_id ?? null,
    p_client: params.client,
    p_compagnie: params.compagnie ?? null,
    p_motif: params.motif ?? null,
    p_montant: params.montant,
    p_annee: params.annee,
    p_mois: params.mois,
    p_notes: params.notes ?? null,
  })
  if (error) throw new Error(`tadmin_upsert_reprise: ${error.message}`)
  return data as string
}

export async function deleteReprise(id: string): Promise<void> {
  const { error } = await supabase.rpc('tadmin_delete_reprise', { p_id: id })
  if (error) throw new Error(`tadmin_delete_reprise: ${error.message}`)
}

// ── Marge mensuelle + Charges ────────────────────────────────
export async function fetchMargeMensuelle(): Promise<MargeMensuelle[]> {
  const { data, error } = await supabase
    .from('tadmin_v_marge_mensuelle')
    .select('*')
    .order('annee', { ascending: true })
    .order('mois', { ascending: true })
  if (error) throw new Error(`tadmin_v_marge_mensuelle: ${error.message}`)
  return (data ?? []) as MargeMensuelle[]
}

export async function fetchCharges(
  annee: number,
  mois: number,
): Promise<ChargeMensuelle[]> {
  const { data, error } = await supabase
    .from('tadmin_v_charges_mensuelles')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .order('categorie')
  if (error) throw new Error(`tadmin_v_charges_mensuelles: ${error.message}`)
  return (data ?? []) as ChargeMensuelle[]
}

export async function upsertCharge(params: {
  id?: string
  annee: number
  mois: number
  categorie: string
  fournisseur: string
  libelle?: string | null
  montant: number
  nb_leads?: number | null
  notes?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('tadmin_upsert_charge', {
    p_id: params.id ?? null,
    p_annee: params.annee,
    p_mois: params.mois,
    p_categorie: params.categorie,
    p_fournisseur: params.fournisseur,
    p_libelle: params.libelle ?? null,
    p_montant: params.montant,
    p_nb_leads: params.nb_leads ?? null,
    p_notes: params.notes ?? null,
  })
  if (error) throw new Error(`tadmin_upsert_charge: ${error.message}`)
  return data as string
}

export async function deleteCharge(id: string): Promise<void> {
  const { error } = await supabase.rpc('tadmin_delete_charge', { p_id: id })
  if (error) throw new Error(`tadmin_delete_charge: ${error.message}`)
}

// ── Factures mandataires ────────────────────────────────────
export async function fetchFactures(): Promise<FactureMandataire[]> {
  const { data, error } = await supabase
    .from('finances_v_factures_mandataires')
    .select('*')
    .order('annee', { ascending: false })
    .order('mois', { ascending: false })
  if (error) throw new Error(`finances_v_factures_mandataires: ${error.message}`)
  return (data ?? []) as FactureMandataire[]
}

export async function insertFacture(params: {
  commercial_id: string
  annee: number
  mois: number
  montant_ht: number
  montant_tva: number
  notes?: string | null
}): Promise<void> {
  const { error } = await supabase
    .schema('finances')
    .from('factures_mandataires')
    .insert({
      commercial_id: params.commercial_id,
      annee: params.annee,
      mois: params.mois,
      montant_ht: params.montant_ht,
      montant_tva: params.montant_tva,
      notes: params.notes ?? null,
    })
  if (error) throw new Error(`insert facture: ${error.message}`)
}

export async function updateFactureStatut(
  id: string,
  statut: StatutFacture,
): Promise<void> {
  const { error } = await supabase
    .schema('finances')
    .from('factures_mandataires')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`update facture statut: ${error.message}`)
}
