import { useMemo, useState } from 'react'
import { addDays, format, getISOWeek, parseISO } from 'date-fns'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { useStats } from '../hooks/useStats'
import { useHebdo } from '../hooks/useHebdo'

ChartJS.register(
  LineController,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
)

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

function txTransfoColor(tx: number): string {
  if (tx >= 15) return '#10b981'
  if (tx >= 10) return '#f59e0b'
  return '#ef4444'
}

function txConvColor(tx: number): string {
  return tx >= 20 ? '#1D9E75' : '#BA7517'
}

function fmtDateFr(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yy')
  } catch {
    return iso
  }
}

function weekLabelShort(dateDebut: Date): string {
  return `S${getISOWeek(dateDebut)}·${format(dateDebut, 'dd/MM')}`
}

interface DayBucket {
  dateKey: string
  jour: string
  leads: number
  contrats: number
  enCours: number
  nrp: number
  perdu: number
  inexploitable: number
}

// ── Cellule valeur + pourcentage ────────────────────────────
interface ValuePctProps {
  value: number
  total: number
  color: string
  bold?: boolean
}

function ValuePct({ value, total, color, bold }: ValuePctProps) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <span style={{ color, fontWeight: bold ? 600 : undefined }}>
      {value}
      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
        {pct.toFixed(1)}%
      </span>
    </span>
  )
}

