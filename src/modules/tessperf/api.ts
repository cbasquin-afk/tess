import { supabase } from '@/shared/supabase'
import type {
  BarometreHebdoCommercial,
  BarometreHebdoEquipe,
  BarometreMensuelCommercial,
  BarometreMensuelEquipe,
  Commercial,
  ContratDetail,
  ContratsDaily,
  DailyKpisCommercial,
  DailyKpisEquipe,
  DailyParOrigineCommercial,
  DailyParOrigineEquipe,
  LeadsDaily,
  MonthlyEquipe,
  MonthlyKpis,
  MonthlyParOrigine,
  MonthlyParOrigineCommercial,
  PerfParametres,
  WeeklyEquipe,
  WeeklyKpis,
  WeeklyParOrigine,
  WeeklyParOrigineCommercial,
} from './types'

function last2(n: number): string {
  return String(n).padStart(2, '0')
}

function monthBounds(annee: number, mois: number): { debut: string; fin: string } {
  const debut = `${annee}-${last2(mois)}-01`
  const finDate = new Date(annee, mois, 0)
  const fin = `${annee}-${last2(mois)}-${last2(finDate.getDate())}`
  return { debut, fin }
}

export async function fetchMonthlyEquipe(
  annee: number,
  mois: number,
): Promise<MonthlyEquipe | null> {
  const { data, error } = await supabase
    .from('tessperf_v_monthly_equipe')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .maybeSingle()
  if (error) throw new Error(`tessperf_v_monthly_equipe: ${error.message}`)
  return (data as MonthlyEquipe | null) ?? null
}

export async function fetchMonthlyKpisByCommercial(
  commercial_id: string,
  annee: number,
  mois: number,
): Promise<MonthlyKpis | null> {
  const { data, error } = await supabase
    .from('tessperf_v_monthly_kpis')
    .select('*')
    .eq('commercial_id', commercial_id)
    .eq('annee', annee)
    .eq('mois', mois)
    .maybeSingle()
  if (error) throw new Error(`tessperf_v_monthly_kpis: ${error.message}`)
  return (data as MonthlyKpis | null) ?? null
}

export async function fetchMonthlyKpisAllCommerciaux(
  annee: number,
  mois: number,
): Promise<MonthlyKpis[]> {
  const { data, error } = await supabase
    .from('tessperf_v_monthly_kpis')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .order('ca_acquisition', { ascending: false })
  if (error) throw new Error(`tessperf_v_monthly_kpis (all): ${error.message}`)
  return (data ?? []) as MonthlyKpis[]
}

export async function fetchWeeklyKpisByCommercial(
  commercial_id: string,
  debut: string,
  fin: string,
): Promise<WeeklyKpis[]> {
  const { data, error } = await supabase
    .from('tessperf_v_weekly_kpis')
    .select('*')
    .eq('commercial_id', commercial_id)
    .gte('semaine_debut', debut)
    .lte('semaine_debut', fin)
    .order('semaine_debut', { ascending: true })
  if (error) throw new Error(`tessperf_v_weekly_kpis: ${error.message}`)
  return (data ?? []) as WeeklyKpis[]
}

export async function fetchWeeklyKpisEquipe(
  debut: string,
  fin: string,
): Promise<WeeklyKpis[]> {
  const { data, error } = await supabase
    .from('tessperf_v_weekly_kpis')
    .select('*')
    .gte('semaine_debut', debut)
    .lte('semaine_debut', fin)
    .order('semaine_debut', { ascending: true })
  if (error) throw new Error(`tessperf_v_weekly_kpis (equipe): ${error.message}`)
  return (data ?? []) as WeeklyKpis[]
}

export async function fetchContratsDaily(
  commercial_id: string | null,
  jour_debut: string,
  jour_fin: string,
): Promise<ContratsDaily[]> {
  let q = supabase
    .from('tessperf_v_contrats_daily')
    .select('*')
    .gte('jour', jour_debut)
    .lte('jour', jour_fin)
    .order('jour', { ascending: true })
  if (commercial_id) q = q.eq('commercial_id', commercial_id)
  const { data, error } = await q
  if (error) throw new Error(`tessperf_v_contrats_daily: ${error.message}`)
  return (data ?? []) as ContratsDaily[]
}

export async function fetchLeadsDaily(
  commercial_id: string | null,
  jour_debut: string,
  jour_fin: string,
): Promise<LeadsDaily[]> {
  let q = supabase
    .from('tessperf_v_leads_daily')
    .select('*')
    .gte('jour', jour_debut)
    .lte('jour', jour_fin)
    .order('jour', { ascending: true })
  if (commercial_id) q = q.eq('commercial_id', commercial_id)
  const { data, error } = await q
  if (error) throw new Error(`tessperf_v_leads_daily: ${error.message}`)
  return (data ?? []) as LeadsDaily[]
}

export async function fetchParametres(): Promise<PerfParametres | null> {
  const { data, error } = await supabase
    .from('perf_parametres')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`perf_parametres: ${error.message}`)
  return (data as PerfParametres | null) ?? null
}

