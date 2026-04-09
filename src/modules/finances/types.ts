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

// ── Vue tadmin_v_portefeuille (structure plate) ─────────────
// 1 ligne par contrat actif avec agrégats 24 mois + mois courant/suivant.
// Plus de colonnes annee/mois — les calculs sont faits serveur.
export interface PortefeuilleRow {
  commercial_id: string | null
  commercial_prenom: string | null
  contrat_id: string
  client: string
  compagnie_assureur: string | null
  type_commission: string | null
  cotisation_mensuelle: number | null
  date_signature: string | null
  date_effet: string | null
  statut_compagnie: string | null
  origine: string | null
  com_societe_24m: number
  com_mandataire_24m: number
  com_societe_mois: number
  com_societe_mois_suivant: number
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

// ── Vue tadmin_v_commissions_mandataires ─────────────────────
// 1 ligne par commercial × mois de signature (LR/Linéaire : 12 mois
// agrégés au mois de signature, COVERITY rattaché à date_signature)
export interface CommissionMandataire {
  commercial_id: string
  commercial_prenom: string
  annee: number
  mois: number
  nb_contrats: number
  com_societe: number
  com_mandataire: number
}

// ── Vue tadmin_v_commissions_mandataires_detail ──────────────
// 1 ligne par contrat (pas par ligne mensuelle)
export interface CommissionMandataireDetail {
  contrat_id: string
  commercial_id: string
  commercial_prenom: string
  annee: number
  mois: number
  client: string
  compagnie_assureur: string
  type_contrat: string | null
  type_commission: string | null
  origine: string | null
  source: string | null
  date_signature: string | null
  cotisation_mensuelle: number
  montant_com_societe: number
  montant_com_mandataire: number
  taux_mandataire_pct: number
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

// ── Vue tadmin_v_reprises ────────────────────────────────────
export interface RepriseRow {
  id: string
  contrat_id: string | null
  client: string
  compagnie: string | null
  motif: string | null
  montant: number
  annee: number
  mois: number
  notes: string | null
  created_at: string
  type_contrat: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  commercial: string | null
}

// ── Vue tadmin_v_marge_mensuelle ─────────────────────────────
export interface MargeMensuelle {
  annee: number
  mois: number
  com_societe: number
  frais_service: number
  reprises: number
  nb_leads: number
  cout_leads: number
  cout_oggo: number
  cout_telephonie: number
  cout_communication: number
  cout_site: number
  cout_autre: number
  total_charges: number
  marge_nette: number
  nb_contrats: number
}

// ── Vue tadmin_v_charges_mensuelles ──────────────────────────
export interface ChargeMensuelle {
  id: string
  annee: number
  mois: number
  categorie: string
  fournisseur: string
  libelle: string | null
  montant: number
  nb_leads: number | null
  notes: string | null
  created_at: string
}
