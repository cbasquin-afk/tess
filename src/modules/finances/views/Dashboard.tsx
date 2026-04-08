import { useMemo } from 'react'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { useFinancesCtx } from '../context/FinancesContext'
import type { CAMensuel, CAParCommercial } from '../types'

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
)

const COMMERCIAUX = ['Charlotte', 'Cheyenne', 'Mariam', 'Christopher'] as const

const COMM_COLORS: Record<string, string> = {
  Charlotte: '#378ADD',
  Cheyenne: '#BA7517',
  Mariam: '#534AB7',
  Christopher: '#1D9E75',
}

const MOIS_NOMS = [
  '',
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

function fmtEur(n: number): string {
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

function fmtMois(annee: number, mois: number): string {
  return `${MOIS_NOMS[mois] ?? mois} ${annee}`
}

function Dashboard() {
  const { caMensuel, caParCommercial, loading, error } = useFinancesCtx()

  // Mois courant calculé en heure locale
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  // KPIs mois courant
  const kpisCurrentMonth = useMemo(() => {
    const row = caMensuel.find(
      (r) => r.annee === curYear && r.mois === curMonth,
    )
    return (
      row ?? {
        annee: curYear,
        mois: curMonth,
        ca_societe: 0,
        ca_mandataire: 0,
        frais: 0,
        nb_lignes: 0,
      }
    )
  }, [caMensuel, curYear, curMonth])

  // Lignes par commercial pour le mois courant
  const commCurrentMonth = useMemo<CAParCommercial[]>(() => {
    return caParCommercial.filter(
      (r) => r.annee === curYear && r.mois === curMonth,
    )
  }, [caParCommercial, curYear, curMonth])

  const totalSocieteMois = useMemo(
    () => commCurrentMonth.reduce((s, r) => s + r.ca_societe, 0),
    [commCurrentMonth],
  )

  // 3 derniers mois disponibles dans caMensuel
  const last3Months = useMemo<CAMensuel[]>(() => {
    return caMensuel.slice(0, 3).reverse() // ancien → récent
  }, [caMensuel])

  // TDB Tessoria : commercial × 3 mois + cumul
  const tdbRows = useMemo(() => {
    const rows: { commercial: string; vals: number[]; total: number }[] = []
    for (const com of COMMERCIAUX) {
      const vals = last3Months.map((m) => {
        const r = caParCommercial.find(
          (x) =>
            x.commercial_prenom === com &&
            x.annee === m.annee &&
            x.mois === m.mois,
        )
        return r?.ca_societe ?? 0
      })
      rows.push({
        commercial: com,
        vals,
        total: vals.reduce((s, v) => s + v, 0),
      })
    }
    return rows
  }, [last3Months, caParCommercial])

  const tdbTotalsByMonth = useMemo(() => {
    return last3Months.map((m) => {
      const sum = tdbRows.reduce((s, r) => {
        const idx = last3Months.indexOf(m)
        return s + (r.vals[idx] ?? 0)
      }, 0)
      return sum
    })
  }, [last3Months, tdbRows])

  const tdbGrandTotal = tdbTotalsByMonth.reduce((s, v) => s + v, 0)

  // Chart 12 derniers mois
  const last12 = useMemo<CAMensuel[]>(
    () => caMensuel.slice(0, 12).reverse(),
    [caMensuel],
  )

  const chartData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: last12.map(
        (m) => `${String(m.mois).padStart(2, '0')}/${m.annee}`,
      ),
      datasets: [
        {
          label: 'CA société',
          data: last12.map((m) => Math.round(m.ca_societe)),
          backgroundColor: '#00C18B',
          borderRadius: 4,
        },
      ],
    }),
    [last12],
  )

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${fmtEur(Number(ctx.parsed.y))}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `${v}€` },
      },
      x: { grid: { display: false } },
    },
  }

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Finances — Tableau de bord</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Marge brute société, commissions mandataires et frais de service.
        </p>
      </div>

      {/* 4 KPIs mois courant */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi
          label={`CA société ${MOIS_NOMS[curMonth]}`}
          value={fmtEur(kpisCurrentMonth.ca_societe)}
          color="#00C18B"
          hint="Marge brute"
        />
        <Kpi
          label="CA mandataires"
          value={fmtEur(kpisCurrentMonth.ca_mandataire)}
          hint={`${kpisCurrentMonth.ca_societe > 0 ? ((kpisCurrentMonth.ca_mandataire / kpisCurrentMonth.ca_societe) * 100).toFixed(0) : 0}% du CA société`}
        />
        <Kpi
          label="Frais de service"
          value={fmtEur(kpisCurrentMonth.frais)}
          color="#BA7517"
          hint="Mois courant"
        />
        <Kpi
          label="Nb lignes commission"
          value={String(kpisCurrentMonth.nb_lignes)}
          hint="Mensualités générées"
        />
      </div>

      {/* Grille CA par commercial — mois courant */}
      <Card title={`CA par commercial — ${MOIS_NOMS[curMonth]} ${curYear}`}>
        {commCurrentMonth.length === 0 ? (
          <Empty label="Aucune commission ce mois-ci." />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={trHead}>
                <th style={th}>Commercial</th>
                <th style={{ ...th, textAlign: 'right' }}>Nb contrats</th>
                <th style={{ ...th, textAlign: 'right' }}>CA société</th>
                <th style={{ ...th, textAlign: 'right' }}>CA mandataires</th>
                <th style={{ ...th, textAlign: 'right' }}>Frais</th>
                <th style={{ ...th, textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {commCurrentMonth.map((r) => {
                const col = COMM_COLORS[r.commercial_prenom] ?? '#64748b'
                const pct =
                  totalSocieteMois > 0
                    ? (r.ca_societe / totalSocieteMois) * 100
                    : 0
                return (
                  <tr
                    key={r.commercial_prenom}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td
                      style={{
                        ...td,
                        color: col,
                        fontWeight: 600,
                      }}
                    >
                      {r.commercial_prenom}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {r.nb_contrats}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        color: '#0f172a',
                        fontWeight: 600,
                      }}
                    >
                      {fmtEur(r.ca_societe)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        color: '#64748b',
                      }}
                    >
                      {fmtEur(r.ca_mandataire)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        color: '#94a3b8',
                      }}
                    >
                      {fmtEur(r.frais)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        color: '#94a3b8',
                      }}
                    >
                      {pct.toFixed(0)}%
                    </td>
                  </tr>
                )
              })}
              <tr
                style={{
                  background: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 700,
                }}
              >
                <td style={{ ...td, color: '#0f172a' }}>Total</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {commCurrentMonth.reduce((s, r) => s + r.nb_contrats, 0)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#00C18B',
                  }}
                >
                  {fmtEur(totalSocieteMois)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#64748b',
                  }}
                >
                  {fmtEur(
                    commCurrentMonth.reduce((s, r) => s + r.ca_mandataire, 0),
                  )}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#BA7517',
                  }}
                >
                  {fmtEur(commCurrentMonth.reduce((s, r) => s + r.frais, 0))}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>100%</td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>

      {/* TDB Tessoria — 3 derniers mois × commerciaux */}
      <Card title="TDB Tessoria Ass — CA société par commercial (3 derniers mois)">
        {last3Months.length === 0 ? (
          <Empty label="Pas de données disponibles." />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={trHead}>
                <th style={th}>Commercial</th>
                {last3Months.map((m) => (
                  <th
                    key={`${m.annee}-${m.mois}`}
                    style={{ ...th, textAlign: 'right' }}
                  >
                    {fmtMois(m.annee, m.mois)}
                  </th>
                ))}
                <th style={{ ...th, textAlign: 'right', color: '#0f172a' }}>
                  Cumul
                </th>
              </tr>
            </thead>
            <tbody>
              {tdbRows.map((row) => {
                const col = COMM_COLORS[row.commercial] ?? '#64748b'
                return (
                  <tr
                    key={row.commercial}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td
                      style={{
                        ...td,
                        color: col,
                        fontWeight: 600,
                      }}
                    >
                      {row.commercial}
                    </td>
                    {row.vals.map((v, i) => (
                      <td
                        key={i}
                        style={{
                          ...td,
                          textAlign: 'right',
                          fontFamily:
                            "'JetBrains Mono', ui-monospace, monospace",
                          color: v > 0 ? '#0f172a' : '#cbd5e1',
                        }}
                      >
                        {v > 0 ? fmtEur(v) : '—'}
                      </td>
                    ))}
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        color: '#0f172a',
                        fontWeight: 700,
                      }}
                    >
                      {fmtEur(row.total)}
                    </td>
                  </tr>
                )
              })}
              <tr
                style={{
                  background: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 700,
                }}
              >
                <td style={{ ...td, color: '#0f172a' }}>TOTAL</td>
                {tdbTotalsByMonth.map((v, i) => (
                  <td
                    key={i}
                    style={{
                      ...td,
                      textAlign: 'right',
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, monospace",
                      color: '#00C18B',
                    }}
                  >
                    {fmtEur(v)}
                  </td>
                ))}
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#00C18B',
                  }}
                >
                  {fmtEur(tdbGrandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>

      {/* Chart 12 mois */}
      <Card title="CA société — 12 derniers mois">
        <div style={{ height: 240 }}>
          {last12.length > 0 ? (
            <Chart type="bar" data={chartData} options={chartOptions} />
          ) : (
            <Empty label="Pas de données." />
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Sub-composants ──────────────────────────────────────────

interface KpiProps {
  label: string
  value: string
  hint?: string
  color?: string
}

function Kpi({ label, value, hint, color }: KpiProps) {
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
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>
      )}
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
      {label}
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}
const trHead: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 600,
}
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

export default Dashboard
