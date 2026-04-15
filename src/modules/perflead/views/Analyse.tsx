import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns'
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { fetchContratsByPeriod, fetchLeadsByPeriod } from '../api'
import { useStats } from '../hooks/useStats'
import { useAnalyse } from '../hooks/useAnalyse'
import type {
  AnalyseResult,
  Contrat,
  DeptStats,
  Lead,
  TelGroupStats,
} from '../types'

ChartJS.register(ArcElement, Tooltip, Legend)

type Mode = 'simple' | 'compare'
type DeptSortKey = keyof Pick<
  DeptStats,
  'dept' | 'total' | 'partLeads' | 'txDecroches' | 'txTransfo' | 'pmMoyen'
>
type SortDir = 'asc' | 'desc'

interface Period {
  from: string
  to: string
}

function defaultPeriods(): { a: Period; b: Period } {
  const now = new Date()
  return {
    a: {
      from: format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'),
      to: format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'),
    },
    b: {
      from: format(startOfMonth(subMonths(now, 3)), 'yyyy-MM-dd'),
      to: format(endOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'),
    },
  }
}

// ── Palette pour le camembert ────────────────────────────────
const PIE_COLORS = [
  '#378ADD',
  '#1D9E75',
  '#BA7517',
  '#A32D2D',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f43f5e',
] as const
const PIE_AUTRES_COLOR = '#94a3b8'
const PIE_THRESHOLD_PCT = 1

// ── Hook : fetch d'une période externe ───────────────────────
function usePeriodFetch(period: Period | null) {
  const [data, setData] = useState<{ leads: Lead[]; contrats: Contrat[] }>({
    leads: [],
    contrats: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!period) {
      setData({ leads: [], contrats: [] })
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchLeadsByPeriod(period.from || undefined, period.to || undefined),
      fetchContratsByPeriod(period.from || undefined, period.to || undefined),
    ])
      .then(([leads, contrats]) => {
        if (!cancelled) setData({ leads, contrats })
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period?.from, period?.to])

  return { ...data, loading, error }
}

// ── Helpers couleurs ─────────────────────────────────────────
function txTransfoColor(tx: number): string {
  if (tx >= 15) return '#1D9E75'
  if (tx >= 10) return '#BA7517'
  return '#E24B4A'
}

function txTransfoColorAlt(tx: number): string {
  if (tx >= 12) return '#1D9E75'
  if (tx >= 8) return '#BA7517'
  return '#E24B4A'
}

function txDecrochesColor(tx: number): string {
  if (tx >= 50) return '#1D9E75'
  if (tx >= 30) return '#BA7517'
  return '#E24B4A'
}

function pmColor(pm: number): string {
  if (pm >= 100) return '#1D9E75'
  if (pm > 0) return '#64748b'
  return '#cbd5e1'
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

// ── Composant principal ──────────────────────────────────────
function Analyse() {
  const init = useMemo(() => defaultPeriods(), [])
  const [mode, setMode] = useState<Mode>('simple')
  const [periodA, setPeriodA] = useState<Period>(init.a)
  const [periodB, setPeriodB] = useState<Period>(init.b)
  const [sortKey, setSortKey] = useState<DeptSortKey>('total')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const {
    leads: leadsCurrent,
    contrats: contratsCurrent,
    loading: loadingCurrent,
    error: errorCurrent,
  } = useStats()

  const dataA = usePeriodFetch(mode === 'compare' ? periodA : null)
  const dataB = usePeriodFetch(mode === 'compare' ? periodB : null)

  const analyseSimple = useAnalyse(leadsCurrent, contratsCurrent)
  const analyseA = useAnalyse(dataA.leads, dataA.contrats)
  const analyseB = useAnalyse(dataB.leads, dataB.contrats)

  function toggleSort(key: DeptSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'dept' ? 'asc' : 'desc')
    }
  }

  const loading =
    mode === 'simple' ? loadingCurrent : dataA.loading || dataB.loading
  const error =
    mode === 'simple' ? errorCurrent : (dataA.error ?? dataB.error)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Analyse leads</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Joignabilité par type de numéro et cartographie départementale.
        </p>
      </div>

      {/* Mode simple/compare */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {(['simple', 'compare'] as const).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#1f3a8a' : 'transparent',
                  color: active ? '#fff' : '#64748b',
                }}
              >
                {m === 'simple' ? 'Vue simple' : 'Comparatif A vs B'}
              </button>
            )
          })}
        </div>

        {mode === 'compare' && (
          <>
            <PeriodPicker
              label="A"
              accent="#378ADD"
              value={periodA}
              onChange={setPeriodA}
            />
            <PeriodPicker
              label="B"
              accent="#BA7517"
              value={periodB}
              onChange={setPeriodB}
            />
          </>
        )}

        <div style={{ flex: 1 }} />
        {mode === 'simple' && (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            Données filtrées par la barre globale
          </span>
        )}
      </div>

      {error && (
        <div style={{ color: '#dc2626', fontSize: 13 }}>Erreur : {error}</div>
      )}
      {loading && (
        <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>
      )}

      {/* Section 1 — Fixe vs Mobile */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>Fixe vs Mobile</h2>
        <p style={{ color: '#94a3b8', margin: '0 0 12px', fontSize: 12 }}>
          Joignabilité par type de numéro de téléphone —{' '}
          {mode === 'simple'
            ? `${fmt(analyseSimple.fixe.count + analyseSimple.mobile.count)} / ${fmt(analyseSimple.totalLeads)} leads avec téléphone`
            : 'comparaison A vs B'}
          .
        </p>

        {mode === 'simple' ? (
          <>
            <TelCardsRow analyse={analyseSimple} />
            <Insight analyse={analyseSimple} />
          </>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div>
              <PeriodLabel label="Période A" color="#378ADD" />
              <TelCardsRow analyse={analyseA} compact />
            </div>
            <div>
              <PeriodLabel label="Période B" color="#BA7517" />
              <TelCardsRow analyse={analyseB} compact />
            </div>
          </div>
        )}
      </div>

      {/* Section 2 — Volume & taux par département */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>
          Volume & taux par département
        </h2>
        <p style={{ color: '#94a3b8', margin: '0 0 12px', fontSize: 12 }}>
          {mode === 'simple'
            ? `${analyseSimple.depts.length} départements · cliquer sur une colonne pour trier.`
            : 'Comparaison département par département entre les deux périodes.'}
        </p>

        {mode === 'simple' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
              gap: 16,
            }}
          >
            <DeptTable
              depts={analyseSimple.depts}
              sortKey={sortKey}
              sortDir={sortDir}
              onToggleSort={toggleSort}
            />
            <DeptPie depts={analyseSimple.depts} />
          </div>
        ) : (
          <CompareTable analyseA={analyseA} analyseB={analyseB} />
        )}
      </div>
    </div>
  )
}

