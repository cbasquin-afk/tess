// Lecture seule depuis tadmin_v_commissions
export interface CommissionRow {
  contrat_id: string
  annee: number
  mois: number
  montant_com_societe: number
  montant_com_mandataire: number
  montant_frais: number
  type_ligne: string | null
}

// Lecture light depuis tadmin_v_contrats — sélection minimale pour join
export interface ContratLean {
  id: string
  commercial_prenom: string | null
  compagnie_assureur: string | null
  origine: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  date_signature: string | null
}

// Agrégation client-side : 1 ligne par mois
export interface CAMensuel {
  annee: number
  mois: number
  ca_societe: number
  ca_mandataire: number
  frais: number
  nb_lignes: number
}

// Agrégation client-side : 1 ligne par commercial × mois
export interface CAParCommercial {
  commercial_prenom: string
  annee: number
  mois: number
  ca_societe: number
  ca_mandataire: number
  frais: number
  nb_contrats: number
}

// ── Vue tadmin_v_commissions_detail ───────────────────────────
export interface CommissionDetail {
  id: string
  contrat_id: string
  annee: number
  mois: number
  type_ligne: string | null
  montant_com_societe: number
  montant_com_mandataire: number
  montant_frais: number
  client: string
  compagnie_assureur: string | null
  origine: string | null
  type_commission: string | null
  cotisation_mensuelle: number | null
  frais_service: number | null
  date_signature: string | null
  statut_compagnie: string | null
  commercial_id: string | null
  commercial_prenom: string | null
}

// ── Vue tadmin_v_portefeuille (nouvelle structure) ───────────
// Désormais 1 ligne par mois de renouvellement prévu, source : moteur
// de calcul Supabase. Anciennes colonnes com_lineaire_* supprimées.
// Chaque contrat a N lignes (une par mois prévu), avec com_societe et
// com_mandataire calculés serveur depuis commissions_prevues.
export interface PortefeuilleRow {
  commercial_id: string | null
  commercial_prenom: string | null
  contrat_id: string
  client: string
  compagnie_assureur: string | null
  date_signature: string | null
  date_effet: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  origine: string | null
  annee: number
  mois: number
  com_societe: number
  com_mandataire: number
}

// ── Vue tadmin_v_retractations ────────────────────────────────
export interface RetractationRow {
  contrat_id: string
  client: string
  compagnie_assureur: string | null
  date_signature: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  origine: string | null
  statut_compagnie: string | null
  commercial_id: string | null
  commercial_prenom: string | null
  taux_mandataire: number
}

// Lecture depuis tadmin_v_versements (vide pour l'instant)
export interface Versement {
  compagnie: string
  annee: number
  mois: number
  verse: number | null
  prevu: number | null
  ecart: number | null
  date_versement: string | null
  notes: string | null
}
