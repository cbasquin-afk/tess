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
import type { CompagnieStats, Contrat } from '../types'

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

function buildCompagnieStats(contrats: Contrat[]): CompagnieStats[] {
  const byComp = new Map<string, { count: number; total: number }>()
  for (const c of contrats) {
    if (!c.compagnie) continue
    const cur = byComp.get(c.compagnie) ?? { count: 0, total: 0 }
    cur.count += 1
    if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
      cur.total += c.prime_brute_mensuelle
    }
    byComp.set(c.compagnie, cur)
  }
  const totalCount = contrats.length || 1
  return Array.from(byComp.entries())
    .map<CompagnieStats>(([compagnie, d]) => ({
      compagnie,
      count: d.count,
      total: d.total,
      moyenne: d.count > 0 ? d.total / d.count : 0,
      part: (d.count / totalCount) * 100,
    }))
    .sort((a, b) => b.count - a.count)
}

function pmColor(moyenne: number): string {
  if (moyenne >= 100) return '#1D9E75'
  if (moyenne >= 80) return '#BA7517'
  return '#E24B4A'
}

function Contrats() {
  const { contrats, loading, error } = useContrats()

  const stats = useMemo(() => buildCompagnieStats(contrats), [contrats])

  const totals = useMemo(() => {
    const pmVals = contrats
      .map((c) => c.prime_brute_mensuelle)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const totalMens = pmVals.reduce((a, b) => a + b, 0)
    const pmMoyen = pmVals.length ? totalMens / pmVals.length : 0
    return {
      pmMoyen,
      totalMens,
      totalAnnuel: totalMens * 12,
      nb: contrats.length,
    }
  }, [contrats])

  const chartData = useMemo<ChartData<'bar' | 'line'>>(() => {
    return {
      labels: stats.map((s) => s.compagnie),
      datasets: [
        {
          type: 'bar',
          label: 'Nb contrats',
          data: stats.map((s) => s.count),
          backgroundColor: '#1D9E75',
          yAxisID: 'y',
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'line',
          label: '% du total',
          data: stats.map((s) => Number(s.part.toFixed(1))),
          borderColor: '#BA7517',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#BA7517',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y2',
          order: 1,
          tension: 0.3,
        },
      ],
    }
  }, [stats])

  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        position: 'left',
        beginAtZero: true,
        title: { display: true, text: 'Nb contrats' },
      },
      y2: {
        position: 'right',
        beginAtZero: true,
        max: 100,
        title: { display: true, text: '% du total' },
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (v) => `${v}%`,
        },
      },
      x: { grid: { display: false } },
    },
    plugins: {
      legend: { position: 'bottom' },
    },
  }

  if (loading) {
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  }
  if (error) {
    return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>
  }

  const pmOK = totals.pmMoyen >= 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Contrats & PM</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Vue financière sur l'ensemble des contrats signés.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <KpiCard
          label="PM moyen"
          value={`${totals.pmMoyen.toFixed(0)}€`}
          hint={pmOK ? '✓ seuil 100€' : '✗ sous le seuil 100€'}
          color={pmOK ? '#1D9E75' : '#E24B4A'}
        />
        <KpiCard
          label="Total mensuel"
          value={`${totals.totalMens.toFixed(0)}€`}
          color="#378ADD"
        />
        <KpiCard
          label="Total annuel"
          value={`${totals.totalAnnuel.toFixed(0)}€`}
          color="#BA7517"
        />
        <KpiCard label="Nb contrats" value={totals.nb.toString()} />
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>
          Répartition par compagnie
        </h3>
        <div style={{ height: 320 }}>
          {stats.length > 0 ? (
            <Chart type="bar" data={chartData} options={chartOptions} />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              Aucun contrat à afficher.
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Détail compagnies</h3>
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}
        >
          <thead>
            <tr style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>
              <th style={th}>Compagnie</th>
              <th style={th}>Nb</th>
              <th style={{ ...th, textAlign: 'right' }}>Part</th>
              <th style={{ ...th, textAlign: 'right' }}>PM moyen</th>
              <th style={{ ...th, textAlign: 'right' }}>Total / mois</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.compagnie} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td
                  style={{
                    padding: '10px 12px 10px 0',
                    color: '#0f172a',
                    fontWeight: 500,
                  }}
                >
                  {s.compagnie}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: '#378ADD',
                    fontWeight: 600,
                  }}
                >
                  {s.count}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#64748b',
                  }}
                >
                  {s.part.toFixed(1)}%
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: pmColor(s.moyenne),
                    fontWeight: 600,
                  }}
                >
                  {s.moyenne.toFixed(0)}€
                </td>
                <td
                  style={{
                    padding: '10px 0 10px 12px',
                    textAlign: 'right',
                    color: '#64748b',
                  }}
                >
                  {s.total.toFixed(0)}€
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px 10px 0',
  borderBottom: '1px solid #e5e7eb',
}

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  color?: string
}

function KpiCard({ label, value, hint, color }: KpiCardProps) {
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
      {hint && <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>}
    </div>
  )
}

export default Contrats
