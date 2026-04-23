import { supabase } from '@/shared/supabase'
import type {
  Commercial,
  ContratDetail,
  ContratsDaily,
  LeadsDaily,
  MonthlyEquipe,
  MonthlyKpis,
  PerfParametres,
  WeeklyEquipe,
  WeeklyKpis,
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
