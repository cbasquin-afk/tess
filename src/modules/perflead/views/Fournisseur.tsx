import { useMemo } from 'react'
import { format, parseISO, startOfISOWeek } from 'date-fns'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
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
import type { Lead } from '../types'

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
)

const NRP_STATUTS = new Set([
  'Ne répond pas',
  'Lead de plus de 30 jours',
  'Raccroche au nez',
])
const INEXPLOITABLE_STATUTS = new Set([
  'Inexploitable (Faux numéro)',
  'Inexploitable (Numéro non attribué)',
])

const CAT_COLORS: Record<string, string> = {
  Contrat: '#1D9E75',
  'En cours': '#378ADD',
  NRP: '#BA7517',
  Perdu: '#A32D2D',
  Inexploitable: '#888780',
  Rétracté: '#5F5E5A',
}

const SERIES_COLORS = {
  total: '#94a3b8',
  contrats: '#1D9E75',
  enCours: '#378ADD',
  nrp: '#BA7517',
  perdu: '#E24B4A',
  inexploitable: '#888780',
} as const

const MAX_WEEKS = 13
const MAX_TABLE_ROWS = 500

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return iso
  }
}

function isLeadByteFournisseur(l: Lead): boolean {
  // Fidèle à render-fournisseur.js : leads MapApp Digital avec leadbyte_id
  if (!l.leadbyte_id) return false
  return l.origine === 'MapApp Digital' || !l.origine
}

// ── Helpers export ──────────────────────────────────────────
const EXPORT_HEADERS = [
  'ID Leadbyte',
  'Statut',
  'Catégorie',
  'Commercial',
  'Tranche',
  'Date création',
] as const

function leadToRow(l: Lead): string[] {
  return [
    l.leadbyte_id ?? '',
    l.statut ?? '',
    l.categorie ?? '',
    (l.attribution ?? '').split(' ')[0] ?? '',
    l.tranche_age ?? '',
    l.date_creation?.slice(0, 10) ?? '',
  ]
}

function escapeCsv(v: string): string {
  return v.includes(',') || v.includes('"') || v.includes('\n')
    ? `"${v.replace(/"/g, '""')}"`
    : v
}

