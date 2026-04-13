export type TypeRelation = '360_courtage' | 'direct_tessoria'
export type StatutProtocole = 'actif' | 'en_cours' | 'manquant' | 'expire'
export type Verticale =
  | 'sante_senior'
  | 'sante_tns'
  | 'sante_frontalier'
  | 'sante_collective'
  | 'prevoyance'
  | 'homme_cle'
  | 'emprunteur'
  | 'obseques'
  | 'animal'
  | 'dependance'
  | 'autre'
export type TypeCommission = 'LR' | 'PA' | 'PS' | 'LE' | 'PA_LR'
export type StatutData = 'complet' | 'incomplet' | 'a_verifier'

export interface Compagnie {
  id: string
  nom: string
  nom_court: string
  type_relation: TypeRelation
  statut_protocole: StatutProtocole
  code_courtier: string | null
  notes: string | null
}

export interface OffreRemuneration {
  id: string
  compagnie_id: string
  produit_nom: string
  verticale: Verticale
  type_commission: TypeCommission
  taux_acq_pct: number | null
  taux_rec_pct: number | null
  taux_lin_pct: number | null
  precompte_disponible: boolean
  effet_differe_max_mois: number | null
  surcom_actif: boolean
  priorite: number | null
  statut_data: StatutData
  questions_ouvertes: string | null
  source_document: string | null
}

export interface Protocole {
  id: string
  compagnie_id: string
  date_signature: string | null
  date_effet: string | null
  date_renouvellement: string | null
  enveloppe_annuelle: number | null
  nom_fichier: string | null
  statut: string | null
}

export interface ConditionReprise {
  id: string
  compagnie_id: string
  produit_nom: string
  reprise_0_3_mois: string | null
  reprise_4_12_mois: string | null
  reprise_4_18_mois: string | null
  reprise_4_24_mois: string | null
  reprise_12_24_mois: string | null
  seuil_rejet_pct: number | null
  seuil_reclamation_pct: number | null
  seuil_resil_pct: number | null
  notes: string | null
}