// ── Sub-composants ──────────────────────────────────────────

function PeriodLabel({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        background: `${color}15`,
        color,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 12,
        marginBottom: 8,
      }}
    >
      {label}
    </div>
  )
}

interface PeriodPickerProps {
  label: string
  accent: string
  value: Period
  onChange: (v: Period) => void
}
function PeriodPicker({ label, accent, value, onChange }: PeriodPickerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          background: `${accent}15`,
          color: accent,
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 10,
        }}
      >
        {label}
      </span>
      <input
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        style={dateInputStyle}
      />
      <span style={{ color: '#9ca3af', fontSize: 11 }}>→</span>
      <input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        style={dateInputStyle}
      />
    </div>
  )
}

function TelCardsRow({
  analyse,
  compact = false,
}: {
  analyse: AnalyseResult
  compact?: boolean
}) {
  const groups: TelGroupStats[] = [analyse.fixe, analyse.mobile, analyse.inconnu]
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: compact
          ? '1fr 1fr 1fr'
          : 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}
    >
      {groups.map((g) => (
        <TelCard key={g.type} group={g} />
      ))}
    </div>
  )
}

function TelCard({ group }: { group: TelGroupStats }) {
  const labels: Record<typeof group.type, string> = {
    fixe: 'Fixe (01-05)',
    mobile: 'Mobile (06-07)',
    inconnu: 'Inconnu',
  }
  const txCol = group.count > 0 ? txTransfoColorAlt(group.txTransfo) : '#cbd5e1'
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {labels[group.type].toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: '#0f172a',
        }}
      >
        {fmt(group.count)}
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
        {group.pctTotal.toFixed(1)}% du total
      </div>
      {group.count > 0 && (
        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
          <div>
            Décrochés :{' '}
            <strong style={{ color: txDecrochesColor(group.txDecroches) }}>
              {group.txDecroches.toFixed(1)}%
            </strong>
          </div>
          <div>
            Contrats :{' '}
            <strong style={{ color: '#1D9E75' }}>{fmt(group.contrats)}</strong>
          </div>
          <div>
            Tx transfo :{' '}
            <strong style={{ color: txCol }}>
              {group.txTransfo.toFixed(1)}%
            </strong>
          </div>
        </div>
      )}
    </div>
  )
}