function exportCSV(rows: Lead[], filename: string): void {
  const lines = [
    EXPORT_HEADERS.join(','),
    ...rows.map((l) => leadToRow(l).map(escapeCsv).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function copyTSV(rows: Lead[]): Promise<void> {
  const lines = [
    EXPORT_HEADERS.join('\t'),
    ...rows.map((l) => leadToRow(l).join('\t')),
  ]
  await navigator.clipboard.writeText(lines.join('\n'))
}

// ── Composant principal ─────────────────────────────────────
function Fournisseur() {
  const { leads, contrats, loading, error } = useStats()

  const fournLeads = useMemo(
    () => leads.filter(isLeadByteFournisseur),
    [leads],
  )

  const kpis = useMemo(() => {
    const nbT = fournLeads.length
    const nbC = fournLeads.filter((l) => l.categorie === 'Contrat').length
    const nbEC = fournLeads.filter((l) => l.categorie === 'En cours').length
    const nbNRP = fournLeads.filter((l) => NRP_STATUTS.has(l.statut)).length
    const nbInex = fournLeads.filter((l) =>
      INEXPLOITABLE_STATUTS.has(l.statut),
    ).length

    const contratsIds = new Set(
      fournLeads
        .filter((l) => l.categorie === 'Contrat')
        .map((l) => l.identifiant_projet),
    )
    const pmVals = contrats
      .filter(
        (c) =>
          contratsIds.has(c.identifiant_projet) &&
          c.prime_brute_mensuelle &&
          c.prime_brute_mensuelle > 0,
      )
      .map((c) => c.prime_brute_mensuelle ?? 0)

    const pmMoyen = pmVals.length
      ? pmVals.reduce((a, b) => a + b, 0) / pmVals.length
      : 0

    return {
      nbT,
      nbC,
      nbEC,
      nbNRP,
      nbInex,
      pmMoyen,
      txConv: nbT > 0 ? (nbC / nbT) * 100 : 0,
      pctEC: nbT > 0 ? (nbEC / nbT) * 100 : 0,
      pctNRP: nbT > 0 ? (nbNRP / nbT) * 100 : 0,
      pctInex: nbT > 0 ? (nbInex / nbT) * 100 : 0,
    }
  }, [fournLeads, contrats])

  // ── Chart hebdo : 6 séries sur les 13 dernières semaines ──
  const weeklyData = useMemo(() => {
    interface Bucket {
      weekKey: string
      weekDate: Date
      total: number
      contrats: number
      enCours: number
      nrp: number
      perdu: number
      inexploitable: number
    }
    const byWeek = new Map<string, Bucket>()

    for (const l of fournLeads) {
      if (!l.date_creation) continue
      let monday: Date
      try {
        monday = startOfISOWeek(parseISO(l.date_creation.slice(0, 10)))
      } catch {
        continue
      }
      const weekKey = format(monday, 'yyyy-MM-dd')
      let b = byWeek.get(weekKey)
      if (!b) {
        b = {
          weekKey,
          weekDate: monday,
          total: 0,
          contrats: 0,
          enCours: 0,
          nrp: 0,
          perdu: 0,
          inexploitable: 0,
        }
        byWeek.set(weekKey, b)
      }
      b.total += 1
      // Ordre fidèle au natif : Contrat / En cours / NRP / Perdu / Inexpl.
      if (l.categorie === 'Contrat') b.contrats += 1
      else if (l.categorie === 'En cours') b.enCours += 1
      else if (NRP_STATUTS.has(l.statut)) b.nrp += 1
      else if (l.categorie === 'Perdu') b.perdu += 1
      else if (INEXPLOITABLE_STATUTS.has(l.statut)) b.inexploitable += 1
    }

    return Array.from(byWeek.values())
      .sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime())
      .slice(-MAX_WEEKS)
  }, [fournLeads])

  const chartData = useMemo<ChartData<'line'>>(
    () => ({
      labels: weeklyData.map((w) => format(w.weekDate, 'dd/MM')),
      datasets: [
        {
          label: 'Total',
          data: weeklyData.map((w) => w.total),
          borderColor: SERIES_COLORS.total,
          backgroundColor: 'rgba(148, 163, 184, 0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'Contrats',
          data: weeklyData.map((w) => w.contrats),
          borderColor: SERIES_COLORS.contrats,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'En cours',
          data: weeklyData.map((w) => w.enCours),
          borderColor: SERIES_COLORS.enCours,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 2,
        },
        {
          label: 'NRP',
          data: weeklyData.map((w) => w.nrp),
          borderColor: SERIES_COLORS.nrp,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 1.5,
          borderDash: [4, 3],
        },
        {
          label: 'Perdu',
          data: weeklyData.map((w) => w.perdu),
          borderColor: SERIES_COLORS.perdu,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 1.5,
          borderDash: [4, 3],
        },
        {
          label: 'Inexploitable',
          data: weeklyData.map((w) => w.inexploitable),
          borderColor: SERIES_COLORS.inexploitable,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 1.5,
          borderDash: [2, 4],
        },
      ],
    }),
    [weeklyData],
  )

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { beginAtZero: true },
      x: { grid: { display: false } },
    },
    plugins: { legend: { position: 'bottom' } },
  }

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  const visibleRows = fournLeads.slice(0, MAX_TABLE_ROWS)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Fournisseur</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Performances des leads MapApp Digital / LeadByte.
        </p>
      </div>

      {/* 6 KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi label="Leads fournisseur" value={fmt(kpis.nbT)} />
        <Kpi
          label="Tx conversion"
          value={kpis.nbT > 0 ? `${kpis.txConv.toFixed(1)}%` : '—'}
          color={kpis.txConv >= 12 ? '#1D9E75' : '#E24B4A'}
        />
        <Kpi
          label="En cours"
          value={
            kpis.nbT > 0
              ? `${fmt(kpis.nbEC)} (${kpis.pctEC.toFixed(1)}%)`
              : '—'
          }
          color="#378ADD"
        />
        <Kpi
          label="NRP"
          value={
            kpis.nbT > 0
              ? `${fmt(kpis.nbNRP)} (${kpis.pctNRP.toFixed(1)}%)`
              : '—'
          }
          color="#BA7517"
        />
        <Kpi
          label="Inexploitable"
          value={
            kpis.nbT > 0
              ? `${fmt(kpis.nbInex)} (${kpis.pctInex.toFixed(1)}%)`
              : '—'
          }
          color="#888780"
        />
        <Kpi
          label="PM moyen"
          value={kpis.pmMoyen > 0 ? `${kpis.pmMoyen.toFixed(0)}€` : '—'}
          color={kpis.pmMoyen >= 100 ? '#1D9E75' : '#E24B4A'}
        />
      </div>

      {/* Chart hebdo */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>
            Évolution hebdomadaire — leads fournisseur
          </h3>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            13 dernières semaines avec leads · 6 séries (total + 5 catégories)
          </div>
        </div>
        <div style={{ height: 260 }}>
          {weeklyData.length > 0 ? (
            <Chart type="line" data={chartData} options={chartOptions} />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              Aucune donnée hebdo à afficher.
            </div>
          )}
        </div>
      </div>

      {/* Tableau leads */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 14 }}>Leads fournisseur</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {fmt(fournLeads.length)} leads · {MAX_TABLE_ROWS} max affichés
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                void copyTSV(visibleRows)
              }}
              disabled={visibleRows.length === 0}
              style={btnStyle}
            >
              📋 Copier TSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportCSV(visibleRows, 'leads-fournisseur.csv')
              }
              disabled={visibleRows.length === 0}
              style={btnPrimaryStyle}
            >
              ⬇ Export CSV
            </button>
          </div>
        </div>
        {fournLeads.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            Aucun lead fournisseur sur la période sélectionnée.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
            >
              <thead>
                <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                  <th style={th}>LeadByte ID</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Catégorie</th>
                  <th style={th}>Commercial</th>
                  <th style={th}>Tranche</th>
                  <th style={th}>Date création</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((l) => (
                  <tr
                    key={l.id ?? l.leadbyte_id ?? Math.random()}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td style={{ ...td, fontWeight: 500, color: '#0f172a' }}>
                      {l.leadbyte_id}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>{l.statut}</td>
                    <td style={td}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: CAT_COLORS[l.categorie] ?? '#888780',
                        }}
                      >
                        {l.categorie}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#64748b' }}>
                      {(l.attribution ?? '').split(' ')[0]}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {l.tranche_age ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(l.date_creation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

const btnStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnPrimaryStyle: React.CSSProperties = {
  background: '#1f3a8a',
  border: '1px solid #1f3a8a',
  color: '#fff',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

interface KpiProps {
  label: string
  value: string
  color?: string
}
function Kpi({ label, value, color }: KpiProps) {
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
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 22,
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

export default Fournisseur
