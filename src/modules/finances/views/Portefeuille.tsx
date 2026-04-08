import { useMemo, useState } from 'react'
import { usePortefeuille } from '../hooks/usePortefeuille'
import type { PortefeuilleRow } from '../types'

const COMMERCIAUX = ['Charlotte', 'Cheyenne', 'Mariam', 'Christopher'] as const
type Commercial = (typeof COMMERCIAUX)[number] | 'Tous'

const COMM_COLORS: Record<string, string> = {
  Charlotte: '#378ADD',
  Cheyenne: '#BA7517',
  Mariam: '#534AB7',
  Christopher: '#1D9E75',
  Tous: '#64748b',
}

const COMM_BG: Record<string, string> = {
  Charlotte: '#dbeafe',
  Cheyenne: '#fef3c7',
  Mariam: '#ede9fe',
  Christopher: '#dcfce7',
}

function fmtEur(n: number): string {
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return (
      String(d.getDate()).padStart(2, '0') +
      '/' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '/' +
      d.getFullYear()
    )
  } catch {
    return iso
  }
}

interface PortefeuilleKpis {
  commercial: string
  nb_contrats: number
  cotisation_totale: number
  com_lineaire_mensuelle: number
  com_lineaire_annuelle: number
}

function buildKpis(commercial: string, rows: PortefeuilleRow[]): PortefeuilleKpis {
  return rows.reduce<PortefeuilleKpis>(
    (acc, r) => ({
      commercial,
      nb_contrats: acc.nb_contrats + 1,
      cotisation_totale: acc.cotisation_totale + r.cotisation_mensuelle,
      com_lineaire_mensuelle:
        acc.com_lineaire_mensuelle + r.com_lineaire_mensuelle,
      com_lineaire_annuelle:
        acc.com_lineaire_annuelle + r.com_lineaire_annuelle,
    }),
    {
      commercial,
      nb_contrats: 0,
      cotisation_totale: 0,
      com_lineaire_mensuelle: 0,
      com_lineaire_annuelle: 0,
    },
  )
}

