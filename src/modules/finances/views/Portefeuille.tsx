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

// Calcule l'année/mois "prochain mois" en local
function nextMonth(): { annee: number; mois: number } {
  const now = new Date()
  let annee = now.getFullYear()
  let mois = now.getMonth() + 2 // 1-indexed → mois prochain
  if (mois > 12) {
    mois = 1
    annee += 1
  }
  return { annee, mois }
}

interface PortefeuilleKpis {
  commercial: string
  nb_contrats: number
  cotisation_totale: number
  com_societe_totale: number
  com_mandataire_totale: number
  com_societe_prochain_mois: number
  com_mandataire_prochain_mois: number
}

function buildKpis(
  commercial: string,
  rows: PortefeuilleRow[],
): PortefeuilleKpis {
  const next = nextMonth()

  // Contrats distincts + cotisation par contrat unique (1 fois par contrat)
  const cotisationParContrat = new Map<string, number>()
  for (const r of rows) {
    if (!cotisationParContrat.has(r.contrat_id)) {
      cotisationParContrat.set(r.contrat_id, r.cotisation_mensuelle ?? 0)
    }
  }
  const nb_contrats = cotisationParContrat.size
  const cotisation_totale = Array.from(cotisationParContrat.values()).reduce(
    (s, v) => s + v,
    0,
  )

  // Totaux sur toute la durée prévue
  let com_societe_totale = 0
  let com_mandataire_totale = 0
  let com_societe_prochain_mois = 0
  let com_mandataire_prochain_mois = 0

  for (const r of rows) {
    com_societe_totale += r.com_societe
    com_mandataire_totale += r.com_mandataire
    if (r.annee === next.annee && r.mois === next.mois) {
      com_societe_prochain_mois += r.com_societe
      com_mandataire_prochain_mois += r.com_mandataire
    }
  }

  return {
    commercial,
    nb_contrats,
    cotisation_totale,
    com_societe_totale,
    com_mandataire_totale,
    com_societe_prochain_mois,
    com_mandataire_prochain_mois,
  }
}

interface ContratSummary {
  contrat_id: string
  client: string
  date_effet: string | null
  cotisation_mensuelle: number | null
  nb_mois: number
  com_societe_totale: number
  com_mandataire_totale: number
  com_societe_prochain_mois: number
  com_mandataire_prochain_mois: number
}

interface CompagnieGroup {
  compagnie: string
  contrats: ContratSummary[]
  nb_contrats: number
  cotisation_totale: number
  com_mandataire_totale: number
  com_mandataire_prochain_mois: number
}

