import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { fetchLeadsByPeriod, fetchStatutMapping } from '../api'
import { usePerfLeadFilters } from '../context/FiltersContext'
import { PIOCHE_VALUE } from '../components/FilterBar'
import type { Lead, StatutMapping } from '../types'

// ── Constantes locales ─────────────────────────────────────
const COMMERCIAUX = [
  'Christopher BASQUIN',
  'Charlotte BOCOGNANO',
  'Cheyenne DEBENATH',
] as const

const ORIGINES = [
  'Back-office',
  'MapApp Digital',
  'Multi Equipement',
  'Recommandation',
  'Site web',
] as const

const VERTICALES: { value: string; label: string }[] = [
  { value: 'Complémentaire santé', label: 'Mutuelle / Santé' },
  { value: 'Garantie obsèques', label: 'Obsèques' },
  { value: 'Prévoyance pro', label: 'Prévoyance' },
  { value: 'Protection juridique', label: 'Protection juridique' },
  { value: 'Assurance auto', label: 'Assurance auto' },
]

// NRP est volontairement absent : cf. règle "pioche partagée".
const CATEGORIES_NO_NRP = [
  'Contrat',
  'En cours',
  'Perdu',
  'Inexploitable',
  'Rétracté',
  'Autre',
] as const

const ENSEMBLE = '__ensemble__'

// ── Types ───────────────────────────────────────────────────
interface PanelFilters {
  dateFrom: string
  dateTo: string
  commercial: string // '' ou ENSEMBLE => tous, sinon Prénom NOM ou PIOCHE_VALUE
  categorie: string
  origine: string
  typeContrat: string
}

interface StatLeaf {
  statut: string
  count: number
}

interface StatCategorie {
  categorie: string
  couleur: string
  count: number
  leaves: StatLeaf[]
}

