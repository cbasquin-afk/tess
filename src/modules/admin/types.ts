// Types alignés sur les vraies colonnes des vues `tadmin_v_*` du natif
// (cf. /Users/chrisb/tessadmin/app.html — fonctions loadKPIs / loadInstances /
// loadContrats). Si une vue change côté Supabase, ce fichier doit suivre.

// ── Vue tadmin_v_kpis (single row) ────────────────────────────
export interface TadminKpis {
  contrats_30j: number
  contrats_en_attente: number
  com_30j: number | null
  com_annee_courante: number | null
  panier_moyen_30j: number | null
  instances_ouvertes: number
  instances_urgentes: number
}

// ── Vue tadmin_v_instances ────────────────────────────────────
export type TadminSource = 'ASAF' | 'FMA' | 'SMATIS' | 'VERALTI' | string

export interface TadminInstance {
  id: string
  contrat_id: string | null
  client_nom: string
  source: TadminSource
  motif: string | null
  date_reception: string | null // date ISO
  deadline: string | null // date ISO
  jours_restants: number | null // calculé par la vue
  statut: string // 'ouvert' | 'resolu'
  gmail_message_id: string | null
}

// ── Vue tadmin_v_contrats (lecture large) ─────────────────────
export type TadminStatutCompagnie =
  | 'En attente'
  | 'Validé'
  | 'Instance'
  | 'Rétracté'
  | 'Résilié'
  | string

export interface TadminContrat {
  id: string
  client: string
  compagnie_assureur: string | null
  origine: string | null
  commercial_prenom: string | null
  date_signature: string | null
  date_effet: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  recurrent: boolean
  commission_generee: number | null
  statut_compagnie: TadminStatutCompagnie | null
  statut_saisie: string | null
  type_resiliation: string | null
  resil_statut: string | null
  date_resiliation: string | null
  resil_date_envoi: string | null
  resil_date_ar: string | null
  resil_url_depot: string | null
  resil_url_ar: string | null
  type_contrat: string | null
  frais_service: number | null
  commission_totale_prevue: number | null
  created_at: string
}

// ── Workflow statut ──────────────────────────────────────────
export type WorkflowStatut = 'zone_tampon' | 'actif' | 'instance' | 'retracte' | 'resilie'

// ── Vue tadmin_v_zone_tampon ─────────────────────────────────
export interface ZoneTamponRow {
  id: string
  client: string
  commercial_prenom: string | null
  compagnie_assureur: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  date_signature: string | null
  date_effet: string | null
  statut_compagnie: string | null
  workflow_statut: WorkflowStatut
  type_contrat: string | null
  origine: string | null
}

// ── Vue tadmin_v_retractations (admin) ───────────────────────
export interface AdminRetractationRow {
  id: string
  client: string
  commercial_prenom: string | null
  compagnie_assureur: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  date_signature: string | null
  origine: string | null
}

// ── Vue tadmin_v_resiliations_v2 ─────────────────────────────
export interface ResiliationV2Row {
  id: string
  client: string
  commercial_prenom: string | null
  compagnie_assureur: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  date_signature: string | null
  date_effet: string | null
  statut_perflead: string | null
  date_resiliation_perflead: string | null
  type_resiliation: string | null
  resil_statut: string | null
  resil_date_envoi: string | null
  resil_date_ar: string | null
  resil_url_depot: string | null
  resil_url_ar: string | null
}

// ── Badges (RPC tadmin_get_badges) ───────────────────────────
export interface AdminBadges {
  zone_tampon: number
  instances: number
}

// ── Vue tadmin_v_asaf_clotures ────────────────────────────────
export interface TadminAsafCloture {
  annee: number
  mois: number
  date_cloture: string | null
  note: string | null
}

// ── Vue tadmin_v_commissions ──────────────────────────────────
export interface TadminCommission {
  contrat_id: string
  annee: number
  mois: number
  montant_com_societe: number | null
  montant_frais: number | null
  type_ligne: string | null
}

// ── Vue tadmin_v_contrats_resiliations ───────────────────────
export type ResiliationEtape =
  | 'aucune'
  | 'a_planifier'
  | 'envoyee_attente_ar'
  | 'ar_recu'
  | 'refusee'

export type ResiliationCategorie = 'a_traiter' | 'finalise'

export interface ContratResiliation {
  contrat_id: string
  client: string
  compagnie_assureur: string | null
  type_contrat: string | null
  origine: string | null
  workflow_statut: string
  statut_compagnie: string | null
  cotisation_mensuelle: number | null
  date_signature: string | null
  date_effet: string | null
  date_transmission: string | null
  commercial_id: string | null
  commercial_prenom: string | null
  contrat_notes: string | null

  resiliation_id: string | null
  type_resiliation: string | null
  resiliation_envoyee: boolean | null
  resiliation_statut: string | null
  resiliation_date_envoi: string | null
  resiliation_date_ar: string | null
  resiliation_date_effet: string | null
  resiliation_url_depot: string | null
  resiliation_url_ar: string | null
  gmail_depot_id: string | null
  gmail_ar_id: string | null
  resiliation_commentaire: string | null

  resiliation_etape: ResiliationEtape
  resiliation_attendue: boolean
}

export const RESILIATION_ETAPE_LABELS: Record<
  ResiliationEtape,
  { label: string; categorie: ResiliationCategorie; bg: string; fg: string }
> = {
  aucune: { label: 'Aucune', categorie: 'a_traiter', bg: '#fee2e2', fg: '#b91c1c' },
  a_planifier: { label: 'À planifier', categorie: 'a_traiter', bg: '#fef9c3', fg: '#854d0e' },
  envoyee_attente_ar: { label: 'Attente AR', categorie: 'a_traiter', bg: '#ffedd5', fg: '#9a3412' },
  ar_recu: { label: 'AR reçu', categorie: 'finalise', bg: '#d1fae5', fg: '#047857' },
  refusee: { label: 'Refusée', categorie: 'a_traiter', bg: '#fee2e2', fg: '#b91c1c' },
}
