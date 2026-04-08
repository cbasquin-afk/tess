import { useMemo } from 'react'
import { useStats } from '../hooks/useStats'
import { usePersonae } from '../hooks/usePersonae'
import { TRANCHES_ORDER } from '../hooks/useAges'
import type {
  PersonaDeptStats,
  PersonaGroup,
  RegimeGroupe,
} from '../types'

const GROUPE_COLOR: Record<RegimeGroupe, string> = {
  SECU: '#378ADD',
  MSA: '#BA7517',
  TNS: '#534AB7',
  ALSMO: '#D85A30',
  Autre: '#888780',
}
const GROUPES: RegimeGroupe[] = ['SECU', 'MSA', 'TNS', 'ALSMO']

function txCellColor(tx: number): string {
  if (tx >= 15) return '#1D9E75'
  if (tx >= 8) return '#BA7517'
  return '#E24B4A'
}

function Personae() {
  const { leads, contrats, loading, error } = useStats()
  const { groups, deptAge } = usePersonae(leads, contrats)

  // Top 3 par taux de conversion (≥ 3 contrats pour signifiance)
  const top3Conv = useMemo(
    () =>
      groups
        .filter((p) => p.totalContrats >= 3)
        .sort((a, b) => b.txConversion - a.txConversion)
        .slice(0, 3),
    [groups],
  )

  // Top 3 par volume de contrats
  const top3Volume = useMemo(
    () => [...groups].sort((a, b) => b.totalContrats - a.totalContrats).slice(0, 3),
    [groups],
  )

  const top5 = useMemo(
    () =>
      groups
        .filter((p) => p.totalContrats >= 3)
        .sort((a, b) => b.txConversion - a.txConversion)
        .slice(0, 5),
    [groups],
  )
  const flop5 = useMemo(
    () =>
      groups
        .filter((p) => p.totalLeads >= 10)
        .sort((a, b) => a.txConversion - b.txConversion)
        .slice(0, 5),
    [groups],
  )

  // Heatmap : tranche × groupe avec >= 3 leads
  const heatmap = useMemo(() => {
    const m = new Map<string, PersonaGroup>()
    for (const p of groups) m.set(`${p.groupe}|${p.trancheAge}`, p)
    return m
  }, [groups])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Personae</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Profils tranches d'âge × régime — repérer les segments qui convertissent.
        </p>
      </div>

      <MedalCards
        title="Top 3 — Meilleur taux de conversion"
        subtitle="Segments avec ≥ 3 contrats, triés par tx desc"
        rows={top3Conv}
      />
      <MedalCards
        title="Top 3 — Plus grand volume de contrats"
        subtitle="Tous segments confondus, triés par nb contrats desc"
        rows={top3Volume}
      />

      <PersonaTable
        title="🥇 Top 5 — Profils qui convertissent le mieux"
        rows={top5}
      />
      <PersonaTable
        title="🛑 Top 5 — Profils difficiles (≥ 10 leads)"
        rows={flop5}
      />

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>
          Heatmap tranche × régime (tx conversion)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              fontSize: 12,
              minWidth: 460,
            }}
          >
            <thead>
              <tr>
                <th style={hth}></th>
                {GROUPES.map((g) => (
                  <th
                    key={g}
                    style={{
                      ...hth,
                      color: GROUPE_COLOR[g],
                      textAlign: 'center',
                    }}
                  >
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANCHES_ORDER.map((t) => (
                <tr key={t}>
                  <td
                    style={{
                      padding: '8px 12px 8px 0',
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    {t}
                  </td>
                  {GROUPES.map((g) => {
                    const p = heatmap.get(`${g}|${t}`)
                    if (!p || p.totalLeads < 3) {
                      return (
                        <td
                          key={g}
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            color: '#cbd5e1',
                          }}
                        >
                          —
                        </td>
                      )
                    }
                    const col = txCellColor(p.txConversion)
                    return (
                      <td
                        key={g}
                        style={{
                          padding: '8px',
                          textAlign: 'center',
                          background: `${col}15`,
                          color: col,
                          fontWeight: 700,
                          border: '1px solid #f1f5f9',
                        }}
                        title={`${p.totalContrats} / ${p.totalLeads} leads`}
                      >
                        {p.txConversion.toFixed(0)}%
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
          Cellules avec ≥ 3 leads uniquement. Vert ≥ 15%, orange ≥ 8%, rouge &lt; 8%.
        </div>
      </div>

      <DeptAgeTable rows={deptAge} />
    </div>
  )
}

function PersonaTable({ title, rows }: { title: string; rows: PersonaGroup[] }) {
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
      {rows.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>
          Pas assez de données.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Groupe</th>
              <th style={th}>Tranche</th>
              <th style={{ ...th, textAlign: 'right' }}>Leads</th>
              <th style={{ ...th, textAlign: 'right' }}>Contrats</th>
              <th style={{ ...th, textAlign: 'right' }}>Tx conv</th>
              <th style={{ ...th, textAlign: 'right' }}>PM moyen</th>
              <th style={th}>Top produit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const col = GROUPE_COLOR[r.groupe]
              return (
                <tr key={r.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: `${col}20`,
                        color: col,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {r.groupe}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>
                    {r.trancheAge}
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
                    {r.totalLeads}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: '#1D9E75',
                      fontWeight: 600,
                    }}
                  >
                    {r.totalContrats}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: txCellColor(r.txConversion),
                      fontWeight: 700,
                    }}
                  >
                    {r.txConversion.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: r.pmMoyen >= 100 ? '#1D9E75' : '#64748b',
                    }}
                  >
                    {r.pmMoyen > 0 ? `${r.pmMoyen.toFixed(0)}€` : '—'}
                  </td>
                  <td style={{ ...td, color: '#94a3b8', fontSize: 11 }}>
                    {r.topProduit
                      ? `${r.topProduit}${r.topFormule ? ` · ${r.topFormule}` : ''}`
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── MedalCards (Top 3 medals) ────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉'] as const

interface MedalCardsProps {
  title: string
  subtitle?: string
  rows: PersonaGroup[]
}

function MedalCards({ title, subtitle, rows }: MedalCardsProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        {subtitle && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
          Pas assez de données pour ce classement.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {rows.slice(0, 3).map((r, i) => (
            <MedalCard key={r.key} row={r} medal={MEDALS[i] ?? ''} />
          ))}
        </div>
      )}
    </div>
  )
}

function MedalCard({ row, medal }: { row: PersonaGroup; medal: string }) {
  const col = GROUPE_COLOR[row.groupe]
  const txCol = txCellColor(row.txConversion)
  return (
    <div
      style={{
        border: `1px solid ${col}30`,
        borderRadius: 12,
        padding: 16,
        background: `${col}08`,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 14,
          fontSize: 22,
        }}
      >
        {medal}
      </div>
      <div
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          background: `${col}20`,
          color: col,
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 12,
          marginBottom: 8,
        }}
      >
        {row.groupe}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: 2,
        }}
      >
        {row.trancheAge} ans
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
        {row.totalContrats} contrats · {row.totalLeads} leads
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: row.topProduit ? 10 : 0,
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 6,
            padding: 8,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: txCol,
              lineHeight: 1.2,
            }}
          >
            {row.txConversion.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>Tx conversion</div>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 6,
            padding: 8,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: row.pmMoyen >= 100 ? '#1D9E75' : '#64748b',
              lineHeight: 1.2,
            }}
          >
            {row.pmMoyen > 0 ? `${row.pmMoyen.toFixed(0)}€` : '—'}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>PM moyen</div>
        </div>
      </div>
      {row.topProduit && (
        <div
          style={{
            paddingTop: 10,
            borderTop: '1px solid #f1f5f9',
            fontSize: 11,
          }}
        >
          <div style={{ color: '#94a3b8', marginBottom: 2 }}>
            Produit phare
          </div>
          <div style={{ color: '#475569', fontWeight: 600 }}>
            {row.topProduit}
          </div>
          {row.topFormule && (
            <div style={{ color: '#94a3b8' }}>
              {row.topFormule}
              {row.topCompagnie ? ` · ${row.topCompagnie}` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── DeptAgeTable ────────────────────────────────────────────
function DeptAgeTable({ rows }: { rows: PersonaDeptStats[] }) {
  return (
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
          Top segments département × tranche d'âge
        </h3>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          Min 5 leads et 2 contrats par segment · top 30 par tx conversion desc
        </div>
      </div>
      {rows.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
          Pas de segment significatif (≥ 5 leads et ≥ 2 contrats).
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
          >
            <thead>
              <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                <th style={th}>Dépt.</th>
                <th style={th}>Tranche</th>
                <th style={{ ...th, textAlign: 'right' }}>Leads</th>
                <th style={{ ...th, textAlign: 'right' }}>Contrats</th>
                <th style={{ ...th, textAlign: 'right' }}>Tx conv</th>
                <th style={{ ...th, textAlign: 'right' }}>PM moyen</th>
                <th style={th}>Top produit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 700, color: '#0f172a' }}>
                    Dép. {r.dept}
                  </td>
                  <td style={{ ...td, color: '#475569' }}>{r.trancheAge}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#94a3b8' }}>
                    {r.totalLeads}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: '#1D9E75',
                      fontWeight: 600,
                    }}
                  >
                    {r.totalContrats}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: txCellColor(r.txConversion),
                      fontWeight: 700,
                    }}
                  >
                    {r.txConversion.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: r.pmMoyen >= 100 ? '#1D9E75' : '#64748b',
                    }}
                  >
                    {r.pmMoyen > 0 ? `${r.pmMoyen.toFixed(0)}€` : '—'}
                  </td>
                  <td style={{ ...td, color: '#94a3b8', fontSize: 11 }}>
                    {r.topProduit ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }
const hth: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #e5e7eb',
}

export default Personae