function Insight({ analyse }: { analyse: AnalyseResult }) {
  const f = analyse.fixe
  const m = analyse.mobile
  if (f.count === 0 || m.count === 0) return null

  const better = f.txTransfo >= m.txTransfo ? f : m
  const worse = f.txTransfo >= m.txTransfo ? m : f
  const labels: Record<typeof better.type, string> = {
    fixe: 'fixes',
    mobile: 'mobiles',
    inconnu: 'inconnus',
  }
  const diff = Math.abs(better.txTransfo - worse.txTransfo)
  if (diff < 0.5) return null

  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 14px',
        background: '#eff6ff',
        borderLeft: '3px solid #378ADD',
        borderRadius: '0 8px 8px 0',
        fontSize: 12,
        color: '#475569',
      }}
    >
      💡 Les numéros <strong>{labels[better.type]}</strong> génèrent un taux de
      transformation de <strong>{better.txTransfo.toFixed(1)}%</strong> vs{' '}
      <strong>{worse.txTransfo.toFixed(1)}%</strong> pour les numéros{' '}
      <strong>{labels[worse.type]}</strong> (écart de {diff.toFixed(1)} pts).
    </div>
  )
}

interface DeptTableProps {
  depts: DeptStats[]
  sortKey: DeptSortKey
  sortDir: SortDir
  onToggleSort: (key: DeptSortKey) => void
}

function DeptTable({ depts, sortKey, sortDir, onToggleSort }: DeptTableProps) {
  const maxLeads = useMemo(
    () => depts.reduce((m, d) => (d.total > m ? d.total : m), 0),
    [depts],
  )

  const sorted = useMemo(() => {
    const arr = [...depts]
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [depts, sortKey, sortDir])

  if (depts.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
          color: '#94a3b8',
          fontSize: 13,
          fontStyle: 'italic',
        }}
      >
        Aucun département sur la période.
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
        overflowX: 'auto',
        maxHeight: 560,
        overflowY: 'auto',
      }}
    >
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
      >
        <thead>
          <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
            <SortableTh
              k="dept"
              label="Dépt."
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={onToggleSort}
            />
            <SortableTh
              k="total"
              label="Leads"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={onToggleSort}
            />
            <SortableTh
              k="partLeads"
              label="Part"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={onToggleSort}
              right
            />
            <SortableTh
              k="txDecroches"
              label="Tx décrochés"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={onToggleSort}
              right
            />
            <SortableTh
              k="txTransfo"
              label="Tx transfo"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={onToggleSort}
              right
            />
            <SortableTh
              k="pmMoyen"
              label="PM moyen"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={onToggleSort}
              right
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.dept} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ ...td, fontWeight: 700, color: '#0f172a' }}>
                {d.dept}
              </td>
              <td style={td}>
                <DeptBar value={d.total} max={maxLeads} />
              </td>
              <td style={{ ...td, textAlign: 'right', color: '#94a3b8' }}>
                {d.partLeads.toFixed(1)}%
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: txDecrochesColor(d.txDecroches),
                  fontWeight: 600,
                }}
              >
                {d.txDecroches.toFixed(1)}%
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: txTransfoColor(d.txTransfo),
                  fontWeight: 700,
                }}
              >
                {d.txTransfo.toFixed(1)}%
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: pmColor(d.pmMoyen),
                  fontWeight: 600,
                }}
              >
                {d.pmMoyen > 0 ? `${d.pmMoyen.toFixed(0)}€` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Barre progress inline (colonne LEADS)
function DeptBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 120,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 8,
          background: '#1e293b',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#3b82f6',
            borderRadius: 4,
          }}
        />
      </div>
      <span
        style={{
          minWidth: 32,
          textAlign: 'right',
          color: '#378ADD',
          fontWeight: 600,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
        }}
      >
        {fmt(value)}
      </span>
    </div>
  )
}

