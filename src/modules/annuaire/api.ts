import { supabase } from '@/shared/supabase'
import type {
  ActionStatut,
  AnnuaireRow,
  AnnuaireStatut,
  FormuleNiveau,
  MarqueStatutRow,
  MutuelleEditableFields,
  NiveauTessoria,
  RecommandationRule,
  VerticaleStatut,
} from './types'

const MUTUELLE_COLS =
  'slug, seo_title_override, seo_meta_override, prix_entree_marche, prix_entree_age_label, note_courtier, age_min_verifie, age_max_verifie, age_min_adhesion, age_max_adhesion, niveaux_disponibles, tarifs_par_age, source_tarifs, source_tarifs_url, source_tarifs_date, source_tarifs_validee, source_tarifs_note, analyse_courtier, ce_que_tessoria_en_pense, points_forts, points_vigilance, noindex, updated_at'

// ── Liste ────────────────────────────────────────────────────
export async function fetchAnnuaire(
  verticale?: string,
): Promise<AnnuaireRow[]> {
  let q = supabase.from('v_annuaire').select('*')
  if (verticale) q = q.eq('verticale', verticale)
  const { data, error } = await q
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

export async function fetchFicheEdit(
  slug: string,
  verticale = 'mutuelle',
): Promise<FicheEditResult> {
  const [rM, rS, rF, rR] = await Promise.all([
    supabase
      .from('marque_verticale_mutuelle')
      .select(MUTUELLE_COLS)
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('annuaire_statut')
      .select('*')
      .eq('slug', slug)
      .eq('verticale', verticale)
      .maybeSingle(),
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

// ── Statut (PK composite slug+verticale) ─────────────────────
export async function upsertStatut(
  data: Partial<AnnuaireStatut> & { slug: string; verticale: string },
): Promise<void> {
  const { error } = await supabase
    .from('annuaire_statut')
    .upsert(data, { onConflict: 'slug,verticale' })
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

export async function marquerVerifie(
  slug: string,
  verticale = 'mutuelle',
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('annuaire_statut')
    .upsert(
      { slug, verticale, alerte_verif: false, date_derniere_maj: today },
      { onConflict: 'slug,verticale' },
    )
  if (error) throw new Error(`marquer verifie: ${error.message}`)
}

// ── Statut des marques (vue v_marque_statut + RPCs) ─────────
function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw
  if (raw && typeof raw === 'object') {
    const o = raw as { message?: string; details?: string; hint?: string; code?: string }
    const msg = o.message || o.details || o.hint || fallback
    const err = new Error(o.code ? `[${o.code}] ${msg}` : msg)
    return err
  }
  return new Error(fallback)
}

export async function fetchMarqueStatut(): Promise<MarqueStatutRow[]> {
  const { data, error } = await supabase
    .from('v_marque_statut')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw toError(error, 'Échec de la lecture de v_marque_statut')
  return (data ?? []) as MarqueStatutRow[]
}

export async function setMarqueStatutVerticale(
  slug: string,
  verticale: VerticaleStatut,
  action: ActionStatut,
): Promise<void> {
  const { error } = await supabase.rpc('set_marque_statut_verticale', {
    p_slug: slug,
    p_verticale: verticale,
    p_action: action,
  })
  if (error) throw toError(error, `Échec de l'action "${action}" sur ${slug}/${verticale}`)
}

export async function setMarquePartenariat(
  slug: string,
  estPartenaire: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('set_marque_partenariat', {
    p_slug: slug,
    p_est_partenaire: estPartenaire,
  })
  if (error) throw toError(error, `Échec de la bascule partenariat pour ${slug}`)
}
