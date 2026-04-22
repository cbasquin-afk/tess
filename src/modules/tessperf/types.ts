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
  // Volumes
  nb_leads_total_mapapp: number
  nb_leads_productifs: number
  nb_decroches_productifs: number
  nb_signes_productifs: number
  nb_mutuelles_productifs: number
  nb_multi_equip_productifs: number
  nb_frais_service_productifs: number
  // CA
  ca_acquisition_productifs: number
  ca_projete_productifs: number
  ca_acquisition_total: number
  nb_signes_total: number
  // Sidecars
  nb_instances_productifs: number
  nb_retractations_productifs: number
  // KPIs
  taux_conversion_productifs_pct: number
  ratio_frais_service_realise: number
  ratio_frais_service_cible: number
  ratio_multi_equip_realise: number
  ratio_multi_equip_cible: number
  // Objectifs
  panier_moyen_cible: number
  taux_transfo_mapapp_cible: number
  coef_ambition: number
  objectif_ca_a_date: number
  nb_leads_projete_fin_mois: number
  objectif_ca_projete_fin_mois: number
  pct_objectif_a_date: number
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
  // Volumes
  nb_leads_recus: number
  nb_leads_total_mapapp: number
  nb_decroches: number
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
  // Projection
  ca_projete_fin_mois: number
  nb_contrats_projete: number
  // Taux
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

export type FeuTricolore = 'vert' | 'orange' | 'rouge' | 'neutre'
