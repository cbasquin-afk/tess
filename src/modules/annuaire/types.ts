export type StatutPage = 'publiee' | 'brouillon' | 'archivee'
export type StatutPartenaire =
  | 'partenaire_direct'
  | 'partenaire_indirect'
  | 'non_partenaire'
export type NiveauTessoria = 'essentiel' | 'confort' | 'renforce' | 'premium'
export type SituationReco =
  | 'fin_collectif'
  | 'trop_cher'
  | 'gros_soin'
  | 'couple'
  | 'independant'

export const NIVEAUX: readonly NiveauTessoria[] = [
  'essentiel',
  'confort',
  'renforce',
  'premium',
] as const

export const SITUATIONS: readonly SituationReco[] = [
  'fin_collectif',
  'trop_cher',
  'gros_soin',
  'couple',
  'independant',
] as const

export const VERTICALES_ANNUAIRE = [
  'senior',
  'tns',
  'generique',
  'frontalier',
  'collective',
] as const

// ── Depuis v_annuaire ────────────────────────────────────────
export interface AnnuaireRow {
  slug: string
  seo_title_override: string | null
  note_courtier: number | null
  prix_entree_marche: number | null
  niveaux_disponibles: string[]
  age_min_verifie: number | null
  age_max_verifie: number | null
  has_garanties: boolean
  has_tarifs: boolean
  nb_tarifs_devis: number
  nb_formules_mappees: number
  nb_references: number
  nb_regles_reco: number
  statut_page: StatutPage
  statut_partenaire: StatutPartenaire
  verticales: string[] | null
  alerte_verif: boolean | null
  date_derniere_maj: string | null
  updated_at: string
}

// ── annuaire_statut ──────────────────────────────────────────
export interface AnnuaireStatut {
  slug: string
  statut_page: StatutPage
  statut_partenaire: StatutPartenaire
  verticales: string[]
  alerte_verif: boolean
  date_derniere_maj: string | null
  note_interne: string | null
  updated_at: string
}

// ── annuaire_formule_niveau ──────────────────────────────────
export interface FormuleNiveau {
  id: number
  slug: string
  gamme: string
  formule_ref: string
  niveau_tessoria: NiveauTessoria
  est_formule_reference: boolean
  ordre_affichage: number | null
  valide_depuis: string | null
}

// ── annuaire_recommandation ──────────────────────────────────
export interface RecommandationRule {
  id: number
  slug: string
  situation: SituationReco | null
  age_band: string | null
  besoin_prioritaire: string | null
  niveau_cible: string | null
  score: number
  argument_pour: string | null
  argument_contre: string | null
  alternative_slug: string | null
  alternative_argument: string | null
  actif: boolean
  updated_at: string
}

// ── marque_verticale_mutuelle — champs éditables ──────────────
export interface TarifParAge {
  age: number
  prix_min: number
  prix_max: number
}

export interface MutuelleEditableFields {
  slug: string
  seo_title_override: string | null
  seo_meta_override: string | null
  prix_entree_marche: number | null
  prix_entree_age_label: string | null
  note_courtier: number | null
  age_min_verifie: number | null
  age_max_verifie: number | null
  age_min_adhesion: number | null
  age_max_adhesion: number | null
  niveaux_disponibles: string[]
  tarifs_par_age: TarifParAge[] | null
  source_tarifs: string | null
  source_tarifs_url: string | null
  source_tarifs_date: string | null
  source_tarifs_validee: boolean
  source_tarifs_note: string | null
  analyse_courtier: string | null
  ce_que_tessoria_en_pense: string | null
  points_forts: string[] | null
  points_vigilance: string[] | null
  noindex: boolean
  updated_at: string
}
