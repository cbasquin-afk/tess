// Types alignés sur les vues `public.tessperf_*` et `public.perf_*`.

export type CommercialStatut =
  | 'actif_productif'
  | 'actif_non_productif'
  | 'suspendu'
  | 'archive'

export interface Commercial {
  id: string
  prenom: string
  email: string | null
  statut: CommercialStatut
  productif: boolean
  taux_com_lead?: number | null
  taux_com_reco?: number | null
  date_statut?: string | null
  note_statut?: string | null
}

export interface PerfParametres {
  id: number
  panier_moyen_cible: number
  taux_transfo_mapapp_cible: number
  coef_ambition: number
  ratio_frais_service_cible: number
  ratio_multi_equip_cible: number
  objectif_avis_mensuel: number
  panier_moyen_repere: number
  ca_par_contrat_repere: number
  updated_at?: string | null
  updated_by?: string | null
}

export interface MonthlyEquipe {
  annee: number
  mois: number
  mois_libelle: string
  premier_jour: string
  dernier_jour: string
  jours_ouvres_total: number
  jours_ouvres_ecoules: number
  mois_passe: boolean
  mois_en_cours: boolean
  // Leads équipe
  nb_leads_equipe_tous: number
  nb_leads_equipe_mapapp: number
  nb_decroches_equipe_tous: number
  nb_signes_crm_equipe_tous: number
  // Productifs
  nb_decroches_productifs: number
  nb_signes_productifs: number
  nb_mutuelles_productifs: number
  nb_multi_equip_productifs: number
  nb_frais_service_productifs: number
  ca_acquisition_productifs: number
  ca_projete_productifs: number
  nb_instances_productifs: number
  nb_retractations_productifs: number
  // Total équipe
  ca_acquisition_total: number
  nb_signes_total: number
  // Cibles
  panier_moyen_cible: number
  taux_transfo_mapapp_cible: number
  taux_conversion_cible: number
  coef_ambition: number
  ratio_frais_service_cible: number
  ratio_multi_equip_cible: number
  // Calculs
  objectif_ca_a_date: number
  objectif_ca_projete_fin_mois: number
  nb_leads_mapapp_projete: number
  pct_objectif_a_date: number
  taux_transfo_productifs_pct: number
  taux_conversion_productifs_pct: number
  ratio_frais_service_realise: number
  ratio_multi_equip_realise: number
}

export interface MonthlyKpis {
  annee: number
  mois: number
  mois_libelle: string
  commercial_id: string
  commercial_prenom: string
  commercial_statut: CommercialStatut
  premier_jour: string
  dernier_jour: string
  jours_ouvres_total: number
  jours_ouvres_ecoules: number
  mois_passe: boolean
  mois_en_cours: boolean
  // Contexte équipe (pas rattaché au commercial)
  nb_leads_equipe_tous: number
  nb_leads_equipe_mapapp: number
  // Activité commercial
  nb_decroches: number
  nb_signes_crm: number
  nb_contrats_signes: number
  // Source
  nb_contrats_mapapp: number
  nb_contrats_reco: number
  nb_contrats_multi_equip: number
  nb_contrats_site: number
  nb_contrats_bo: number
  // Produit
  nb_contrats_mutuelle: number
  nb_contrats_obseques: number
  nb_contrats_prevoyance: number
  nb_contrats_emprunteur: number
  nb_contrats_animal: number
  nb_contrats_autre: number
  // Qualité
  nb_frais_service: number
  total_frais_service: number
  ratio_frais_service_realise: number
  ratio_multi_equip_realise: number
  // CA
  ca_acquisition: number
  ca_total_societe: number
  panier_moyen_cotisation: number
  ca_moyen_par_contrat: number
  ca_projete_fin_mois: number
  nb_contrats_projete: number
  // Taux (signés / décrochés — cible 25 %)
  taux_conversion_pct: number
  // Sidecars
  nb_instances_creees: number
  nb_retractations: number
  taux_instance_pct: number
  taux_retractation_pct: number
}

export interface WeeklyKpis {
  semaine_debut: string
  semaine_fin: string
  commercial_id: string | null
  commercial_prenom: string | null
  commercial_statut: CommercialStatut | null
  nb_leads_recus: number
  nb_decroches: number
  nb_contrats_signes: number
  nb_mutuelles: number
  nb_multi_equip: number
  nb_frais_service: number
  ca_acquisition: number
  taux_conversion_pct: number
}

export interface WeeklyEquipe {
  semaine_debut: string
  semaine_fin: string
  annee: number
  mois: number
  nb_leads_equipe_tous: number
  nb_leads_equipe_mapapp: number
  nb_decroches_equipe_tous: number
  nb_decroches_productifs: number
  nb_signes_productifs: number
  nb_signes_total: number
  ca_acquisition_productifs: number
  ca_acquisition_total: number
  objectif_ca: number
  taux_transfo_pct: number
  taux_conversion_pct: number
}

export interface LeadsDaily {
  jour: string
  commercial_id: string | null
  attribution_brute: string
  categorie: string | null
  nb_leads: number
  nb_decroches: number
  nb_signes_crm: number
  nb_perdus: number
  nb_en_cours: number
}