// ── Utils ───────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function fmtDateShort(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return `rgba(136,135,128,${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function firstDayOfCurrentMonth(): string {
  const n = new Date()
  const d = new Date(n.getFullYear(), n.getMonth(), 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lastDayOfCurrentMonth(): string {
  const n = new Date()
  const d = new Date(n.getFullYear(), n.getMonth() + 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function firstDayOfPrevMonth(): string {
  const n = new Date()
  const d = new Date(n.getFullYear(), n.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lastDayOfPrevMonth(): string {
  const n = new Date()
  const d = new Date(n.getFullYear(), n.getMonth(), 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function matchCommercial(l: Lead, commercial: string): boolean {
  if (!commercial || commercial === ENSEMBLE) return true
  if (commercial === PIOCHE_VALUE) {
    return !l.attribution || l.attribution === '< Pioche >'
  }
  return l.attribution === commercial
}

function applyFilters(leads: Lead[], f: PanelFilters, excludeNrp = true): Lead[] {
  return leads.filter((l) => {
    if (excludeNrp && l.categorie === 'NRP') return false
    if (!matchCommercial(l, f.commercial)) return false
    if (f.categorie && l.categorie !== f.categorie) return false
    if (f.origine && l.origine !== f.origine) return false
    if (f.typeContrat && l.type_contrat !== f.typeContrat) return false
    return true
  })
}

function countNrpExcluded(leads: Lead[], f: PanelFilters): number {
  let n = 0
  for (const l of leads) {
    if (l.categorie !== 'NRP') continue
    if (!matchCommercial(l, f.commercial)) continue
    if (f.origine && l.origine !== f.origine) continue
    if (f.typeContrat && l.type_contrat !== f.typeContrat) continue
    n++
  }
  return n
}

function buildStats(
  leads: Lead[],
  mapping: StatutMapping[],
): { cats: StatCategorie[]; total: number } {
  const byCat = new Map<string, Map<string, number>>()
  for (const l of leads) {
    const cat = l.categorie || 'Autre'
    const st = l.statut || 'Inconnu'
    let inner = byCat.get(cat)
    if (!inner) {
      inner = new Map()
      byCat.set(cat, inner)
    }
    inner.set(st, (inner.get(st) ?? 0) + 1)
  }

  const colorByCat = new Map<string, string>()
  for (const m of mapping) {
    if (!m.categorie) continue
    if (!colorByCat.has(m.categorie) && m.couleur) {
      colorByCat.set(m.categorie, m.couleur)
    }
  }

  const cats: StatCategorie[] = []
  let total = 0
  for (const [cat, leaves] of byCat) {
    let catCount = 0
    const leavesArr: StatLeaf[] = []
    for (const [st, c] of leaves) {
      catCount += c
      leavesArr.push({ statut: st, count: c })
    }
    leavesArr.sort((a, b) => b.count - a.count)
    cats.push({
      categorie: cat,
      couleur: colorByCat.get(cat) ?? '#888780',
      count: catCount,
      leaves: leavesArr,
    })
    total += catCount
  }
  cats.sort((a, b) => b.count - a.count)
  return { cats, total }
}

// ── Hooks ───────────────────────────────────────────────────
function useStatutMapping() {
  const [mapping, setMapping] = useState<StatutMapping[]>([])
  useEffect(() => {
    let cancelled = false
    fetchStatutMapping()
      .then((d) => { if (!cancelled) setMapping(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])
  return mapping
}

function useLeadsPeriod(dateFrom: string, dateTo: string) {
  const [raw, setRaw] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchLeadsByPeriod(dateFrom || undefined, dateTo || undefined)
      .then((d) => { if (!cancelled) setRaw(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dateFrom, dateTo])
  return { raw, loading, error }
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  )
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 1024)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

// ── Component principal ─────────────────────────────────────
function Statuts() {
  const mapping = useStatutMapping()
  const [compareMode, setCompareMode] = useState(false)
  const narrow = useIsNarrow()
  const effectiveCompare = compareMode && !narrow

  // Filters locaux par colonne pour le mode comparaison
  const [filtersA, setFiltersA] = useState<PanelFilters>(() => ({
    dateFrom: firstDayOfCurrentMonth(),
    dateTo: lastDayOfCurrentMonth(),
    commercial: '',
    categorie: '',
    origine: '',
    typeContrat: '',
  }))
  const [filtersB, setFiltersB] = useState<PanelFilters>(() => ({
    dateFrom: firstDayOfPrevMonth(),
    dateTo: lastDayOfPrevMonth(),
    commercial: '',
    categorie: '',
    origine: '',
    typeContrat: '',
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Statuts détaillés</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
          Regroupement par catégorie avec drill-down des statuts CRM. NRP exclus
          (pioche partagée non attribuable).
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => setCompareMode(e.target.checked)}
          />
          <span style={{ fontWeight: 600, color: '#0f172a' }}>Mode comparaison</span>
        </label>
        {compareMode && narrow && (
          <span style={{ marginLeft: 12, fontSize: 12, color: '#b45309' }}>
            ⚠ Mode comparaison désactivé sur petit écran (&lt; 1024 px).
          </span>
        )}
        {!compareMode && (
          <span style={{ marginLeft: 12, fontSize: 11, color: '#94a3b8' }}>
            Utilise la barre de filtres globale en haut de page.
          </span>
        )}
      </div>

      {effectiveCompare ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <LocalPanel
            title="Colonne A"
            filters={filtersA}
            setFilters={setFiltersA}
            mapping={mapping}
          />
          <LocalPanel
            title="Colonne B"
            filters={filtersB}
            setFilters={setFiltersB}
            mapping={mapping}
          />
        </div>
      ) : (
        <GlobalPanel mapping={mapping} />
      )}
    </div>
  )
}

// ── Panel piloté par le FiltersContext global ──────────────
function GlobalPanel({ mapping }: { mapping: StatutMapping[] }) {
  const { filters } = usePerfLeadFilters()
  const panelFilters: PanelFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    commercial: filters.commercial,
    categorie: filters.categorie,
    origine: filters.origine,
    typeContrat: filters.typeContrat,
  }
  const { raw, loading, error } = useLeadsPeriod(filters.dateFrom, filters.dateTo)
  return (
    <PanelBody
      filters={panelFilters}
      raw={raw}
      loading={loading}
      error={error}
      mapping={mapping}
    />
  )
}

// ── Panel de comparaison avec toolbar locale ───────────────
function LocalPanel({
  title,
  filters,
  setFilters,
  mapping,
}: {
  title: string
  filters: PanelFilters
  setFilters: (f: PanelFilters) => void
  mapping: StatutMapping[]
}) {
  const { raw, loading, error } = useLeadsPeriod(filters.dateFrom, filters.dateTo)
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1f3a8a' }}>{title}</div>
      <LocalToolbar filters={filters} setFilters={setFilters} />
      <ScopeChip filters={filters} />
      <PanelBody
        filters={filters}
        raw={raw}
        loading={loading}
        error={error}
        mapping={mapping}
        compact
      />
    </div>
  )
}

function LocalToolbar({
  filters,
  setFilters,
}: {
  filters: PanelFilters
  setFilters: (f: PanelFilters) => void
}) {
  const patch = (p: Partial<PanelFilters>) => setFilters({ ...filters, ...p })
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e: ChangeEvent<HTMLInputElement>) => patch({ dateFrom: e.target.value })}
        style={tinyInput}
      />
      <span style={{ color: '#9ca3af', fontSize: 11 }}>→</span>
      <input
        type="date"
        value={filters.dateTo}
        onChange={(e: ChangeEvent<HTMLInputElement>) => patch({ dateTo: e.target.value })}
        style={tinyInput}
      />
      <select
        value={filters.commercial}
        onChange={(e) => patch({ commercial: e.target.value })}
        style={tinyInput}
        aria-label="Commercial"
      >
        <option value={ENSEMBLE}>Ensemble des commerciaux</option>
        <option value="">— Aucun filtre —</option>
        {COMMERCIAUX.map((c) => (
          <option key={c} value={c}>
            {c.split(' ')[0]}
          </option>
        ))}
      </select>
      <select
        value={filters.categorie}
        onChange={(e) => patch({ categorie: e.target.value })}
        style={tinyInput}
        aria-label="Catégorie"
      >
        <option value="">Toutes catégories (NRP exclus)</option>
        {CATEGORIES_NO_NRP.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={filters.origine}
        onChange={(e) => patch({ origine: e.target.value })}
        style={tinyInput}
        aria-label="Origine"
      >
        <option value="">Toutes origines</option>
        {ORIGINES.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <select
        value={filters.typeContrat}
        onChange={(e) => patch({ typeContrat: e.target.value })}
        style={tinyInput}
        aria-label="Verticale"
      >
        <option value="">Toutes verticales</option>
        {VERTICALES.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ScopeChip({ filters }: { filters: PanelFilters }) {
  const commercialLabel =
    !filters.commercial || filters.commercial === ENSEMBLE
      ? 'Ensemble'
      : filters.commercial === PIOCHE_VALUE
        ? '< Pioche >'
        : filters.commercial.split(' ')[0]
  const period =
    filters.dateFrom && filters.dateTo
      ? `${fmtDateShort(filters.dateFrom)} → ${fmtDateShort(filters.dateTo)}`
      : 'Tout'
  const origineLabel = filters.origine || 'Toutes origines'
  const verticaleLabel =
    VERTICALES.find((v) => v.value === filters.typeContrat)?.label || 'Toutes verticales'
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: '#f1f5f9',
        borderRadius: 12,
        fontSize: 11,
        color: '#475569',
        fontWeight: 500,
        width: 'fit-content',
      }}
    >
      <strong>{commercialLabel}</strong>
      <span style={{ color: '#94a3b8' }}>·</span>
      <span>{period}</span>
      <span style={{ color: '#94a3b8' }}>·</span>
      <span>{origineLabel}</span>
      <span style={{ color: '#94a3b8' }}>·</span>
      <span>{verticaleLabel}</span>
    </div>
  )
}

// ── Corps du panel : tableau hiérarchique ──────────────────
function PanelBody({
  filters,
  raw,
  loading,
  error,
  mapping,
  compact,
}: {
  filters: PanelFilters
  raw: Lead[]
  loading: boolean
  error: string | null
  mapping: StatutMapping[]
  compact?: boolean
}) {
  // Si l'utilisateur force NRP via le filtre global, on le normalise (NRP
  // est TOUJOURS exclu côté Statuts).
  const safeFilters: PanelFilters = {
    ...filters,
    categorie: filters.categorie === 'NRP' ? '' : filters.categorie,
  }

  const filtered = useMemo(() => applyFilters(raw, safeFilters), [raw, safeFilters])
  const nrpExcluded = useMemo(() => countNrpExcluded(raw, safeFilters), [raw, safeFilters])
  const { cats, total } = useMemo(() => buildStats(filtered, mapping), [filtered, mapping])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (cat: string) =>
    setExpanded((e) => ({ ...e, [cat]: !e[cat] }))

  if (loading) return <div style={{ color: '#64748b', padding: 12, fontSize: 13 }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626', padding: 12, fontSize: 13 }}>Erreur : {error}</div>

  if (filters.categorie === 'NRP') {
    return (
      <div
        style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: 8,
          padding: 12,
          fontSize: 12,
          color: '#92400e',
        }}
      >
        La catégorie NRP est toujours exclue ici (pioche partagée). Filtre ignoré.
      </div>
    )
  }

  return (
    <div
      style={{
        background: compact ? 'transparent' : '#fff',
        border: compact ? 'none' : '1px solid #e2e8f0',
        borderRadius: 10,
        padding: compact ? 0 : 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        <span>
          {fmt(cats.length)} catégorie{cats.length > 1 ? 's' : ''} · {fmt(total)} leads
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
            <th style={{ ...th, width: 20 }}></th>
            <th style={th}>Catégorie / statut CRM</th>
            <th style={{ ...th, textAlign: 'right', width: 80 }}>Leads</th>
            <th style={{ ...th, textAlign: 'right', width: 90 }}>% catégorie</th>
            <th style={{ ...th, textAlign: 'right', width: 80 }}>% total</th>
          </tr>
        </thead>
        <tbody>
          {cats.length === 0 ? (
            <tr>
              <td colSpan={5} style={emptyCell}>
                Aucun statut (NRP exclus, voir ci-dessous).
              </td>
            </tr>
          ) : (
            cats.flatMap((c) => {
              const isOpen = !!expanded[c.categorie]
              const pctTotal = total > 0 ? (c.count / total) * 100 : 0
              const catRow = (
                <tr
                  key={`cat-${c.categorie}`}
                  onClick={() => toggle(c.categorie)}
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: '#fafbfc',
                  }}
                >
                  <td style={{ ...td, textAlign: 'center', color: '#64748b', fontSize: 10 }}>
                    {isOpen ? '▾' : '▸'}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '2px 10px',
                        borderRadius: 12,
                        background: hexToRgba(c.couleur, 0.12),
                        color: c.couleur,
                      }}
                    >
                      {c.categorie}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: c.couleur, fontWeight: 700 }}>
                    {fmt(c.count)}
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#cbd5e1', fontSize: 11 }}>—</td>
                  <td style={{ ...td, textAlign: 'right', color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                    {pctTotal.toFixed(1)}%
                  </td>
                </tr>
              )
              if (!isOpen) return [catRow]
              const leafRows = c.leaves.map((l) => {
                const pctCat = c.count > 0 ? (l.count / c.count) * 100 : 0
                const pctTot = total > 0 ? (l.count / total) * 100 : 0
                return (
                  <tr key={`leaf-${c.categorie}-${l.statut}`} style={{ borderTop: '1px solid #f8fafc' }}>
                    <td style={td}></td>
                    <td style={{ ...td, color: '#475569', paddingLeft: 26 }}>{l.statut}</td>
                    <td style={{ ...td, textAlign: 'right', color: c.couleur, fontWeight: 500 }}>
                      {fmt(l.count)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#64748b', fontSize: 11 }}>
                      {pctCat.toFixed(1)}%
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#94a3b8', fontSize: 11 }}>
                      {pctTot.toFixed(1)}%
                    </td>
                  </tr>
                )
              })
              return [catRow, ...leafRows]
            })
          )}
          {cats.length > 0 && (
            <tr
              style={{
                background: '#f8fafc',
                borderTop: '2px solid #cbd5e1',
                fontWeight: 700,
              }}
            >
              <td style={td}></td>
              <td style={{ ...td, color: '#0f172a' }}>Total</td>
              <td style={{ ...td, textAlign: 'right', color: '#0f172a' }}>{fmt(total)}</td>
              <td style={{ ...td, textAlign: 'right', color: '#94a3b8' }}>—</td>
              <td style={{ ...td, textAlign: 'right', color: '#94a3b8' }}>100%</td>
            </tr>
          )}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 10,
          padding: '6px 10px',
          background: '#f1f5f9',
          borderRadius: 6,
          fontSize: 11,
          color: '#64748b',
        }}
      >
        ℹ {fmt(nrpExcluded)} lead{nrpExcluded > 1 ? 's' : ''} NRP exclu
        {nrpExcluded > 1 ? 's' : ''} (pioche partagée, non attribuable).
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 8px',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '8px 12px 8px 8px' }
const emptyCell: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: 13,
  fontStyle: 'italic',
}
const tinyInput: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 11,
  outline: 'none',
}

export default Statuts
