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

export type FeuTricolore = 'vert' | 'orange' | 'rouge' | 'neutre'

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
