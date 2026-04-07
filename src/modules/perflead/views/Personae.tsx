import { useMemo } from 'react'
import { useStats } from '../hooks/useStats'
import { usePersonae } from '../hooks/usePersonae'
import { TRANCHES_ORDER } from '../hooks/useAges'
import type { PersonaGroup, RegimeGroupe } from '../types'

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
  const personae = usePersonae(leads, contrats)

  const top5 = useMemo(
    () =>
      personae
        .filter((p) => p.totalContrats >= 3)
        .sort((a, b) => b.txConversion - a.txConversion)
        .slice(0, 5),
    [personae],
  )
  const flop5 = useMemo(
    () =>
      personae
        .filter((p) => p.totalLeads >= 10)
        .sort((a, b) => a.txConversion - b.txConversion)
        .slice(0, 5),
    [personae],
  )

  // Heatmap : tranche × groupe avec >= 3 leads
  const heatmap = useMemo(() => {
    const m = new Map<string, PersonaGroup>()
    for (const p of personae) m.set(`${p.groupe}|${p.trancheAge}`, p)
    return m
  }, [personae])

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
