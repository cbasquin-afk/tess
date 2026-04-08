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
  // Le natif charge uniquement les instances ouvertes, ordonnées par
  // deadline ASC (les plus urgentes en premier, NULL en dernier).
  const { data, error } = await supabase
    .from('tadmin_v_instances')
    .select('*')
    .eq('statut', 'ouvert')
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

// Sprints A3+ ajouteront : insertContrat, updateSaisie, updateField,
// upsertAsafCloture, deleteAsafCloture, etc.
