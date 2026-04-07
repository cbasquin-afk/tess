import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns'
import { fetchContratsByPeriod, fetchLeadsByPeriod } from '../api'
import type { Contrat, Lead } from '../types'

interface PeriodData {
  leads: Lead[]
  contrats: Contrat[]
  loading: boolean
  error: string | null
}

interface PeriodMetrics {
  total: number
  contrats: number
  txTransformation: number
  pmMoyen: number
}

function metrics(leads: Lead[], contrats: Contrat[]): PeriodMetrics {
  const pmIdx = new Map<number, number>()
  for (const c of contrats) {
    if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
      pmIdx.set(c.identifiant_projet, c.prime_brute_mensuelle)
    }
  }
  const total = leads.length
  const cs = leads.filter((l) => l.categorie === 'Contrat')
  const pmVals = cs
    .map((l) => pmIdx.get(l.identifiant_projet))
    .filter((v): v is number => typeof v === 'number')
  const pmMoyen = pmVals.length
    ? pmVals.reduce((a, b) => a + b, 0) / pmVals.length
    : 0
  return {
    total,
    contrats: cs.length,
    txTransformation: total > 0 ? (cs.length / total) * 100 : 0,
    pmMoyen,
  }
}

function defaultPeriods(): {
  a: { from: string; to: string }
  b: { from: string; to: string }
} {
  const now = new Date()
  const aStart = startOfMonth(subMonths(now, 1))
  const aEnd = endOfMonth(subMonths(now, 1))
  const bStart = startOfMonth(subMonths(now, 3))
  const bEnd = endOfMonth(subMonths(now, 2))
  return {
    a: { from: format(aStart, 'yyyy-MM-dd'), to: format(aEnd, 'yyyy-MM-dd') },
    b: { from: format(bStart, 'yyyy-MM-dd'), to: format(bEnd, 'yyyy-MM-dd') },
  }
}

function usePeriodData(from: string, to: string): PeriodData {
  const [data, setData] = useState<PeriodData>({
    leads: [],
    contrats: [],
    loading: true,
    error: null,
  })
  useEffect(() => {
    let cancelled = false
    setData((d) => ({ ...d, loading: true, error: null }))
    Promise.all([fetchLeadsByPeriod(from, to), fetchContratsByPeriod(from, to)])
      .then(([l, c]) => {
        if (!cancelled)
          setData({ leads: l, contrats: c, loading: false, error: null })
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setData({
            leads: [],
            contrats: [],
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          })
      })
    return () => {
      cancelled = true
    }
  }, [from, to])
  return data
}

function Delta({
  a,
  b,
  unit,
  invert,
}: {
  a: number
  b: number
  unit: string
  invert?: boolean
}) {
  const diff = a - b
  if (Math.abs(diff) < 0.05) {
    return <span style={{ color: '#94a3b8' }}>→ 0{unit}</span>
  }
  const better = invert ? diff < 0 : diff > 0
  const col = better ? '#1D9E75' : '#E24B4A'
  const arrow = diff > 0 ? '↑' : '↓'
  return (
    <span style={{ color: col, fontWeight: 700 }}>
      {arrow} {Math.abs(diff).toFixed(1)}
      {unit}
    </span>
  )
}