export async function fetchCommerciauxProductifs(): Promise<Commercial[]> {
  const { data, error } = await supabase
    .from('perf_v_commerciaux')
    .select('*')
    .eq('statut', 'actif_productif')
    .order('prenom', { ascending: true })
  if (error) throw new Error(`perf_v_commerciaux (productifs): ${error.message}`)
  return (data ?? []) as Commercial[]
}

export async function fetchAllCommerciaux(): Promise<Commercial[]> {
  const { data, error } = await supabase
    .from('perf_v_commerciaux')
    .select('*')
    .order('prenom', { ascending: true })
  if (error) throw new Error(`perf_v_commerciaux: ${error.message}`)
  return (data ?? []) as Commercial[]
}

export async function fetchCurrentUserCommercial(
  email: string,
): Promise<Commercial | null> {
  const { data, error } = await supabase
    .from('perf_v_commerciaux')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (error) throw new Error(`perf_v_commerciaux (current): ${error.message}`)
  return (data as Commercial | null) ?? null
}

// ── Nouvelles vues v2 ─────────────────────────────────────────
export async function fetchWeeklyEquipe(
  annee: number,
  mois: number,
): Promise<WeeklyEquipe[]> {
  const { data, error } = await supabase
    .from('tessperf_v_weekly_equipe')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .order('semaine_debut', { ascending: true })
  if (error) throw new Error(`tessperf_v_weekly_equipe: ${error.message}`)
  return (data ?? []) as WeeklyEquipe[]
}

/**
 * KPIs équipe filtrés par origine (une ligne par mois × origine).
 * Retourne null si origine = 'toutes' → l'appelant doit lire
 * tessperf_v_monthly_equipe à la place.
 */
export async function fetchMonthlyParOrigine(
  annee: number,
  mois: number,
  origine: string,
): Promise<MonthlyParOrigine | null> {
  if (origine === 'toutes') return null
  const { data, error } = await supabase
    .from('tessperf_v_monthly_par_origine')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .eq('origine', origine)
    .maybeSingle()
  if (error) throw new Error(`tessperf_v_monthly_par_origine: ${error.message}`)
  return (data as MonthlyParOrigine | null) ?? null
}

/**
 * KPIs commercial filtrés par origine (une ligne par mois × commercial × origine).
 * Retourne null si origine = 'toutes' → l'appelant doit lire
 * tessperf_v_monthly_kpis à la place.
 */
export async function fetchMonthlyParOrigineCommercial(
  commercial_id: string,
  annee: number,
  mois: number,
  origine: string,
): Promise<MonthlyParOrigineCommercial | null> {
  if (origine === 'toutes') return null
  const { data, error } = await supabase
    .from('tessperf_v_monthly_par_origine_commercial')
    .select('*')
    .eq('commercial_id', commercial_id)
    .eq('annee', annee)
    .eq('mois', mois)
    .eq('origine', origine)
    .maybeSingle()
  if (error) {
    throw new Error(`tessperf_v_monthly_par_origine_commercial: ${error.message}`)
  }
  return (data as MonthlyParOrigineCommercial | null) ?? null
}

export async function fetchContratsDetail(
  commercial_id: string,
  annee: number,
  mois: number,
): Promise<ContratDetail[]> {
  const { debut, fin } = monthBounds(annee, mois)
  const { data, error } = await supabase
    .from('tessperf_v_contrats_detail')
    .select('*')
    .eq('commercial_id', commercial_id)
    .gte('date_signature', debut)
    .lte('date_signature', fin)
    .order('date_signature', { ascending: false })
  if (error) throw new Error(`tessperf_v_contrats_detail: ${error.message}`)
  return (data ?? []) as ContratDetail[]
}

// ── Baromètre ────────────────────────────────────────────────
export async function fetchBarometreMensuelEquipe(
  annee: number,
  mois: number,
): Promise<BarometreMensuelEquipe | null> {
  const { data, error } = await supabase
    .from('tessperf_v_barometre_mensuel_equipe')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .maybeSingle()
  if (error) throw new Error(`tessperf_v_barometre_mensuel_equipe: ${error.message}`)
  return (data as BarometreMensuelEquipe | null) ?? null
}

export async function fetchBarometreMensuelCommercial(
  commercial_id: string,
  annee: number,
  mois: number,
): Promise<BarometreMensuelCommercial | null> {
  const { data, error } = await supabase
    .from('tessperf_v_barometre_mensuel_commercial')
    .select('*')
    .eq('commercial_id', commercial_id)
    .eq('annee', annee)
    .eq('mois', mois)
    .maybeSingle()
  if (error)
    throw new Error(`tessperf_v_barometre_mensuel_commercial: ${error.message}`)
  return (data as BarometreMensuelCommercial | null) ?? null
}