export interface ContratsDaily {
  jour: string
  commercial_id: string | null
  commercial_prenom: string | null
  source: string
  type_produit: string
  nb_contrats: number
  cotisation_totale: number
  frais_service_total: number
  nb_avec_frais_service: number
  ca_acquisition_societe: number
  ca_total_societe: number
  ca_total_mandataire: number
}

export interface ContratDetail {
  id: string
  client: string
  date_signature: string
  date_effet: string | null
  compagnie_assureur: string
  type_produit: string
  source: string
  type_commission: string | null
  cotisation_mensuelle: number | null
  frais_service: number | null
  commercial_id: string | null
  commercial_prenom: string | null
  ca_acquisition: number
  ca_total: number
  workflow_statut: string
  statut_compagnie: string | null
}

export interface MonthlyParOrigine {
  annee: number
  mois: number
  mois_libelle: string
  origine: string
  nb_leads_equipe: number
  nb_decroches_equipe: number
  nb_decroches_productifs: number
  nb_signes_productifs: number
  nb_signes_mutuelle: number
  nb_signes_obseques: number
  nb_signes_prevoyance: number
  nb_signes_emprunteur: number
  nb_signes_animal: number
  nb_signes_autre: number
  nb_signes_total: number
  ca_acquisition_total: number
  nb_frais_service: number
  total_frais_service: number
  cotisation_totale: number
  ca_acquisition_productifs: number
  taux_transfo_pct: number
  taux_conversion_pct: number
  panier_moyen_cotisation: number
  ca_moyen_par_contrat: number
}

export interface MonthlyParOrigineCommercial {
  annee: number
  mois: number
  mois_libelle: string
  commercial_id: string
  commercial_prenom: string
  commercial_statut: string
  origine: string
  nb_decroches: number
  nb_signes_crm: number
  nb_contrats_signes: number
  nb_contrats_mutuelle: number
  nb_frais_service: number
  total_frais_service: number
  cotisation_totale: number
  ca_acquisition: number
  taux_conversion_pct: number
}

export type FeuTricolore = 'vert' | 'orange' | 'rouge' | 'neutre'

// ── Baromètre ────────────────────────────────────────────────
export interface BarometreMensuelEquipe {
  annee: number
  mois: number
  mois_libelle: string
  periode_debut: string
  periode_fin: string
  mois_passe: boolean
  mois_en_cours: boolean
  jours_ouvres_ecoules: number
  jours_ouvres_total: number
  nb_leads_equipe_mapapp: number
  nb_signes_productifs: number
  nb_signes_mapapp: number
  ca_acquisition_productifs: number
  ca_projete_productifs: number
  objectif_ca_a_date: number
  objectif_ca_projete_fin_mois: number
  pct_objectif_a_date: number
  taux_transfo_productifs_pct: number
  taux_conversion_productifs_pct: number
  ratio_frais_service_realise: number
  ratio_multi_equip_realise: number
  nb_retractations_productifs: number
  nb_instances_productifs: number
  nb_multi_equip_productifs: number
  nb_mutuelles_productifs: number
  nb_frais_service_productifs: number
  taux_transfo_mapapp_cible: number
  taux_conversion_cible: number
  ratio_frais_service_cible: number
  ratio_multi_equip_cible: number
}

export interface BarometreMensuelCommercial {
  annee: number
  mois: number
  mois_libelle: string
  periode_debut: string
  periode_fin: string
  commercial_id: string
  commercial_prenom: string
  commercial_statut: string
  mois_passe: boolean
  mois_en_cours: boolean
  jours_ouvres_ecoules: number
  jours_ouvres_total: number
  nb_decroches: number
  nb_contrats_signes: number
  nb_contrats_mapapp: number
  nb_contrats_reco: number
  nb_contrats_multi_equip: number
  nb_contrats_mutuelle: number
  ca_acquisition: number
  ca_projete_fin_mois: number
  taux_conversion_pct: number
  ratio_frais_service_realise: number
  ratio_multi_equip_realise: number
  nb_frais_service: number
  nb_retractations: number
  nb_instances_creees: number
  panier_moyen_cotisation: number
  ca_moyen_par_contrat: number
  nb_leads_equipe_mapapp: number
  objectif_ca_equipe: number
  taux_conversion_cible: number
  ratio_frais_service_cible: number
  ratio_multi_equip_cible: number
  panier_moyen_cible: number
  panier_moyen_repere: number
  ca_par_contrat_repere: number
}

export interface BarometreHebdoEquipe {
  semaine_debut: string
  semaine_fin: string
  nb_leads_mapapp: number
  nb_leads_tous: number
  nb_decroches_productifs_mapapp: number
  nb_signes_productifs: number
  nb_signes_mapapp: number
  nb_signes_multi_equip: number
  nb_signes_reco: number
  nb_signes_mutuelle: number
  nb_frais_service: number
  ca_acquisition_productifs: number
  taux_transfo_pct: number
  taux_conversion_pct: number
  ratio_frais_service_realise: number
  ratio_multi_equip_realise: number
  nb_leads_mapapp_prec: number
  ca_acquisition_prec: number
  nb_signes_prec: number
  delta_ca_pct: number
  taux_transfo_mapapp_cible: number
  taux_conversion_cible: number
  ratio_frais_service_cible: number
  ratio_multi_equip_cible: number
}

