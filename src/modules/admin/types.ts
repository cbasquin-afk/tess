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
  type_contrat: string | null
  frais_service: number | null
  commission_totale_prevue: number | null
  created_at: string
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
