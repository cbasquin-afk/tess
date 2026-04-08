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