function Hebdo() {
  // Les leads sont déjà filtrés par la FilterBar globale (commercial, dates,
  // catégorie, origine, verticale). Pas de filtre local — pas de doublon.
  const { leads, contrats, loading, error } = useStats()
  const [drillWeek, setDrillWeek] = useState<string | null>(null)

  const weeks = useHebdo(leads, contrats)

  const totals = useMemo(() => {
    const t = weeks.reduce(
      (acc, w) => {
        acc.leads += w.leads
        acc.contrats += w.contrats
        acc.enCours += w.enCours
        acc.nrp += w.nrp
        acc.perdu += w.perdu
        acc.inexploitable += w.inexploitable
        return acc
      },
      { leads: 0, contrats: 0, enCours: 0, nrp: 0, perdu: 0, inexploitable: 0 },
    )
    const pipe = t.contrats + t.enCours
    return {
      ...t,
      txTransformation: t.leads > 0 ? (t.contrats / t.leads) * 100 : 0,
      txConversion: pipe > 0 ? (t.contrats / pipe) * 100 : 0,
    }
  }, [weeks])

  // Drill-down : leads de la semaine ouverte, groupés par jour
  const drillDays = useMemo<DayBucket[] | null>(() => {
    if (!drillWeek) return null
    const monday = parseISO(drillWeek)
    const sunday = addDays(monday, 6)
    const sundayStr = format(sunday, 'yyyy-MM-dd')

    const byDay = new Map<string, DayBucket>()
    for (const l of leads) {
      if (!l.date_creation) continue
      const dateKey = l.date_creation.slice(0, 10)
      if (dateKey < drillWeek || dateKey > sundayStr) continue

      let b = byDay.get(dateKey)
      if (!b) {
        const d = parseISO(dateKey)
        const idx = (d.getDay() + 6) % 7
        b = {
          dateKey,
          jour: JOURS[idx] ?? '?',
          leads: 0,
          contrats: 0,
          enCours: 0,
          nrp: 0,
          perdu: 0,
          inexploitable: 0,
        }
        byDay.set(dateKey, b)
      }
      b.leads += 1
      if (l.categorie === 'Contrat') b.contrats += 1
      else if (l.categorie === 'En cours') b.enCours += 1
      else if (l.categorie === 'NRP') b.nrp += 1
      else if (l.categorie === 'Perdu') b.perdu += 1
      else if (l.categorie === 'Inexploitable') b.inexploitable += 1
    }
    return Array.from(byDay.values()).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    )
  }, [drillWeek, leads])

  function toggleDrill(weekKey: string) {
    setDrillWeek((prev) => (prev === weekKey ? null : weekKey))
  }

  // ── Graphique : 5 taux par semaine (ordre chronologique) ──
  const chartWeeks = useMemo(() => [...weeks].reverse(), [weeks])

  const chartData = useMemo<ChartData<'line'>>(() => {
    const labels = chartWeeks.map((w) => weekLabelShort(w.dateDebut))
    const pct = (n: number, total: number) => (total > 0 ? (n / total) * 100 : 0)
    const txTransfo = chartWeeks.map((w) => Number(w.txTransformation.toFixed(2)))
    const txConv = chartWeeks.map((w) => Number(w.txConversion.toFixed(2)))
    const txNrp = chartWeeks.map((w) => Number(pct(w.nrp, w.leads).toFixed(2)))
    const txPerdu = chartWeeks.map((w) => Number(pct(w.perdu, w.leads).toFixed(2)))
    const txInex = chartWeeks.map((w) =>
      Number(pct(w.inexploitable, w.leads).toFixed(2)),
    )

    return {
      labels,
      datasets: [
        {
          label: 'Tx transformation',
          data: txTransfo,
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          pointBackgroundColor: '#10b981',
          borderWidth: 2.5,
          pointRadius: 4,
          tension: 0.25,
        },
        {
          label: 'Tx conversion',
          data: txConv,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          pointBackgroundColor: '#3b82f6',
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.25,
        },
        {
          label: 'Tx NRP',
          data: txNrp,
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          pointBackgroundColor: '#f59e0b',
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.25,
        },
        {
          label: 'Tx perdu',
          data: txPerdu,
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
          pointBackgroundColor: '#ef4444',
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.25,
        },
        {
          label: 'Tx inexploitable',
          data: txInex,
          borderColor: '#94a3b8',
          backgroundColor: '#94a3b8',
          pointBackgroundColor: '#94a3b8',
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.25,
        },
      ],
    }
  }, [chartWeeks])

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#94a3b8',
          callback: (v) => `${v}%`,
        },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      x: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#cbd5e1', font: { size: 11 }, boxWidth: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)}%`,
        },
      },
    },
  }

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Suivi hebdo</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Performance semaine par semaine — cliquer sur une ligne pour le détail jour.
        </p>
      </div>

      {/* Graphique évolution taux */}
      <div
        style={{
          background: '#0f1923',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '16px 8px 8px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: '#64748b',
            marginLeft: 16,
            marginBottom: 12,
          }}
        >
          ÉVOLUTION HEBDOMADAIRE
        </div>
        <div style={{ height: 280 }}>
          {chartWeeks.length > 0 ? (
            <Chart type="line" data={chartData} options={chartOptions} />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13, padding: 16 }}>
              Aucune donnée pour cette période.
            </div>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Semaine</th>
              <th style={th}>Total</th>
              <th style={th}>Contrats</th>
              <th style={th}>En cours</th>
              <th style={th}>NRP</th>
              <th style={th}>Perdu</th>
              <th style={th}>Inexpl.</th>
              <th style={{ ...th, textAlign: 'right' }}>Tx transfo</th>
              <th style={{ ...th, textAlign: 'right' }}>Tx conv</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const isOpen = drillWeek === w.weekKey
              return (
                <WeekRowsFragment
                  key={w.weekKey}
                  weekKey={w.weekKey}
                  weekLabel={w.weekLabel}
                  leads={w.leads}
                  contrats={w.contrats}
                  enCours={w.enCours}
                  nrp={w.nrp}
                  perdu={w.perdu}
                  inexploitable={w.inexploitable}
                  txTransformation={w.txTransformation}
                  txConversion={w.txConversion}
                  isOpen={isOpen}
                  drillDays={isOpen ? drillDays : null}
                  onToggle={() => toggleDrill(w.weekKey)}
                />
              )
            })}

            {/* Ligne Total */}
            {weeks.length > 0 && (
              <tr
                style={{
                  background: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 700,
                }}
              >
                <td style={{ ...td, color: '#0f172a' }}>Total</td>
                <td style={{ ...td, color: '#0f172a' }}>{totals.leads}</td>
                <td style={td}>
                  <ValuePct value={totals.contrats} total={totals.leads} color="#1D9E75" bold />
                </td>
                <td style={td}>
                  <ValuePct value={totals.enCours} total={totals.leads} color="#378ADD" />
                </td>
                <td style={td}>
                  <ValuePct value={totals.nrp} total={totals.leads} color="#BA7517" />
                </td>
                <td style={td}>
                  <ValuePct value={totals.perdu} total={totals.leads} color="#A32D2D" />
                </td>
                <td style={td}>
                  <ValuePct value={totals.inexploitable} total={totals.leads} color="#888780" />
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontWeight: 700,
                    color: txTransfoColor(totals.txTransformation),
                  }}
                >
                  {totals.txTransformation.toFixed(1)}%
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontWeight: 700,
                    color: txConvColor(totals.txConversion),
                  }}
                >
                  {totals.txConversion.toFixed(1)}%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface WeekRowsFragmentProps {
  weekKey: string
  weekLabel: string
  leads: number
  contrats: number
  enCours: number
  nrp: number
  perdu: number
  inexploitable: number
  txTransformation: number
  txConversion: number
  isOpen: boolean
  drillDays: DayBucket[] | null
  onToggle: () => void
}

