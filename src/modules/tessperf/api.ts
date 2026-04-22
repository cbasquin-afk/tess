import { supabase } from '@/shared/supabase'
import type {
  Commercial,
  ContratsDaily,
  LeadsDaily,
  MonthlyEquipe,
  MonthlyKpis,
  PerfParametres,
  WeeklyKpis,
} from './types'

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