// Camembert des départements avec "Autres" regroupés
function DeptPie({ depts }: { depts: DeptStats[] }) {
  const { slices, totalLeads } = useMemo(() => {
    const total = depts.reduce((s, d) => s + d.total, 0)
    if (total === 0) return { slices: [], totalLeads: 0 }
    const threshold = (total * PIE_THRESHOLD_PCT) / 100
    const top: { label: string; value: number; color: string }[] = []
    let autresVal = 0
    let colorIdx = 0
    for (const d of depts) {
      if (d.total >= threshold && colorIdx < PIE_COLORS.length) {
        top.push({
          label: d.dept,
          value: d.total,
          color: PIE_COLORS[colorIdx]!,
        })
        colorIdx += 1
      } else {
        autresVal += d.total
      }
    }
    if (autresVal > 0) {
      top.push({ label: 'Autres', value: autresVal, color: PIE_AUTRES_COLOR })
    }
    return { slices: top, totalLeads: total }
  }, [depts])

  const chartData: ChartData<'doughnut'> = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((s) => s.color),
          borderWidth: 1,
          borderColor: '#fff',
        },
      ],
    }),
    [slices],
  )

  const chartOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 10,
            font: { size: 11 },
            generateLabels: (chart) => {
              const data = chart.data
              if (!data.labels || !data.datasets[0]) return []
              const ds = data.datasets[0]
              const bgs = ds.backgroundColor as string[]
              return data.labels.map((lbl, i) => {
                const val = (ds.data as number[])[i] ?? 0
                const pct = totalLeads > 0 ? (val / totalLeads) * 100 : 0
                return {
                  text: `${lbl} ${pct.toFixed(1)}%`,
                  fillStyle: bgs[i] ?? '#94a3b8',
                  strokeStyle: bgs[i] ?? '#94a3b8',
                  lineWidth: 0,
                  index: i,
                }
              })
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.parsed)
              const pct = totalLeads > 0 ? (val / totalLeads) * 100 : 0
              return `${ctx.label}: ${fmt(val)} (${pct.toFixed(1)}%)`
            },
          },
        },
      },
    }),
    [totalLeads],
  )

  if (slices.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
          color: '#94a3b8',
          fontSize: 13,
          fontStyle: 'italic',
        }}
      >
        Aucune donnée.
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}>
        Répartition
      </h3>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
        Départements &lt; {PIE_THRESHOLD_PCT}% regroupés en « Autres ».
      </div>
      <div style={{ height: 320 }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  )
}

