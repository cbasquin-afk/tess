import { supabase } from '@/shared/supabase'
import type {
  TadminAsafCloture,
  TadminCommission,
  TadminContrat,
  TadminInstance,
  TadminKpis,
} from './types'

// ── Lectures via vues publiques ───────────────────────────────
export async function fetchKpis(): Promise<TadminKpis | null> {
  const { data, error } = await supabase
    .from('tadmin_v_kpis')
    .select('*')
    .maybeSingle<TadminKpis>()
  if (error) throw new Error(`tadmin_v_kpis: ${error.message}`)
  return data
}

export async function fetchInstances(): Promise<TadminInstance[]> {
  // Instances non résolues : 'ouvert' (ancien) + 'En cours' (nouveau).
  // Tri deadline ASC, NULL en dernier.
  const { data, error } = await supabase
    .from('tadmin_v_instances')
    .select('*')
    .in('statut', ['ouvert', 'En cours'])
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw new Error(`tadmin_v_instances: ${error.message}`)
  return (data ?? []) as TadminInstance[]
}

export async function fetchContrats(): Promise<TadminContrat[]> {
  // Le natif charge tout puis re-trie par date_signature DESC côté client.
  // On reproduit ce comportement ici.
  const { data, error } = await supabase
    .from('tadmin_v_contrats')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`tadmin_v_contrats: ${error.message}`)
  const rows = (data ?? []) as TadminContrat[]
  return [...rows].sort((a, b) => {
    const da = a.date_signature ?? ''
    const db = b.date_signature ?? ''
    return db.localeCompare(da)
  })
}

export async function fetchClotures(): Promise<TadminAsafCloture[]> {
  const { data, error } = await supabase
    .from('tadmin_v_asaf_clotures')
    .select('*')
    .order('annee', { ascending: false })
    .order('mois', { ascending: false })
  if (error) throw new Error(`tadmin_v_asaf_clotures: ${error.message}`)
  return (data ?? []) as TadminAsafCloture[]
}

export async function fetchCommissions(
  contratId: string,
): Promise<TadminCommission[]> {
  const { data, error } = await supabase
    .from('tadmin_v_commissions')
    .select('*')
    .eq('contrat_id', contratId)
    .order('annee', { ascending: true })
    .order('mois', { ascending: true })
  if (error) throw new Error(`tadmin_v_commissions: ${error.message}`)
  return (data ?? []) as TadminCommission[]
}

// ── RPCs ──────────────────────────────────────────────────────
export async function resolveInstance(
  gmailMessageIdOrId: string,
): Promise<void> {
  const { error } = await supabase.rpc('tadmin_resolve_instance', {
    p_gmail_message_id: gmailMessageIdOrId,
  })
  if (error) throw new Error(`tadmin_resolve_instance: ${error.message}`)
}

export async function deleteContrat(contratId: string): Promise<void> {
  const { error } = await supabase.rpc('tadmin_delete_contrat', {
    p_contrat_id: contratId,
  })
  if (error) throw new Error(`tadmin_delete_contrat: ${error.message}`)
}

export async function syncFromPerflead(): Promise<void> {
  const { error } = await supabase.rpc('tadmin_sync_from_perflead')
  if (error) throw new Error(`tadmin_sync_from_perflead: ${error.message}`)
}

// ── Contrats ──────────────────────────────────────────────────
// Signature et nommage des params alignés sur le natif app.html
// (fonction confirmAdd ligne 991+).
export interface InsertContratParams {
  client: string
  type_contrat: string // 'Mutuelle' par défaut
  origine: string // 'Mapapp' par défaut
  commercial_prenom: string | null
  date_signature: string | null
  compagnie_assureur: string | null
  cotisation_mensuelle: number | null
  recurrent: boolean
  date_effet: string | null
  type_commission: string | null
  frais_service: number | null
}

export async function insertContrat(p: InsertContratParams): Promise<void> {
  const { error } = await supabase.rpc('tadmin_insert_contrat', {
    p_client: p.client,
    p_type_contrat: p.type_contrat,
    p_origine: p.origine,
    p_commercial_prenom: p.commercial_prenom,
    p_date_signature: p.date_signature,
    p_compagnie_assureur: p.compagnie_assureur,
    p_cotisation_mensuelle: p.cotisation_mensuelle,
    p_recurrent: p.recurrent,
    p_date_effet: p.date_effet,
    p_type_commission: p.type_commission,
    p_frais_service: p.frais_service,
    p_statut_compagnie: 'En attente',
    p_source: 'manuel',
    p_notes: null,
    p_type_resiliation: null,
  })
  if (error) throw new Error(`tadmin_insert_contrat: ${error.message}`)
}

// ── Saisie / Résiliation ──────────────────────────────────────
// Aligné sur confirmSaisie() ligne 951+. Note : p_resil_envoyee est
// dérivé : true si resilStatut existe et n'est pas 'EN ATTENTE'.
export interface UpdateSaisieParams {
  contrat_id: string
  statut_compagnie: string | null
  statut_saisie: string | null
  type_resiliation: string | null
  resil_statut: string | null
  date_resiliation: string | null
  date_envoi: string | null
  date_ar: string | null
}

// ── Clôtures ASAF ─────────────────────────────────────────────
export interface UpsertAsafClotureParams {
  annee: number
  mois: number
  date_cloture: string | null
  note: string | null
}

export async function upsertAsafCloture(
  p: UpsertAsafClotureParams,
): Promise<void> {
  const { error } = await supabase.rpc('tadmin_upsert_asaf_cloture', {
    p_annee: p.annee,
    p_mois: p.mois,
    p_date_cloture: p.date_cloture,
    p_note: p.note,
  })
  if (error) throw new Error(`tadmin_upsert_asaf_cloture: ${error.message}`)
}

export async function deleteAsafCloture(
  annee: number,
  mois: number,
): Promise<void> {
  const { error } = await supabase.rpc('tadmin_delete_asaf_cloture', {
    p_annee: annee,
    p_mois: mois,
  })
  if (error) throw new Error(`tadmin_delete_asaf_cloture: ${error.message}`)
}

// ── Édition cellule en place ──────────────────────────────────
// RPC générique : update d'un seul champ d'un contrat. Utilisé par
// les selects inline de la vue Saisie pour modifier statut_saisie /
// statut_compagnie / resil_statut sans ouvrir de modal.
export async function updateField(
  contratId: string,
  field: string,
  value: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('tadmin_update_field', {
    p_contrat_id: contratId,
    p_field: field,
    p_value: value,
  })
  if (error) throw new Error(`tadmin_update_field: ${error.message}`)
}

export async function updateSaisie(p: UpdateSaisieParams): Promise<void> {
  const resilEnvoyee = !!(
    p.resil_statut && p.resil_statut !== 'EN ATTENTE'
  )
  const { error } = await supabase.rpc('tadmin_update_saisie', {
    p_contrat_id: p.contrat_id,
    p_statut_compagnie: p.statut_compagnie,
    p_statut_saisie: p.statut_saisie,
    p_type_resiliation: p.type_resiliation,
    p_resil_envoyee: resilEnvoyee,
    p_resil_statut: p.resil_statut,
    p_date_resiliation: p.date_resiliation,
    p_date_envoi: p.date_envoi,
    p_date_ar: p.date_ar,
  })
  if (error) throw new Error(`tadmin_update_saisie: ${error.message}`)
}
