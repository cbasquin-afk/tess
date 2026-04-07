import { useMemo, useState, type ChangeEvent } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import {
  BarController,
  BarElement,
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
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
)

const COMMERCIAUX = [
  'Christopher BASQUIN',
  'Charlotte BOCOGNANO',
  'Cheyenne DEBENATH',
] as const

const PERIOD_OPTIONS = [
  { value: 4, label: '4 sem' },
  { value: 8, label: '8 sem' },
  { value: 13, label: '13 sem' },
  { value: 0, label: 'Tout' },
] as const

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

function txTransfoColor(tx: number): string {
  return tx >= 12 ? '#1D9E75' : '#E24B4A'
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

function Hebdo() {
  const { leads, contrats, loading, error } = useStats()
  const [nbSemaines, setNbSemaines] = useState<number>(4)
  const [commercial, setCommercial] = useState<string>('')
  const [drillWeek, setDrillWeek] = useState<string | null>(null)

  const filteredLeads = useMemo(() => {
    if (!commercial) return leads
    return leads.filter((l) => l.attribution === commercial)
  }, [leads, commercial])

  const weeks = useHebdo(filteredLeads, contrats, { nbSemaines })

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
    for (const l of filteredLeads) {
      if (!l.date_creation) continue
      const dateKey = l.date_creation.slice(0, 10)
      if (dateKey < drillWeek || dateKey > sundayStr) continue

      let b = byDay.get(dateKey)
      if (!b) {
        const d = parseISO(dateKey)
        const idx = (d.getDay() + 6) % 7 // 0=Lun ... 6=Dim
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
  }, [drillWeek, filteredLeads])

  function toggleDrill(weekKey: string) {
    setDrillWeek((prev) => (prev === weekKey ? null : weekKey))
  }

  // Graphique : ordre chronologique (ancien → récent), donc reverse
  const chartLabels = useMemo(
    () => [...weeks].reverse().map((w) => w.weekLabel),
    [weeks],
  )
  const chartLeadsData = useMemo(
    () => [...weeks].reverse().map((w) => w.leads),
    [weeks],
  )
  const chartTxData = useMemo(
    () =>
      [...weeks].reverse().map((w) => Number(w.txTransformation.toFixed(1))),
    [weeks],
  )

  const chartData = useMemo<ChartData<'bar' | 'line'>>(
    () => ({
      labels: chartLabels,
      datasets: [
        {
          type: 'bar',
          label: 'Leads',
          data: chartLeadsData,
          backgroundColor: 'rgba(55, 138, 221, 0.35)',
          borderColor: '#378ADD',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line',
          label: 'Tx transformation',
          data: chartTxData,
          borderColor: '#378ADD',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#378ADD',
          borderWidth: 2.5,
          pointRadius: 4,
          yAxisID: 'y2',
          tension: 0.3,
          order: 1,
        },
      ],
    }),
    [chartLabels, chartLeadsData, chartTxData],
  )

  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        beginAtZero: true,
        position: 'left',
        title: { display: true, text: 'Leads' },
      },
      y2: {
        beginAtZero: true,
        position: 'right',
        max: 60,
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => `${v}%` },
        title: { display: true, text: 'Tx transfo' },
      },
      x: { grid: { display: false } },
    },
    plugins: { legend: { position: 'bottom' } },
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

      {/* Filtres */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = nbSemaines === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNbSemaines(opt.value)}
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
                {opt.label}
              </button>
            )
          })}
        </div>

        <select
          value={commercial}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setCommercial(e.target.value)
          }
          style={{
            padding: '6px 12px',
            fontSize: 13,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            color: '#0f172a',
          }}
        >
          <option value="">Tous les commerciaux</option>
          {COMMERCIAUX.map((c) => (
            <option key={c} value={c}>
              {c.split(' ')[0]}
            </option>
          ))}
        </select>
      </div>

      {/* Graphique */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>
          Évolution leads × tx transformation
        </h3>
        <div style={{ height: 280 }}>
          {weeks.length > 0 ? (
            <Chart type="bar" data={chartData} options={chartOptions} />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
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
                <td style={{ ...td, color: '#1D9E75' }}>{totals.contrats}</td>
                <td style={{ ...td, color: '#378ADD' }}>{totals.enCours}</td>
                <td style={{ ...td, color: '#BA7517' }}>{totals.nrp}</td>
                <td style={{ ...td, color: '#A32D2D' }}>{totals.perdu}</td>
                <td style={{ ...td, color: '#888780' }}>{totals.inexploitable}</td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    color: txTransfoColor(totals.txTransformation),
                  }}
                >
                  {totals.txTransformation.toFixed(1)}%
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
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
        <td style={{ ...td, color: '#1D9E75', fontWeight: 600 }}>{contrats}</td>
        <td style={{ ...td, color: '#378ADD' }}>{enCours}</td>
        <td style={{ ...td, color: '#BA7517' }}>{nrp}</td>
        <td style={{ ...td, color: '#A32D2D' }}>{perdu}</td>
        <td style={{ ...td, color: '#888780' }}>{inexploitable}</td>
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
              const txT =
                d.leads > 0 ? (d.contrats / d.leads) * 100 : 0
              const txC =
                pipe > 0 ? (d.contrats / pipe) * 100 : 0
              return (
                <tr
                  key={`${weekKey}-${d.dateKey}`}
                  style={{
                    background: 'rgba(55, 138, 221, 0.03)',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <td
                    style={{
                      ...tdSub,
                      paddingLeft: 32,
                    }}
                  >
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
                  <td style={{ ...tdSub, color: '#1D9E75', fontWeight: 600 }}>
                    {d.contrats}
                  </td>
                  <td style={{ ...tdSub, color: '#378ADD' }}>{d.enCours}</td>
                  <td style={{ ...tdSub, color: '#BA7517' }}>{d.nrp}</td>
                  <td style={{ ...tdSub, color: '#A32D2D' }}>{d.perdu}</td>
                  <td style={{ ...tdSub, color: '#888780' }}>
                    {d.inexploitable}
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