export interface BarometreHebdoCommercial {
  semaine_debut: string
  semaine_fin: string
  commercial_id: string
  commercial_prenom: string
  nb_decroches_mapapp: number
  nb_signes_productifs: number
  nb_signes_mapapp: number
  nb_signes_multi_equip: number
  nb_signes_mutuelle: number
  nb_frais_service: number
  ca_acquisition: number
  taux_conversion_pct: number
  ratio_frais_service_realise: number
  ratio_multi_equip_realise: number
  ca_prec: number
  nb_signes_prec: number
  delta_ca_pct: number
  taux_conversion_cible: number
  ratio_frais_service_cible: number
  ratio_multi_equip_cible: number
}

export interface DailyKpisEquipe {
  jour: string
  isodow: number
  jour_nom: string
  nb_leads_mapapp: number
  nb_leads_tous: number
  nb_decroches_productifs_mapapp: number
  nb_signes_productifs: number
  nb_signes_mapapp: number
  nb_signes_multi_equip: number
  nb_signes_reco: number
  nb_signes_mutuelle: number
  nb_frais_service: number
  ca_acquisition_productifs: number
  taux_transfo_pct: number
  taux_conversion_pct: number
  objectif_ca_jour: number
  pct_objectif_jour: number
}

// ── Hebdo × origine ──────────────────────────────────────────
export interface WeeklyParOrigine {
  semaine_debut: string
  semaine_fin: string
  origine: string
  nb_leads_equipe: number
  nb_decroches_equipe: number
  nb_decroches_productifs: number
  nb_signes_productifs: number
  nb_signes_mutuelle: number
  nb_frais_service: number
  cotisation_totale: number
  ca_acquisition_productifs: number
  taux_transfo_pct: number
  taux_conversion_pct: number
}

export interface WeeklyParOrigineCommercial {
  semaine_debut: string
  semaine_fin: string
  commercial_id: string
  commercial_prenom: string
  commercial_statut: string
  origine: string
  nb_decroches: number
  nb_contrats_signes: number
  nb_contrats_mutuelle: number
  nb_frais_service: number
  cotisation_totale: number
  ca_acquisition: number
  taux_conversion_pct: number
}

export interface DailyParOrigineEquipe {
  jour: string
  isodow: number
  origine: string
  nb_leads_equipe: number
  nb_decroches_productifs: number
  nb_signes_productifs: number
  ca_acquisition_productifs: number
  taux_transfo_pct: number
  taux_conversion_pct: number
}

export interface DailyParOrigineCommercial {
  jour: string
  isodow: number
  commercial_id: string
  commercial_prenom: string
  commercial_statut: string
  origine: string
  nb_leads: number
  nb_decroches: number
  nb_signes: number
  ca_acquisition: number
  taux_transfo_pct: number
  taux_conversion_pct: number
}

export interface DailyKpisCommercial {
  jour: string
  isodow: number
  jour_nom: string
  commercial_id: string
  commercial_prenom: string
  commercial_statut: string
  nb_leads_mapapp: number
  nb_decroches_mapapp: number
  nb_signes_productifs: number
  nb_signes_mapapp: number
  nb_signes_multi_equip: number
  nb_signes_mutuelle: number
  nb_frais_service: number
  ca_acquisition: number
  taux_transfo_pct: number
  taux_conversion_pct: number
  objectif_ca_jour: number
  pct_objectif_jour: number
}

export interface Constat {
  icon: string
  titre: string
  description: string
  statut: 'vert' | 'orange' | 'rouge'
  metric_name?: string
  valeur?: number
  cible?: number
}

export interface Suggestion {
  icon: string
  titre: string
  description: string
  impact_estime?: string
}

export interface BarometreData {
  periode: 'mensuel' | 'hebdomadaire'
  scope: 'equipe' | 'commercial'
  commercial_prenom?: string
  periode_libelle: string
  points_forts: Constat[]
  points_ameliorer: Constat[]
  suggestions: Suggestion[]
  // Tendance hebdo
  tendance_ca?: { delta_pct: number; ca_prec: number }
}

// ── Origine : filtre UI unifié ────────────────────────────────
export const ORIGINES = [
  'toutes',
  'mapapp',
  'site',
  'recommandation',
  'multi_equipement',
  'back_office',
] as const
export type Origine = (typeof ORIGINES)[number]

export const ORIGINE_LABELS: Record<Origine, string> = {
  toutes: 'Toutes',
  mapapp: 'Mapapp',
  site: 'Site',
  recommandation: 'Recommandation',
  multi_equipement: 'Multi-équipement',
  back_office: 'Back-office',
}

export function isOrigine(s: string | null | undefined): s is Origine {
  if (!s) return false
  return (ORIGINES as readonly string[]).includes(s)
}
