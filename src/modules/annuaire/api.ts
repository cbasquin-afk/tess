import { supabase } from '@/shared/supabase'
import type {
  AnnuaireRow,
  AnnuaireStatut,
  FormuleNiveau,
  MutuelleEditableFields,
  NiveauTessoria,
  RecommandationRule,
} from './types'

const MUTUELLE_COLS =
  'slug, seo_title_override, seo_meta_override, prix_entree_marche, prix_entree_age_label, note_courtier, age_min_verifie, age_max_verifie, age_min_adhesion, age_max_adhesion, niveaux_disponibles, tarifs_par_age, source_tarifs, source_tarifs_url, source_tarifs_date, source_tarifs_validee, source_tarifs_note, analyse_courtier, ce_que_tessoria_en_pense, points_forts, points_vigilance, noindex, updated_at'

// ── Liste ────────────────────────────────────────────────────
export async function fetchAnnuaire(): Promise<AnnuaireRow[]> {
  const { data, error } = await supabase.from('v_annuaire').select('*')
  if (error) throw new Error(`v_annuaire: ${error.message}`)
  return (data ?? []) as AnnuaireRow[]
}

// ── Fiche édition ────────────────────────────────────────────
export interface FicheEditResult {
  mutuelle: MutuelleEditableFields | null
  statut: AnnuaireStatut | null
  formules: FormuleNiveau[]
  regles: RecommandationRule[]
}

export async function fetchFicheEdit(slug: string): Promise<FicheEditResult> {
  const [rM, rS, rF, rR] = await Promise.all([
    supabase
      .from('marque_verticale_mutuelle')
      .select(MUTUELLE_COLS)
      .eq('slug', slug)
      .single(),
    supabase.from('annuaire_statut').select('*').eq('slug', slug).maybeSingle(),
    supabase
      .from('annuaire_formule_niveau')
      .select('*')
      .eq('slug', slug)
      .order('ordre_affichage', { ascending: true, nullsFirst: false }),
    supabase
      .from('annuaire_recommandation')
      .select('*')
      .eq('slug', slug)
      .order('score', { ascending: false }),
  ])
  if (rM.error) throw new Error(`marque_verticale_mutuelle: ${rM.error.message}`)
  if (rS.error) throw new Error(`annuaire_statut: ${rS.error.message}`)
  if (rF.error) throw new Error(`annuaire_formule_niveau: ${rF.error.message}`)
  if (rR.error) throw new Error(`annuaire_recommandation: ${rR.error.message}`)

  return {
    mutuelle: (rM.data as MutuelleEditableFields | null) ?? null,
    statut: (rS.data as AnnuaireStatut | null) ?? null,
    formules: (rF.data ?? []) as FormuleNiveau[],
    regles: (rR.data ?? []) as RecommandationRule[],
  }
}

// ── Statut + verticales + note interne ───────────────────────
export async function upsertStatut(
  data: Partial<AnnuaireStatut> & { slug: string },
): Promise<void> {
  const { error } = await supabase
    .from('annuaire_statut')
    .upsert(data, { onConflict: 'slug' })
  if (error) throw new Error(`upsert annuaire_statut: ${error.message}`)
}

// ── Marque verticale mutuelle ────────────────────────────────
export async function updateMutuelle(
  slug: string,
  data: Partial<MutuelleEditableFields>,
): Promise<void> {
  const { error } = await supabase
    .from('marque_verticale_mutuelle')
    .update(data)
    .eq('slug', slug)
  if (error) throw new Error(`update marque_verticale_mutuelle: ${error.message}`)
}

// ── Formules CRUD ────────────────────────────────────────────
export async function upsertFormule(
  data: Omit<FormuleNiveau, 'id'> & { id?: number },
): Promise<void> {
  const { error } = await supabase.from('annuaire_formule_niveau').upsert(data)
  if (error) throw new Error(`upsert formule: ${error.message}`)
}

export async function deleteFormule(id: number): Promise<void> {
  const { error } = await supabase
    .from('annuaire_formule_niveau')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`delete formule: ${error.message}`)
}

export async function setFormuleReference(
  slug: string,
  id: number,
  niveau: NiveauTessoria,
): Promise<void> {
  const { error: e1 } = await supabase
    .from('annuaire_formule_niveau')
    .update({ est_formule_reference: false })
    .eq('slug', slug)
    .eq('niveau_tessoria', niveau)
  if (e1) throw new Error(`unset references: ${e1.message}`)
  const { error: e2 } = await supabase
    .from('annuaire_formule_niveau')
    .update({ est_formule_reference: true })
    .eq('id', id)
  if (e2) throw new Error(`set reference: ${e2.message}`)
}

// ── Règles recommandation CRUD ───────────────────────────────
export async function upsertRegle(
  data: Omit<RecommandationRule, 'id' | 'updated_at'> & { id?: number },
): Promise<void> {
  const { error } = await supabase.from('annuaire_recommandation').upsert(data)
  if (error) throw new Error(`upsert regle: ${error.message}`)
}

export async function deleteRegle(id: number): Promise<void> {
  const { error } = await supabase
    .from('annuaire_recommandation')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`delete regle: ${error.message}`)
}

export async function toggleRegleActif(
  id: number,
  actif: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('annuaire_recommandation')
    .update({ actif })
    .eq('id', id)
  if (error) throw new Error(`toggle regle: ${error.message}`)
}

// ── Alertes ──────────────────────────────────────────────────
export async function fetchAlertes(): Promise<AnnuaireRow[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('v_annuaire')
    .select('*')
    .eq('statut_page', 'publiee')
    .or(`alerte_verif.eq.true,date_derniere_maj.lt.${cutoffStr}`)
  if (error) throw new Error(`alertes: ${error.message}`)
  return (data ?? []) as AnnuaireRow[]
}

export async function marquerVerifie(slug: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('annuaire_statut')
    .upsert(
      { slug, alerte_verif: false, date_derniere_maj: today },
      { onConflict: 'slug' },
    )
  if (error) throw new Error(`marquer verifie: ${error.message}`)
}