// La vue hebdo équipe retourne automatiquement la bonne semaine selon la
// logique f_barometre_semaine_courante (mardi→vendredi = semaine en cours,
// samedi→lundi = semaine précédente figée). Pas de paramètre à passer.
export async function fetchBarometreHebdoEquipe(): Promise<BarometreHebdoEquipe | null> {
  const { data, error } = await supabase
    .from('tessperf_v_barometre_hebdo_equipe')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`tessperf_v_barometre_hebdo_equipe: ${error.message}`)
  return (data as BarometreHebdoEquipe | null) ?? null
}

export async function fetchBarometreHebdoCommercial(
  commercial_id: string,
): Promise<BarometreHebdoCommercial | null> {
  const { data, error } = await supabase
    .from('tessperf_v_barometre_hebdo_commercial')
    .select('*')
    .eq('commercial_id', commercial_id)
    .maybeSingle()
  if (error)
    throw new Error(`tessperf_v_barometre_hebdo_commercial: ${error.message}`)
  return (data as BarometreHebdoCommercial | null) ?? null
}

// ── Drill-down journalier ────────────────────────────────────
export async function fetchDailyKpisEquipe(
  semaine_debut: string,
  semaine_fin: string,
): Promise<DailyKpisEquipe[]> {
  const { data, error } = await supabase
    .from('tessperf_v_daily_kpis_equipe')
    .select('*')
    .gte('jour', semaine_debut)
    .lte('jour', semaine_fin)
    .order('jour', { ascending: true })
  if (error) throw new Error(`tessperf_v_daily_kpis_equipe: ${error.message}`)
  return (data ?? []) as DailyKpisEquipe[]
}

export async function fetchDailyKpisCommercial(
  commercial_id: string,
  semaine_debut: string,
  semaine_fin: string,
): Promise<DailyKpisCommercial[]> {
  const { data, error } = await supabase
    .from('tessperf_v_daily_kpis_commercial')
    .select('*')
    .eq('commercial_id', commercial_id)
    .gte('jour', semaine_debut)
    .lte('jour', semaine_fin)
    .order('jour', { ascending: true })
  if (error)
    throw new Error(`tessperf_v_daily_kpis_commercial: ${error.message}`)
  return (data ?? []) as DailyKpisCommercial[]
}

// ── Hebdo × origine ──────────────────────────────────────────
// Retournent null si origine='toutes' → l'appelant doit utiliser
// la vue non filtrée correspondante.
export async function fetchWeeklyParOrigine(
  annee: number,
  mois: number,
  origine: string,
): Promise<WeeklyParOrigine[] | null> {
  if (origine === 'toutes') return null
  const { debut, fin } = monthBounds(annee, mois)
  const { data, error } = await supabase
    .from('tessperf_v_weekly_par_origine')
    .select('*')
    .eq('origine', origine)
    .gte('semaine_debut', debut)
    .lte('semaine_debut', fin)
    .order('semaine_debut', { ascending: true })
  if (error) throw new Error(`tessperf_v_weekly_par_origine: ${error.message}`)
  return (data ?? []) as WeeklyParOrigine[]
}

export async function fetchWeeklyParOrigineCommercial(
  commercial_id: string,
  annee: number,
  mois: number,
  origine: string,
): Promise<WeeklyParOrigineCommercial[] | null> {
  if (origine === 'toutes') return null
  const { debut, fin } = monthBounds(annee, mois)
  const { data, error } = await supabase
    .from('tessperf_v_weekly_par_origine_commercial')
    .select('*')
    .eq('commercial_id', commercial_id)
    .eq('origine', origine)
    .gte('semaine_debut', debut)
    .lte('semaine_debut', fin)
    .order('semaine_debut', { ascending: true })
  if (error)
    throw new Error(`tessperf_v_weekly_par_origine_commercial: ${error.message}`)
  return (data ?? []) as WeeklyParOrigineCommercial[]
}

export async function fetchDailyParOrigineEquipe(
  semaine_debut: string,
  semaine_fin: string,
  origine: string,
): Promise<DailyParOrigineEquipe[] | null> {
  if (origine === 'toutes') return null
  const { data, error } = await supabase
    .from('tessperf_v_daily_par_origine_equipe')
    .select('*')
    .eq('origine', origine)
    .gte('jour', semaine_debut)
    .lte('jour', semaine_fin)
    .order('jour', { ascending: true })
  if (error)
    throw new Error(`tessperf_v_daily_par_origine_equipe: ${error.message}`)
  return (data ?? []) as DailyParOrigineEquipe[]
}

export async function fetchDailyParOrigineCommercial(
  commercial_id: string,
  semaine_debut: string,
  semaine_fin: string,
  origine: string,
): Promise<DailyParOrigineCommercial[] | null> {
  if (origine === 'toutes') return null
  const { data, error } = await supabase
    .from('tessperf_v_daily_par_origine_commercial')
    .select('*')
    .eq('commercial_id', commercial_id)
    .eq('origine', origine)
    .gte('jour', semaine_debut)
    .lte('jour', semaine_fin)
    .order('jour', { ascending: true })
  if (error)
    throw new Error(`tessperf_v_daily_par_origine_commercial: ${error.message}`)
  return (data ?? []) as DailyParOrigineCommercial[]
}
