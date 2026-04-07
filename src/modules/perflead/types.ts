export type LeadCategorie =
  | 'Contrat'
  | 'En cours'
  | 'NRP'
  | 'Perdu'
  | 'Inexploitable'
  | 'Rétracté'
  | 'Autre'

export interface Lead {
  id: number
  import_id: number | null
  identifiant_projet: number
  identifiant_contact: number | null
  leadbyte_id: string | null
  statut: string
  categorie: string
  date_creation: string | null
  derniere_modification: string | null
  auteur: string | null
  attribution: string | null
  civilite: string | null
  prenom: string | null
  nom: string | null
  contact_civilite: string | null
  contact_prenom: string | null
  contact_nom: string | null
  telephone: string | null
  code_postal: string | null
  ville: string | null
  email: string | null
  type_contrat: string | null
  origine: string | null
  source: string | null
  url_projet: string | null
  date_naissance: string | null
  regime: string | null
  age: number | null
  tranche_age: string | null
  commentaire: string | null
}

export interface Contrat {
  id: number
  import_id: number | null
  identifiant_projet: number
  identifiant_contact: number | null
  prenom: string | null
  nom: string | null
  date_naissance: string | null
  regime: string | null
  compagnie: string | null
  produit: string | null
  formule: string | null
  date_souscription: string | null
  date_effet: string | null
  statut_projet: string | null
  prime_brute_mensuelle: number | null
  prime_nette_mensuelle: number | null
  prime_brute_annuelle: number | null
  prime_nette_annuelle: number | null
  frais_honoraires: number | null
  commission_1ere_annee: number | null
  commission_annees_suiv: number | null
  fractionnement: string | null
  attribution: string | null
  email: string | null
  type_contrat: string | null
  origine: string | null
  source: string | null
}

export interface ImportRow {
  id: number
  imported_at: string
  filename: string
  nb_projets: number
  nb_contrats: number
  date_min: string | null
  date_max: string | null
}

export interface StatutMapping {
  statut_crm: string
  categorie: string
  onglet_id?: string | null
  couleur?: string | null
}

export interface CommercialStats {
  nom: string
  prenom: string
  total: number
  contrats: number
  enCours: number
  perdu: number
  pipe: number
  txConversion: number
}

export interface CompagnieStats {
  compagnie: string
  count: number
  total: number
  moyenne: number
  part: number
}

export interface DerivedStats {
  total: number
  byCategorie: Record<string, number>
  byStatut: Record<string, number>
  byStatutCategorie: Record<string, string>
  txTransformation: number
  totalContrats: number
  totalEnCours: number
  pmMoyen: number
  totalMensuel: number
}
