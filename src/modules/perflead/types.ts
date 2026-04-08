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

export interface WeeklyStats {
  weekKey: string // YYYY-MM-DD du lundi ISO
  weekLabel: string // "Sem 12 (17/03)"
  dateDebut: Date
  leads: number
  contrats: number
  enCours: number
  nrp: number
  perdu: number
  inexploitable: number
  txTransformation: number
  txConversion: number
  pmMoyen: number
}

export interface AgeStats {
  tranche: string
  leads: number
  contrats: number
  enCours: number
  txTransformation: number
  txConversion: number
  pmMoyen: number
  pctLeads: number
}

export interface GammeStats {
  produit: string
  // Liste des compagnies qui vendent ce produit (déduplication car un même
  // produit peut être distribué par plusieurs compagnies)
  compagnies: string[]
  contrats: number
  pmMoyen: number
  caMensuel: number
  pctContrats: number
}

export interface GammeFormuleStats {
  produit: string
  formule: string
  compagnie: string | null
  contrats: number
  pctContrats: number
  pmMoyen: number
}

export type TelType = 'fixe' | 'mobile' | 'inconnu'

export interface TelGroupStats {
  type: TelType
  count: number
  pctTotal: number
  contrats: number
  txTransfo: number
  txDecroches: number
}

export interface DeptStats {
  dept: string
  total: number
  contrats: number
  nrp: number
  txDecroches: number
  txTransfo: number
  pmMoyen: number
  partLeads: number
}

export interface AnalyseResult {
  fixe: TelGroupStats
  mobile: TelGroupStats
  inconnu: TelGroupStats
  totalLeads: number
  depts: DeptStats[]
}

export type AlerteType = 'NRP_relance' | 'en_cours_bloque' | 'lead_froid'

export interface AlerteLead {
  identifiant_projet: number | null
  prenom: string | null
  nom: string | null
  telephone: string | null
  statut: string
  categorie: string
  attribution: string | null
  derniere_modification: string | null
  joursDepuisModif: number
  url_projet: string | null
  typeAlerte: AlerteType
}

export type RegimeGroupe = 'SECU' | 'MSA' | 'TNS' | 'ALSMO' | 'Autre'

export interface PersonaGroup {
  key: string
  groupe: RegimeGroupe
  trancheAge: string
  totalLeads: number
  totalContrats: number
  txConversion: number
  pmMoyen: number
  topProduit: string | null
  topFormule: string | null
  topCompagnie: string | null
}

export interface PersonaDeptStats {
  key: string
  dept: string
  trancheAge: string
  totalLeads: number
  totalContrats: number
  txConversion: number
  pmMoyen: number
  topProduit: string | null
}
