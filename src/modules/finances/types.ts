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
  frais_service: number
  frais_mandataire: number
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
  workflow_statut: string | null
  montant_com_societe: number
  montant_com_mandataire: number
  montant_frais: number
  montant_frais_mandataire: number
  taux_mandataire_pct: number
}

// ── Vue tadmin_v_ca_mensuel ─────────────────────────────────
export interface CAMensuelRow {
  id: string
  contrat_id: string
  annee: number
  mois: number
  type_ligne: string
  categorie: 'acquisition' | 'differee' | 'renouvellement'
  annee_signature: number
  mois_signature: number
  montant_com_societe: number
  montant_frais: number
  montant_com_mandataire: number
  client: string
  compagnie_assureur: string | null
  type_commission: string | null
  cotisation_mensuelle: number | null
  frais_service: number | null
  date_signature: string | null
  commercial_prenom: string | null
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

// ── Vue tadmin_v_versements_attendus ─────────────────────────
export interface VersementAttendu {
  compagnie: string
  annee: number
  mois: number
  nb_contrats: number
  nb_acquisitions: number
  nb_renouvellements: number
  montant_attendu: number
  montant_acquisition: number
  montant_renouvellement: number
}

export interface VersementAttenduDetail {
  id: string
  contrat_id: string
  annee: number
  mois: number
  type_ligne: 'commission' | 'renouvellement'
  montant_com_societe: number
  montant_frais: number | null
  client: string
  compagnie: string
  type_contrat: string | null
  type_commission: string | null
  date_signature: string | null
  cotisation_mensuelle: number | null
}

export const GROSSISTES = [
  'ASAF', 'FMA', 'COVERITY', 'UTWIN', 'APRIL',
  'ALPTIS', 'GSMC', 'CEGEMA',
] as const

// ── Bordereaux versements ────────────────────────────────────
export interface VersementBordereau {
  id: string
  compagnie: string
  annee: number
  mois: number
  source_file_name: string | null
  source_type: 'pdf' | 'csv' | 'manuel' | null
  total_brut_fichier: number | null
  nb_lignes_total: number
  nb_matchees: number
  nb_non_matchees: number
  status: 'uploaded' | 'parsed' | 'matched' | 'validated'
  created_at: string
  nb_auto: number
  nb_manuel: number
  nb_ambigu: number
  nb_non_match: number
  total_montant: number | null
}

export interface VersementLigne {
  id: string
  bordereau_id: string
  compagnie: string | null
  client_raw: string
  police_num: string | null
  produit: string | null
  periode_debut: string | null
  periode_fin: string | null
  base: number | null
  type_com: string | null
  taux_pct: number | null
  montant: number
  motif: string | null
  contrat_id: string | null
  match_status: 'auto' | 'manuel' | 'non_match' | 'ambigu'
  match_confidence_pct: number | null
  contrat_client: string | null
  contrat_cotisation: number | null
  contrat_date_signature: string | null
}

export const COMPAGNIES_BORDEREAU = [
  'FMA', 'ASAF', 'COVERITY', 'UTWIN', 'APRIL',
  'ALPTIS', 'GSMC', 'CEGEMA', 'SWISSLIFE', 'APICIL', 'HENNER',
] as const

// ── Config compagnie (tadmin_v_versements_config) ─────────────
export type CompagnieFormat = 'pdf_ia' | 'csv' | 'manuel'

export interface VersementConfigCompagnie {
  compagnie: string
  code_courtier: string | null
  format: CompagnieFormat
  prompt_extraction: string | null
  notes: string | null
  updated_at: string | null
}

// ── Vue tadmin_v_contrats_non_payes ──────────────────────────
export interface ContratNonPaye {
  commission_prevue_id: string
  contrat_id: string
  annee: number
  mois: number
  type_ligne: 'commission' | 'renouvellement'
  montant_attendu: number
  client: string
  compagnie: string
  type_contrat: string | null
  date_signature: string | null
  cotisation_mensuelle: number | null
  commercial_prenom: string | null
  jours_retard: number
  raison_non_paiement: string | null
  action_prise: string | null
}

// ── Simulateur de rémunération ──────────────────────────────
export interface OffreRemuneration {
  id: string
  compagnie_nom: string | null
  compagnie_nom_court: string | null
  compagnie_type_relation: string | null
  compagnie_statut_protocole: string | null
  produit_nom: string | null
  produit_code: string | null
  verticale: string
  type_commission: string | null
  taux_acq_pct: number | string | null
  taux_rec_pct: number | string | null
  taux_lin_pct: number | string | null
  precompte_disponible: boolean | null
  precompte_conditions: string | null
  surcom_actif: boolean | null
  surcom_taux_pct: number | string | null
  surcom_conditions: string | null
  statut_data: string | null
}

export type CalcType = 'LR' | 'PA' | 'LE' | 'PA_LR_PRECOMPTE' | 'PA_LR_LINEAIRE'

export interface OffreVariante {
  offre: OffreRemuneration
  variant_key: string
  variant_label: string | null
  calc_type: CalcType
}

export interface SimulationLigne {
  key: string
  offre: OffreRemuneration
  variant_label: string | null
  calc_type: CalcType
  abattement: number
  com_an_1: number | null
  com_an_N: number | null
  cumul: number | null
  reprise_an_1: number | null
  reprise_an_2: number | null
  reprise_an_3: number | null
  formule: string
}

// ── Vue finances_v_factures_mandataires ─────────────────────
export type StatutFacture = 'a_generer' | 'generee' | 'envoyee' | 'payee'

export interface FactureMandataire {
  id: string
  commercial_id: string
  commercial_prenom: string | null
  annee: number
  mois: number
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  statut: StatutFacture
  numero_facture: string | null
  url_document: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
