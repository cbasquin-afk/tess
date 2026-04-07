import { useMemo } from 'react'
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
import { useContrats } from '../hooks/useContrats'
import { useGammes } from '../hooks/useGammes'

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

function pmColor(pm: number): string {
  if (pm >= 100) return '#1D9E75'
  if (pm >= 80) return '#BA7517'
  return '#E24B4A'
}

function Gammes() {
  const { contrats, loading, error } = useContrats()
  const gammes = useGammes(contrats)

  const top8 = useMemo(() => gammes.slice(0, 8), [gammes])

  const totals = useMemo(() => {
    const pmVals = contrats
      .map((c) => c.prime_brute_mensuelle)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const totalMensuel = pmVals.reduce((a, b) => a + b, 0)
    const pmMoyen = pmVals.length ? totalMensuel / pmVals.length : 0
    return { pmMoyen, totalMensuel, nbContrats: contrats.length }
  }, [contrats])

  const chartData = useMemo<ChartData<'bar' | 'line'>>(
    () => ({
      labels: top8.map((g) => g.produit),
      datasets: [
        {
          type: 'bar',
          label: 'Nb contrats',
          data: top8.map((g) => g.contrats),
          backgroundColor: '#1D9E75',
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'PM moyen (€)',
          data: top8.map((g) => Math.round(g.pmMoyen)),
          borderColor: '#BA7517',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#BA7517',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y2',
          tension: 0.3,
        },
      ],
    }),
    [top8],
  )

  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { beginAtZero: true },
      y2: {
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => `${v}€` },
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
        <h1 style={{ margin: 0, fontSize: 24 }}>Gammes</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Répartition des contrats par produit et compagnie.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi
          label="Nb contrats"
          value={totals.nbContrats.toString()}
          color="#378ADD"
        />
        <Kpi
          label="CA mensuel"
          value={`${totals.totalMensuel.toFixed(0)}€`}
          color="#BA7517"
        />
        <Kpi
          label="PM moyen"
          value={`${totals.pmMoyen.toFixed(0)}€`}
          color={pmColor(totals.pmMoyen)}
        />
        <Kpi
          label="Nb gammes"
          value={gammes.length.toString()}
        />
      </div>

      <Card title="Top 8 produits — volume × PM">
        <div style={{ height: 320 }}>
          {top8.length > 0 ? (
            <Chart type="bar" data={chartData} options={chartOptions} />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              Aucun contrat à afficher.
            </div>
          )}
        </div>
      </Card>

      <Card title="Détail par produit">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>
              <th style={th}>Produit</th>
              <th style={th}>Compagnie</th>
              <th style={th}>Nb</th>
              <th style={{ ...th, textAlign: 'right' }}>Part</th>
              <th style={{ ...th, textAlign: 'right' }}>PM moyen</th>
              <th style={{ ...th, textAlign: 'right' }}>CA mensuel</th>
            </tr>
          </thead>
          <tbody>
            {gammes.map((g) => (
              <tr
                key={`${g.produit}-${g.compagnie}`}
                style={{ borderTop: '1px solid #f1f5f9' }}
              >
                <td style={{ ...td, color: '#0f172a', fontWeight: 500 }}>
                  {g.produit}
                </td>
                <td style={{ ...td, color: '#64748b' }}>{g.compagnie}</td>
                <td style={{ ...td, color: '#378ADD', fontWeight: 600 }}>
                  {g.contrats}
                </td>
                <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
                  {g.pctContrats.toFixed(1)}%
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    color: pmColor(g.pmMoyen),
                    fontWeight: 600,
                  }}
                >
                  {g.pmMoyen > 0 ? `${g.pmMoyen.toFixed(0)}€` : '—'}
                </td>
                <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
                  {g.caMensuel.toFixed(0)}€
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px 10px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0', color: '#475569' }

function Card({ title, children }: { title: string; children: React.ReactNode }) {
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

function Kpi({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
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
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default Gammes