function Analyse() {
  const init = useMemo(() => defaultPeriods(), [])
  const [periodA, setPeriodA] = useState(init.a)
  const [periodB, setPeriodB] = useState(init.b)

  const dataA = usePeriodData(periodA.from, periodA.to)
  const dataB = usePeriodData(periodB.from, periodB.to)

  const mA = useMemo(
    () => metrics(dataA.leads, dataA.contrats),
    [dataA.leads, dataA.contrats],
  )
  const mB = useMemo(
    () => metrics(dataB.leads, dataB.contrats),
    [dataB.leads, dataB.contrats],
  )

  const loading = dataA.loading || dataB.loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Analyse périodes</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Comparatif A vs B sur les KPIs clés.
        </p>
      </div>

      {/* Sélecteurs */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
        }}
      >
        <PeriodPicker
          label="Période A"
          accent="#378ADD"
          value={periodA}
          onChange={setPeriodA}
        />
        <PeriodPicker
          label="Période B (référence)"
          accent="#BA7517"
          value={periodB}
          onChange={setPeriodB}
        />
      </div>

      {dataA.error && (
        <div style={{ color: '#dc2626' }}>Erreur A : {dataA.error}</div>
      )}
      {dataB.error && (
        <div style={{ color: '#dc2626' }}>Erreur B : {dataB.error}</div>
      )}
      {loading && <div style={{ color: '#64748b' }}>Chargement…</div>}

      {!loading && (
        <>
          {/* Δ KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
            }}
          >
            <DeltaCard
              label="Leads"
              a={mA.total}
              b={mB.total}
              format={(v) => v.toFixed(0)}
              unit=""
            />
            <DeltaCard
              label="Contrats"
              a={mA.contrats}
              b={mB.contrats}
              format={(v) => v.toFixed(0)}
              unit=""
            />
            <DeltaCard
              label="Tx transformation"
              a={mA.txTransformation}
              b={mB.txTransformation}
              format={(v) => `${v.toFixed(1)}%`}
              unit="pts"
            />
            <DeltaCard
              label="PM moyen"
              a={mA.pmMoyen}
              b={mB.pmMoyen}
              format={(v) => `${v.toFixed(0)}€`}
              unit="€"
            />
          </div>

          {/* Tableau comparatif */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 18,
            }}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>
              Comparatif détaillé
            </h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                  <th style={th}>Métrique</th>
                  <th style={{ ...th, color: '#378ADD', textAlign: 'right' }}>
                    Période A
                  </th>
                  <th style={{ ...th, color: '#BA7517', textAlign: 'right' }}>
                    Période B
                  </th>
                  <th style={{ ...th, textAlign: 'right' }}>Δ</th>
                </tr>
              </thead>
              <tbody>
                <Row
                  label="Leads"
                  a={mA.total.toString()}
                  b={mB.total.toString()}
                  delta={<Delta a={mA.total} b={mB.total} unit="" />}
                />
                <Row
                  label="Contrats"
                  a={mA.contrats.toString()}
                  b={mB.contrats.toString()}
                  delta={<Delta a={mA.contrats} b={mB.contrats} unit="" />}
                />
                <Row
                  label="Tx transformation"
                  a={`${mA.txTransformation.toFixed(1)}%`}
                  b={`${mB.txTransformation.toFixed(1)}%`}
                  delta={
                    <Delta
                      a={mA.txTransformation}
                      b={mB.txTransformation}
                      unit="pts"
                    />
                  }
                />
                <Row
                  label="PM moyen"
                  a={`${mA.pmMoyen.toFixed(0)}€`}
                  b={`${mB.pmMoyen.toFixed(0)}€`}
                  delta={<Delta a={mA.pmMoyen} b={mB.pmMoyen} unit="€" />}
                />
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

interface PeriodPickerProps {
  label: string
  accent: string
  value: { from: string; to: string }
  onChange: (v: { from: string; to: string }) => void
}
function PeriodPicker({ label, accent, value, onChange }: PeriodPickerProps) {
  return (
    <div>
      <div
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          background: `${accent}15`,
          color: accent,
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 12,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          style={dateInput}
        />
        <span style={{ color: '#94a3b8' }}>→</span>
        <input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          style={dateInput}
        />
      </div>
    </div>
  )
}

interface DeltaCardProps {
  label: string
  a: number
  b: number
  format: (v: number) => string
  unit: string
}
function DeltaCard({ label, a, b, format, unit }: DeltaCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 4px' }}>
        {format(a)}
      </div>
      <div style={{ fontSize: 12 }}>
        vs {format(b)} <Delta a={a} b={b} unit={unit} />
      </div>
    </div>
  )
}

function Row({
  label,
  a,
  b,
  delta,
}: {
  label: string
  a: string
  b: string
  delta: React.ReactNode
}) {
  return (
    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
      <td style={{ padding: '10px 12px 10px 0', color: '#475569' }}>{label}</td>
      <td
        style={{
          padding: '10px 12px',
          textAlign: 'right',
          color: '#378ADD',
          fontWeight: 600,
        }}
      >
        {a}
      </td>
      <td
        style={{
          padding: '10px 12px',
          textAlign: 'right',
          color: '#BA7517',
          fontWeight: 600,
        }}
      >
        {b}
      </td>
      <td style={{ padding: '10px 0', textAlign: 'right' }}>{delta}</td>
    </tr>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px 10px 0',
  borderBottom: '1px solid #e5e7eb',
}

const dateInput: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  color: '#0f172a',
}

export default Analyse
