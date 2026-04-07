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
import { useStats } from '../hooks/useStats'
import { useAges, TRANCHES_ORDER } from '../hooks/useAges'

ChartJS.register(
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
)

function txColor(tx: number): string {
  if (tx >= 15) return '#1D9E75'
  if (tx >= 10) return '#BA7517'
  return '#E24B4A'
}

function Ages() {
  const { leads, contrats, loading, error } = useStats()
  const ages = useAges(leads, contrats)

  const chartData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: TRANCHES_ORDER as readonly string[] as string[],
      datasets: [
        {
          label: 'Leads',
          data: ages.map((a) => a.leads),
          backgroundColor: '#378ADD',
          borderRadius: 4,
        },
        {
          label: 'Contrats',
          data: ages.map((a) => a.contrats),
          backgroundColor: '#1D9E75',
          borderRadius: 4,
        },
      ],
    }),
    [ages],
  )

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      y: { beginAtZero: true },
      x: { grid: { display: false } },
    },
  }

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Tranches d'âge</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Distribution des leads et performance par tranche d'âge.
        </p>
      </div>

      <Card title="Distribution leads × contrats">
        <div style={{ height: 320 }}>
          <Chart type="bar" data={chartData} options={chartOptions} />
        </div>
      </Card>

      <Card title="Détail par tranche">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>
              <th style={th}>Tranche</th>
              <th style={th}>Leads</th>
              <th style={{ ...th, textAlign: 'right' }}>% leads</th>
              <th style={th}>Contrats</th>
              <th style={{ ...th, textAlign: 'right' }}>Tx transformation</th>
              <th style={{ ...th, textAlign: 'right' }}>PM moyen</th>
            </tr>
          </thead>
          <tbody>
            {ages
              .filter((a) => a.leads > 0)
              .map((a) => (
                <tr key={a.tranche} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>
                    {a.tranche}
                  </td>
                  <td style={{ ...td, color: '#378ADD', fontWeight: 600 }}>
                    {a.leads}
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
                    {a.pctLeads.toFixed(1)}%
                  </td>
                  <td style={{ ...td, color: '#1D9E75', fontWeight: 600 }}>
                    {a.contrats}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: txColor(a.txTransformation),
                      fontWeight: 600,
                    }}
                  >
                    {a.txTransformation.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: a.pmMoyen >= 100 ? '#1D9E75' : '#64748b',
                    }}
                  >
                    {a.pmMoyen > 0 ? `${a.pmMoyen.toFixed(0)}€` : '—'}
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

export default Ages
