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

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function Gammes() {
  const { contrats, loading, error } = useContrats()
  const { byProduit, byFormule } = useGammes(contrats)

  // Top 8 compagnies par nb contrats (avec PM moyen) — chart fidèle au natif
  const top8Compagnies = useMemo(() => {
    interface CompBucket {
      contrats: number
      pmVals: number[]
    }
    const byComp = new Map<string, CompBucket>()
    for (const c of contrats) {
      const comp = c.compagnie ?? 'Sans compagnie'
      let b = byComp.get(comp)
      if (!b) {
        b = { contrats: 0, pmVals: [] }
        byComp.set(comp, b)
      }
      b.contrats += 1
      if (c.prime_brute_mensuelle && c.prime_brute_mensuelle > 0) {
        b.pmVals.push(c.prime_brute_mensuelle)
      }
    }
    return Array.from(byComp.entries())
      .map(([compagnie, b]) => ({
        compagnie,
        contrats: b.contrats,
        pmMoyen: b.pmVals.length
          ? b.pmVals.reduce((a, x) => a + x, 0) / b.pmVals.length
          : 0,
      }))
      .sort((a, b) => b.contrats - a.contrats)
      .slice(0, 8)
  }, [contrats])

  // Top compagnie (KPI) : la première du top8 si présente
  const topCompagnie = useMemo(() => {
    if (top8Compagnies.length === 0) return null
    const t = top8Compagnies[0]!
    return { compagnie: t.compagnie, nb: t.contrats }
  }, [top8Compagnies])

  const topProduit = byProduit[0] ?? null
  const topFormule = byFormule[0] ?? null

  const chartData = useMemo<ChartData<'bar' | 'line'>>(
    () => ({
      labels: top8Compagnies.map((g) => g.compagnie),
      datasets: [
        {
          type: 'bar',
          label: 'Nb contrats',
          data: top8Compagnies.map((g) => g.contrats),
          backgroundColor: '#1D9E75',
          borderRadius: 4,
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line',
          label: 'PM moyen (€)',
          // Null au lieu de 0 quand PM inconnu → la courbe ne retombe pas
          // à zéro sur ces points (évite le faux "désalignement" visuel)
          data: top8Compagnies.map((g) =>
            g.pmMoyen > 0 ? Math.round(g.pmMoyen) : null,
          ),
          borderColor: '#BA7517',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#BA7517',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y2',
          tension: 0.3,
          spanGaps: true,
          order: 1,
        },
      ],
    }),
    [top8Compagnies],
  )

  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        title: { display: true, text: 'Nb contrats' },
      },
      y2: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => `${v}€` },
        title: { display: true, text: 'PM moyen' },
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
          Répartition des contrats par produit, formule et compagnie.
        </p>
      </div>

      {/* KPIs : Top produit / formule / compagnie + Nb produits */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <KpiTop
          label="Top produit"
          value={topProduit?.produit ?? '—'}
          hint={topProduit ? `${fmt(topProduit.contrats)} contrats` : ''}
          color="#1D9E75"
        />
        <KpiTop
          label="Top formule"
          value={topFormule?.formule ?? '—'}
          hint={
            topFormule
              ? `${topFormule.produit}${topFormule.compagnie ? ` · ${topFormule.compagnie}` : ''}`
              : ''
          }
          color="#378ADD"
        />
        <KpiTop
          label="Top compagnie"
          value={topCompagnie?.compagnie ?? '—'}
          hint={topCompagnie ? `${fmt(topCompagnie.nb)} contrats` : ''}
          color="#BA7517"
        />
        <KpiTop
          label="Nb produits"
          value={byProduit.length.toString()}
          hint={`${byFormule.length} formules distinctes`}
        />
      </div>

      <Card title="Top 8 compagnies — volume × PM">
        <div style={{ height: 320 }}>
          {top8Compagnies.length > 0 ? (
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
              <th style={th}>Compagnies</th>
              <th style={th}>Nb</th>
              <th style={{ ...th, textAlign: 'right' }}>Part</th>
              <th style={{ ...th, textAlign: 'right' }}>PM moyen</th>
              <th style={{ ...th, textAlign: 'right' }}>CA mensuel</th>
            </tr>
          </thead>
          <tbody>
            {byProduit.map((g) => (
              <tr key={g.produit} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, color: '#0f172a', fontWeight: 500 }}>
                  {g.produit}
                </td>
                <td style={{ ...td, color: '#64748b' }}>
                  {g.compagnies.length > 0 ? g.compagnies.join(', ') : '—'}
                </td>
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

      <Card title="Détail par formule">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>
              <th style={th}>Produit</th>
              <th style={th}>Formule</th>
              <th style={th}>Compagnie</th>
              <th style={th}>Nb</th>
              <th style={{ ...th, textAlign: 'right' }}>Part</th>
              <th style={{ ...th, textAlign: 'right' }}>PM moyen</th>
            </tr>
          </thead>
          <tbody>
            {byFormule.map((f, i) => (
              <tr
                key={`${f.produit}-${f.formule}-${f.compagnie ?? ''}-${i}`}
                style={{ borderTop: '1px solid #f1f5f9' }}
              >
                <td style={{ ...td, color: '#475569' }}>{f.produit}</td>
                <td style={{ ...td, color: '#0f172a', fontWeight: 500 }}>
                  {f.formule}
                </td>
                <td style={{ ...td, color: '#64748b' }}>
                  {f.compagnie ?? '—'}
                </td>
                <td style={{ ...td, color: '#1D9E75', fontWeight: 600 }}>
                  {f.contrats}
                </td>
                <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
                  {f.pctContrats.toFixed(1)}%
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    color: pmColor(f.pmMoyen),
                    fontWeight: 600,
                  }}
                >
                  {f.pmMoyen > 0 ? `${f.pmMoyen.toFixed(0)}€` : '—'}
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

interface KpiTopProps {
  label: string
  value: string
  hint?: string
  color?: string
}

function KpiTop({ label, value, hint, color }: KpiTopProps) {
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
          fontSize: 18,
          fontWeight: 700,
          margin: '6px 0 4px',
          color: color ?? '#0f172a',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={value}
      >
        {value}
      </div>
      {hint && (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>
      )}
    </div>
  )
}

export default Gammes
