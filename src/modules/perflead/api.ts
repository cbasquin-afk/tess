import { supabase } from '@/shared/supabase'
import type { Contrat, ImportRow, Lead, StatutMapping } from './types'

const PAGE_SIZE = 1000

async function fetchAllPaged<T>(
  table: string,
  orderCol?: string,
): Promise<T[]> {
  let all: T[] = []
  let from = 0
  // Boucle de pagination — on s'arrête quand un batch est plus petit que PAGE_SIZE.
  while (true) {
    let q = supabase.from(table).select('*').range(from, from + PAGE_SIZE - 1)
    if (orderCol) q = q.order(orderCol, { ascending: false })
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    all = all.concat(data as T[])
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

export async function fetchLeads(): Promise<Lead[]> {
  return fetchAllPaged<Lead>('perflead_leads', 'date_creation')
}

export async function fetchContrats(): Promise<Contrat[]> {
  return fetchAllPaged<Contrat>('perflead_contrats', 'date_souscription')
}

export async function fetchImports(limit = 20): Promise<ImportRow[]> {
  const { data, error } = await supabase
    .from('perflead_imports')
    .select('id, filename, imported_at, nb_projets, nb_contrats, date_min, date_max')
    .order('imported_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`perflead_imports: ${error.message}`)
  return (data ?? []) as ImportRow[]
}

export async function fetchStatutMapping(): Promise<StatutMapping[]> {
  const { data, error } = await supabase
    .from('perflead_statut_mapping')
    .select('statut_crm, categorie, onglet_id, couleur')
    .limit(200)
  if (error) throw new Error(`perflead_statut_mapping: ${error.message}`)
  return (data ?? []) as StatutMapping[]
}

export async function countTable(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(`count ${table}: ${error.message}`)
  return count ?? 0
}

export interface InsertImportRow {
  filename: string
  nb_projets: number
  nb_contrats: number
  date_min: string | null
  date_max: string | null
}

export async function insertImport(row: InsertImportRow): Promise<ImportRow> {
  const { data, error } = await supabase
    .from('perflead_imports')
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`insert perflead_imports: ${error.message}`)
  return data as ImportRow
}

const UPSERT_CHUNK = 200

export async function upsertLeads(
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const { error } = await supabase
      .from('perflead_leads')
      .upsert(rows.slice(i, i + UPSERT_CHUNK), {
        onConflict: 'identifiant_projet',
      })
    if (error) throw new Error(`upsert perflead_leads: ${error.message}`)
  }
}

export async function upsertContrats(
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const { error } = await supabase
      .from('perflead_contrats')
      .upsert(rows.slice(i, i + UPSERT_CHUNK), {
        onConflict: 'identifiant_projet',
      })
    if (error) throw new Error(`upsert perflead_contrats: ${error.message}`)
  }
}

// ── Fetch avec filtre de période, paginé ──────────────────────
// Important : Supabase cap par défaut à 1000 lignes par requête. Avec dates
// vides (= "tout"), il faut paginer pour éviter de plafonner silencieusement.

interface PeriodFilter {
  col: string
  from?: string
  to?: string
}

async function fetchAllPagedFiltered<T>(
  table: string,
  orderCol: string,
  filter?: PeriodFilter,
): Promise<T[]> {
  let all: T[] = []
  let from = 0
  while (true) {
    let q = supabase
      .from(table)
      .select('*')
      .order(orderCol, { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (filter?.from) q = q.gte(filter.col, filter.from)
    if (filter?.to) q = q.lte(filter.col, filter.to)
    const { data, error } = await q
    if (error) throw new Error(`${table} (period): ${error.message}`)
    if (!data || data.length === 0) break
    all = all.concat(data as T[])
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

export async function fetchLeadsByPeriod(
  from?: string,
  to?: string,
): Promise<Lead[]> {
  return fetchAllPagedFiltered<Lead>('perflead_leads', 'date_creation', {
    col: 'date_creation',
    from,
    to,
  })
}

export async function fetchContratsByPeriod(
  from?: string,
  to?: string,
): Promise<Contrat[]> {
  return fetchAllPagedFiltered<Contrat>(
    'perflead_contrats',
    'date_souscription',
    { col: 'date_souscription', from, to },
  )
}