// Vue compare : tableau combiné avec deltas
function CompareTable({
  analyseA,
  analyseB,
}: {
  analyseA: AnalyseResult
  analyseB: AnalyseResult
}) {
  const combined = useMemo(() => {
    const mapA = new Map(analyseA.depts.map((d) => [d.dept, d]))
    const mapB = new Map(analyseB.depts.map((d) => [d.dept, d]))
    const all = new Set<string>([...mapA.keys(), ...mapB.keys()])
    return Array.from(all)
      .map((dept) => ({
        dept,
        a: mapA.get(dept) ?? null,
        b: mapB.get(dept) ?? null,
      }))
      .sort((x, y) => (y.a?.total ?? 0) - (x.a?.total ?? 0))
  }, [analyseA.depts, analyseB.depts])

  if (combined.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
          color: '#94a3b8',
          fontSize: 13,
          fontStyle: 'italic',
        }}
      >
        Aucun département sur les deux périodes.
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
        overflowX: 'auto',
      }}
    >
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
      >
        <thead>
          <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
            <th style={th}>Dépt.</th>
            <th style={{ ...th, color: '#378ADD' }}>Leads A</th>
            <th style={{ ...th, color: '#378ADD', textAlign: 'right' }}>
              Tx déc. A
            </th>
            <th style={{ ...th, color: '#378ADD', textAlign: 'right' }}>
              Tx transfo A
            </th>
            <th style={{ ...th, color: '#378ADD', textAlign: 'right' }}>
              PM A
            </th>
            <th style={{ ...th, textAlign: 'center' }}>Δ</th>
            <th style={{ ...th, color: '#BA7517' }}>Leads B</th>
            <th style={{ ...th, color: '#BA7517', textAlign: 'right' }}>
              Tx déc. B
            </th>
            <th style={{ ...th, color: '#BA7517', textAlign: 'right' }}>
              Tx transfo B
            </th>
            <th style={{ ...th, color: '#BA7517', textAlign: 'right' }}>
              PM B
            </th>
          </tr>
        </thead>
        <tbody>
          {combined.map(({ dept, a, b }) => (
            <tr key={dept} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ ...td, fontWeight: 700, color: '#0f172a' }}>
                {dept}
              </td>
              {/* A */}
              <td style={{ ...td, color: '#378ADD' }}>
                {a ? fmt(a.total) : '—'}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: a ? txDecrochesColor(a.txDecroches) : '#cbd5e1',
                }}
              >
                {a ? `${a.txDecroches.toFixed(1)}%` : '—'}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: a ? txTransfoColor(a.txTransfo) : '#cbd5e1',
                  fontWeight: 600,
                }}
              >
                {a ? `${a.txTransfo.toFixed(1)}%` : '—'}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: a ? pmColor(a.pmMoyen) : '#cbd5e1',
                }}
              >
                {a && a.pmMoyen > 0 ? `${a.pmMoyen.toFixed(0)}€` : '—'}
              </td>
              {/* Deltas */}
              <td
                style={{
                  ...td,
                  textAlign: 'center',
                  fontSize: 11,
                  color: '#64748b',
                }}
              >
                <Deltas a={a} b={b} />
              </td>
              {/* B */}
              <td style={{ ...td, color: '#BA7517' }}>
                {b ? fmt(b.total) : '—'}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: b ? txDecrochesColor(b.txDecroches) : '#cbd5e1',
                }}
              >
                {b ? `${b.txDecroches.toFixed(1)}%` : '—'}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: b ? txTransfoColor(b.txTransfo) : '#cbd5e1',
                  fontWeight: 600,
                }}
              >
                {b ? `${b.txTransfo.toFixed(1)}%` : '—'}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'right',
                  color: b ? pmColor(b.pmMoyen) : '#cbd5e1',
                }}
              >
                {b && b.pmMoyen > 0 ? `${b.pmMoyen.toFixed(0)}€` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Deltas({ a, b }: { a: DeptStats | null; b: DeptStats | null }) {
  if (!a || !b) {
    return <span style={{ color: '#cbd5e1' }}>—</span>
  }
  const dDec = a.txDecroches - b.txDecroches
  const dTx = a.txTransfo - b.txTransfo
  const dPm = a.pmMoyen - b.pmMoyen

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <DeltaValue label="déc." value={dDec} suffix="pts" />
      <DeltaValue label="tx" value={dTx} suffix="pts" />
      <DeltaValue label="pm" value={dPm} suffix="€" />
    </div>
  )
}

function DeltaValue({
  label,
  value,
  suffix,
}: {
  label: string
  value: number
  suffix: string
}) {
  if (Math.abs(value) < 0.1) {
    return <span style={{ color: '#94a3b8', fontSize: 10 }}>= {label}</span>
  }
  const up = value > 0
  const arrow = up ? '↑' : '↓'
  const color = up ? '#1D9E75' : '#E24B4A'
  return (
    <span style={{ color, fontSize: 10, fontWeight: 600 }}>
      {arrow} {Math.abs(value).toFixed(1)}
      {suffix} {label}
    </span>
  )
}

interface SortableThProps {
  k: DeptSortKey
  label: string
  sortKey: DeptSortKey
  sortDir: SortDir
  onToggle: (k: DeptSortKey) => void
  right?: boolean
}
function SortableTh({
  k,
  label,
  sortKey,
  sortDir,
  onToggle,
  right,
}: SortableThProps) {
  const active = sortKey === k
  return (
    <th
      style={{
        textAlign: right ? 'right' : 'left',
        padding: '8px 12px 8px 0',
        borderBottom: '1px solid #e5e7eb',
        cursor: 'pointer',
        userSelect: 'none',
        color: active ? '#0f172a' : '#64748b',
        position: 'sticky',
        top: 0,
        background: '#fff',
      }}
      onClick={() => onToggle(k)}
    >
      {label}
      {active && (
        <span style={{ marginLeft: 4, fontSize: 9 }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

const dateInputStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '4px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#f9fafb',
  color: '#374151',
}

export default Analyse