function Portefeuille() {
  const { rows, loading, error } = usePortefeuille()
  const [selected, setSelected] = useState<Commercial>('Tous')

  // Toutes les KPIs par commercial pour le mode "Tous"
  const allKpis = useMemo<PortefeuilleKpis[]>(() => {
    return COMMERCIAUX.map((c) =>
      buildKpis(
        c,
        rows.filter((r) => r.commercial_prenom === c),
      ),
    )
  }, [rows])

  // Lignes filtrées selon sélection
  const filtered = useMemo<PortefeuilleRow[]>(() => {
    if (selected === 'Tous') return rows
    return rows.filter((r) => r.commercial_prenom === selected)
  }, [rows, selected])

  // KPIs du commercial sélectionné
  const selectedKpis = useMemo<PortefeuilleKpis | null>(() => {
    if (selected === 'Tous') return null
    return buildKpis(selected, filtered)
  }, [filtered, selected])

  // Groupement par compagnie pour le tableau (mode commercial unique)
  interface CompagnieGroup {
    compagnie: string
    rows: PortefeuilleRow[]
    nb: number
    cotisation: number
    com_mensuelle: number
    com_annuelle: number
  }
  const groupes = useMemo<CompagnieGroup[]>(() => {
    if (selected === 'Tous') return []
    const map = new Map<string, CompagnieGroup>()
    for (const r of filtered) {
      const cie = r.compagnie_assureur ?? '—'
      const ex = map.get(cie) ?? {
        compagnie: cie,
        rows: [],
        nb: 0,
        cotisation: 0,
        com_mensuelle: 0,
        com_annuelle: 0,
      }
      ex.rows.push(r)
      ex.nb += 1
      ex.cotisation += r.cotisation_mensuelle
      ex.com_mensuelle += r.com_lineaire_mensuelle
      ex.com_annuelle += r.com_lineaire_annuelle
      map.set(cie, ex)
    }
    // Tri compagnies par nb de contrats DESC, et lignes internes par
    // cotisation DESC
    const arr = Array.from(map.values()).sort((a, b) => b.nb - a.nb)
    for (const g of arr) {
      g.rows.sort((a, b) => b.cotisation_mensuelle - a.cotisation_mensuelle)
    }
    return arr
  }, [filtered, selected])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          Portefeuille — Commissionnement linéaire
        </h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Contrats récurrents validés. Commissionnement linéaire 10% sur
          renouvellements annuels.
        </p>
      </div>

      {/* Pills sélecteur commercial */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {(['Tous', ...COMMERCIAUX] as const).map((c) => {
          const active = selected === c
          const col = COMM_COLORS[c] ?? '#64748b'
          return (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${active ? col : '#d1d5db'}`,
                cursor: 'pointer',
                background: active ? col : 'transparent',
                color: active ? '#fff' : col,
                borderRadius: 6,
              }}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Mode Tous : grid 2x2 mini-cards par commercial */}
      {selected === 'Tous' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {allKpis.map((k) => {
            const col = COMM_COLORS[k.commercial] ?? '#64748b'
            const bg = COMM_BG[k.commercial] ?? '#f3f4f6'
            return (
              <div
                key={k.commercial}
                style={{
                  background: bg,
                  border: `1px solid ${col}30`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: col,
                    marginBottom: 10,
                  }}
                >
                  {k.commercial}
                </div>
                <MiniKpi
                  label="Contrats actifs"
                  value={String(k.nb_contrats)}
                  primary
                />
                <MiniKpi
                  label="Cotisation totale"
                  value={`${fmtEur(k.cotisation_totale)}/m`}
                />
                <MiniKpi
                  label="Com. mensuelle"
                  value={fmtEur(k.com_lineaire_mensuelle)}
                />
                <MiniKpi
                  label="Com. annuelle"
                  value={fmtEur(k.com_lineaire_annuelle)}
                  highlight
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Mode commercial unique */}
      {selectedKpis && (
        <>
          {/* 4 KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
            }}
          >
            <Kpi
              label="Contrats actifs"
              value={String(selectedKpis.nb_contrats)}
              color={COMM_COLORS[selected] ?? '#0f172a'}
            />
            <Kpi
              label="Cotisation totale"
              value={`${fmtEur(selectedKpis.cotisation_totale)}/m`}
              hint="Mensuelle cumulée"
            />
            <Kpi
              label="Com. linéaire mensuelle"
              value={fmtEur(selectedKpis.com_lineaire_mensuelle)}
              hint="10% des cotisations"
              color="#00C18B"
            />
            <Kpi
              label="Com. linéaire annuelle"
              value={fmtEur(selectedKpis.com_lineaire_annuelle)}
              hint="× 12 mois"
              color="#00C18B"
            />
          </div>

          {/* Détail par compagnie */}
          {groupes.length === 0 ? (
            <Card title="Détail par compagnie">
              <Empty label="Aucun contrat dans le portefeuille." />
            </Card>
          ) : (
            groupes.map((g) => (
              <Card
                key={g.compagnie}
                title={`${g.compagnie} — ${g.nb} contrat${g.nb > 1 ? 's' : ''}`}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    marginBottom: 10,
                  }}
                >
                  Cotisation totale :{' '}
                  <strong
                    style={{
                      color: '#0f172a',
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, monospace",
                    }}
                  >
                    {fmtEur(g.cotisation)}/m
                  </strong>{' '}
                  · Com. mensuelle :{' '}
                  <strong
                    style={{
                      color: '#00C18B',
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, monospace",
                    }}
                  >
                    {fmtEur(g.com_mensuelle)}
                  </strong>{' '}
                  · Annuelle :{' '}
                  <strong
                    style={{
                      color: '#00C18B',
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, monospace",
                    }}
                  >
                    {fmtEur(g.com_annuelle)}
                  </strong>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr style={trHead}>
                        <th style={th}>Client</th>
                        <th style={th}>Date effet</th>
                        <th style={{ ...th, textAlign: 'right' }}>
                          Cotisation
                        </th>
                        <th style={{ ...th, textAlign: 'right' }}>
                          Com. mensuelle
                        </th>
                        <th style={{ ...th, textAlign: 'right' }}>
                          Com. annuelle
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr
                          key={r.contrat_id}
                          style={{ borderTop: '1px solid #f1f5f9' }}
                        >
                          <td
                            style={{
                              ...td,
                              fontWeight: 600,
                              color: '#0f172a',
                            }}
                          >
                            {r.client}
                          </td>
                          <td
                            style={{
                              ...td,
                              color: '#94a3b8',
                              fontFamily:
                                "'JetBrains Mono', ui-monospace, monospace",
                              fontSize: 11,
                            }}
                          >
                            {fmtDate(r.date_effet)}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'right',
                              fontFamily:
                                "'JetBrains Mono', ui-monospace, monospace",
                              color: '#475569',
                            }}
                          >
                            {fmtEur(r.cotisation_mensuelle)}/m
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'right',
                              fontFamily:
                                "'JetBrains Mono', ui-monospace, monospace",
                              color: '#00C18B',
                              fontWeight: 600,
                            }}
                          >
                            {fmtEur(r.com_lineaire_mensuelle)}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'right',
                              fontFamily:
                                "'JetBrains Mono', ui-monospace, monospace",
                              color: '#00C18B',
                              fontWeight: 700,
                            }}
                          >
                            {fmtEur(r.com_lineaire_annuelle)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))
          )}
        </>
      )}
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

function MiniKpi({
  label,
  value,
  primary,
  highlight,
}: {
  label: string
  value: string
  primary?: boolean
  highlight?: boolean
}) {
  const color = highlight ? '#00C18B' : primary ? '#0f172a' : '#475569'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: primary ? 16 : 12,
          fontWeight: primary || highlight ? 700 : 600,
          color,
        }}
      >
        {value}
      </span>
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

export default Portefeuille
