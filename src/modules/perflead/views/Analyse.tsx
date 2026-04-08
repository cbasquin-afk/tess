import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns'
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
  // Variante plus permissive pour la section Fixe/Mobile (≥12 vert)
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

  // Mode simple : données de la FilterBar
  const {
    leads: leadsCurrent,
    contrats: contratsCurrent,
    loading: loadingCurrent,
    error: errorCurrent,
  } = useStats()

  // Mode compare : fetch direct des deux périodes
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
    mode === 'simple'
      ? loadingCurrent
      : dataA.loading || dataB.loading
  const error =
    mode === 'simple'
      ? errorCurrent
      : (dataA.error ?? dataB.error)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Analyse</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Joignabilité par type de numéro et performance par département.
        </p>
      </div>

      {/* Sélecteur de mode + pickers */}
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
                {m === 'simple' ? 'Période seule' : 'Comparer A vs B'}
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

      {/* Section A — Fixe vs Mobile */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>
          Fixe vs Mobile
        </h2>
        <p style={{ color: '#94a3b8', margin: '0 0 12px', fontSize: 12 }}>
          Joignabilité par type de numéro de téléphone.
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

      {/* Section B — Cartographie départementale */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>
          Cartographie départementale
        </h2>
        <p style={{ color: '#94a3b8', margin: '0 0 12px', fontSize: 12 }}>
          Top {30} départements (≥ 5 leads). Cliquer sur une colonne pour
          trier.
        </p>

        {mode === 'simple' ? (
          <DeptTable
            depts={analyseSimple.depts}
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleSort={toggleSort}
          />
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <PeriodLabel label="Période A" color="#378ADD" />
              <DeptTable
                depts={analyseA.depts}
                sortKey={sortKey}
                sortDir={sortDir}
                onToggleSort={toggleSort}
              />
            </div>
            <div>
              <PeriodLabel label="Période B" color="#BA7517" />
              <DeptTable
                depts={analyseB.depts}
                sortKey={sortKey}
                sortDir={sortDir}
                onToggleSort={toggleSort}
              />
            </div>
          </div>
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
  // Compare fixe et mobile (ignore inconnu)
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
        Aucun département avec ≥ 5 leads sur la période.
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
              right
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
              <td style={{ ...td, textAlign: 'right', color: '#378ADD' }}>
                {fmt(d.total)}
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