function WeekRowsFragment({
  weekKey,
  weekLabel,
  leads,
  contrats,
  enCours,
  nrp,
  perdu,
  inexploitable,
  txTransformation,
  txConversion,
  isOpen,
  drillDays,
  onToggle,
}: WeekRowsFragmentProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          borderTop: '1px solid #f1f5f9',
          background: isOpen ? 'rgba(55, 138, 221, 0.06)' : 'transparent',
        }}
      >
        <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: 10,
              color: '#94a3b8',
              marginRight: 6,
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          >
            ▶
          </span>
          {weekLabel}
        </td>
        <td style={{ ...td, color: '#475569' }}>{leads}</td>
        <td style={td}>
          <ValuePct value={contrats} total={leads} color="#1D9E75" bold />
        </td>
        <td style={td}>
          <ValuePct value={enCours} total={leads} color="#378ADD" />
        </td>
        <td style={td}>
          <ValuePct value={nrp} total={leads} color="#BA7517" />
        </td>
        <td style={td}>
          <ValuePct value={perdu} total={leads} color="#A32D2D" />
        </td>
        <td style={td}>
          <ValuePct value={inexploitable} total={leads} color="#888780" />
        </td>
        <td
          style={{
            ...td,
            textAlign: 'right',
            fontWeight: 700,
            color: txTransfoColor(txTransformation),
          }}
        >
          {txTransformation.toFixed(1)}%
        </td>
        <td
          style={{
            ...td,
            textAlign: 'right',
            fontWeight: 700,
            color: txConvColor(txConversion),
          }}
        >
          {txConversion.toFixed(1)}%
        </td>
      </tr>

      {isOpen && drillDays !== null && (
        <>
          {drillDays.length === 0 ? (
            <tr style={{ background: 'rgba(55, 138, 221, 0.03)' }}>
              <td
                colSpan={9}
                style={{
                  padding: '10px 12px 10px 32px',
                  fontSize: 12,
                  color: '#94a3b8',
                  fontStyle: 'italic',
                }}
              >
                Aucun lead cette semaine.
              </td>
            </tr>
          ) : (
            drillDays.map((d) => {
              const pipe = d.contrats + d.enCours
              const txT = d.leads > 0 ? (d.contrats / d.leads) * 100 : 0
              const txC = pipe > 0 ? (d.contrats / pipe) * 100 : 0
              return (
                <tr
                  key={`${weekKey}-${d.dateKey}`}
                  style={{
                    background: 'rgba(55, 138, 221, 0.03)',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <td style={{ ...tdSub, paddingLeft: 32 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#475569',
                        marginRight: 6,
                      }}
                    >
                      {d.jour}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {fmtDateFr(d.dateKey)}
                    </span>
                  </td>
                  <td style={{ ...tdSub, color: '#94a3b8' }}>{d.leads}</td>
                  <td style={tdSub}>
                    <ValuePct value={d.contrats} total={d.leads} color="#1D9E75" bold />
                  </td>
                  <td style={tdSub}>
                    <ValuePct value={d.enCours} total={d.leads} color="#378ADD" />
                  </td>
                  <td style={tdSub}>
                    <ValuePct value={d.nrp} total={d.leads} color="#BA7517" />
                  </td>
                  <td style={tdSub}>
                    <ValuePct value={d.perdu} total={d.leads} color="#A32D2D" />
                  </td>
                  <td style={tdSub}>
                    <ValuePct value={d.inexploitable} total={d.leads} color="#888780" />
                  </td>
                  <td
                    style={{
                      ...tdSub,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: txTransfoColor(txT),
                    }}
                  >
                    {txT.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      ...tdSub,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: pipe > 0 ? txConvColor(txC) : '#cbd5e1',
                    }}
                  >
                    {pipe > 0 ? `${txC.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              )
            })
          )}
        </>
      )}
    </>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px 10px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = {
  padding: '11px 12px 11px 0',
  color: '#475569',
}
const tdSub: React.CSSProperties = {
  padding: '8px 12px 8px 0',
  fontSize: 12,
  color: '#94a3b8',
}

export default Hebdo
