import { supabase } from '@/shared/supabase'
import type { CommissionRow, ContratLean, Versement } from './types'

export async function fetchAllCommissions(): Promise<CommissionRow[]> {
  const { data, error } = await supabase
    .from('tadmin_v_commissions')
    .select(
      'contrat_id, annee, mois, montant_com_societe, montant_com_mandataire, montant_frais, type_ligne',
    )
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