function Portefeuille() {
  const { rows, loading, error } = usePortefeuille()
  const [selected, setSelected] = useState<Commercial>('Tous')

  // KPIs par commercial pour le mode "Tous"
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

  // Groupement par compagnie → par contrat distinct (mode commercial unique)
  const groupes = useMemo<CompagnieGroup[]>(() => {
    if (selected === 'Tous') return []
    const next = nextMonth()

    // Phase 1 : agréger par contrat (sum sur tous les mois prévus)
    const byContrat = new Map<string, ContratSummary>()
    const contratCompagnie = new Map<string, string>()

    for (const r of filtered) {
      contratCompagnie.set(r.contrat_id, r.compagnie_assureur ?? '—')
      const ex = byContrat.get(r.contrat_id) ?? {
        contrat_id: r.contrat_id,
        client: r.client,
        date_effet: r.date_effet,
        cotisation_mensuelle: r.cotisation_mensuelle,
        nb_mois: 0,
        com_societe_totale: 0,
        com_mandataire_totale: 0,
        com_societe_prochain_mois: 0,
        com_mandataire_prochain_mois: 0,
      }
      ex.nb_mois += 1
      ex.com_societe_totale += r.com_societe
      ex.com_mandataire_totale += r.com_mandataire
      if (r.annee === next.annee && r.mois === next.mois) {
        ex.com_societe_prochain_mois += r.com_societe
        ex.com_mandataire_prochain_mois += r.com_mandataire
      }
      byContrat.set(r.contrat_id, ex)
    }

    // Phase 2 : grouper les contrats par compagnie
    const byCompagnie = new Map<string, CompagnieGroup>()
    for (const [contratId, summary] of byContrat.entries()) {
      const cie = contratCompagnie.get(contratId) ?? '—'
      const ex = byCompagnie.get(cie) ?? {
        compagnie: cie,
        contrats: [],
        nb_contrats: 0,
        cotisation_totale: 0,
        com_mandataire_totale: 0,
        com_mandataire_prochain_mois: 0,
      }
      ex.contrats.push(summary)
      ex.nb_contrats += 1
      ex.cotisation_totale += summary.cotisation_mensuelle ?? 0
      ex.com_mandataire_totale += summary.com_mandataire_totale
      ex.com_mandataire_prochain_mois += summary.com_mandataire_prochain_mois
      byCompagnie.set(cie, ex)
    }

    // Tri compagnies par nb DESC, contrats internes par cotisation DESC
    const arr = Array.from(byCompagnie.values()).sort(
      (a, b) => b.nb_contrats - a.nb_contrats,
    )
    for (const g of arr) {
      g.contrats.sort(
        (a, b) =>
          (b.cotisation_mensuelle ?? 0) - (a.cotisation_mensuelle ?? 0),
      )
    }
    return arr
  }, [filtered, selected])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          Portefeuille — Renouvellements prévus
        </h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Commissions de renouvellement prévues sur le portefeuille actif
          (source : moteur de calcul Supabase).
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

      {/* Mode Tous : grid mini-cards par commercial */}
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
                  label="Com. mois prochain"
                  value={fmtEur(k.com_mandataire_prochain_mois)}
                  highlight
                />
                <MiniKpi
                  label="Projection totale"
                  value={fmtEur(k.com_mandataire_totale)}
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
              label="Com. mois prochain (société)"
              value={fmtEur(selectedKpis.com_societe_prochain_mois)}
              hint="Renouvellements à venir"
              color="#00C18B"
            />
            <Kpi
              label="Com. mois prochain (mandataire)"
              value={fmtEur(selectedKpis.com_mandataire_prochain_mois)}
              hint="Part mandataire"
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
                title={`${g.compagnie} — ${g.nb_contrats} contrat${g.nb_contrats > 1 ? 's' : ''}`}
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
                    {fmtEur(g.cotisation_totale)}/m
                  </strong>{' '}
                  · Com. mandataire totale :{' '}
                  <strong
                    style={{
                      color: '#00C18B',
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, monospace",
                    }}
                  >
                    {fmtEur(g.com_mandataire_totale)}
                  </strong>{' '}
                  · Mois prochain :{' '}
                  <strong
                    style={{
                      color: '#00C18B',
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, monospace",
                    }}
                  >
                    {fmtEur(g.com_mandataire_prochain_mois)}
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
                          Nb mois prévus
                        </th>
                        <th style={{ ...th, textAlign: 'right' }}>
                          Com. mandataire totale
                        </th>
                        <th style={{ ...th, textAlign: 'right' }}>
                          Com. mois N+1
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.contrats.map((c) => (
                        <tr
                          key={c.contrat_id}
                          style={{ borderTop: '1px solid #f1f5f9' }}
                        >
                          <td
                            style={{
                              ...td,
                              fontWeight: 600,
                              color: '#0f172a',
                            }}
                          >
                            {c.client}
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
                            {fmtDate(c.date_effet)}
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
                            {c.cotisation_mensuelle
                              ? `${fmtEur(c.cotisation_mensuelle)}/m`
                              : '—'}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'right',
                              color: '#94a3b8',
                              fontSize: 11,
                            }}
                          >
                            {c.nb_mois}
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
                            {fmtEur(c.com_mandataire_totale)}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'right',
                              fontFamily:
                                "'JetBrains Mono', ui-monospace, monospace",
                              color:
                                c.com_mandataire_prochain_mois > 0
                                  ? '#00C18B'
                                  : '#cbd5e1',
                            }}
                          >
                            {c.com_mandataire_prochain_mois > 0
                              ? fmtEur(c.com_mandataire_prochain_mois)
                              : '—'}
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
          fontSize: 22,
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
