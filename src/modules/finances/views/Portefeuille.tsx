import { useMemo, useState } from 'react'
import { usePortefeuille } from '../hooks/usePortefeuille'
import type { PortefeuilleRow } from '../types'
import { tableStyle, trHead, th, thRight, td, tdMontant, trBody, MONO } from '../styles/tableTokens'

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
    }) + ' \u20ac'
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return '\u2014'
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
  com_societe_24m: number
  com_mandataire_24m: number
  com_societe_mois: number
  com_societe_mois_suivant: number
}

function buildKpis(
  commercial: string,
  rows: PortefeuilleRow[],
): PortefeuilleKpis {
  let cotisation_totale = 0
  let com_societe_24m = 0
  let com_mandataire_24m = 0
  let com_societe_mois = 0
  let com_societe_mois_suivant = 0

  for (const r of rows) {
    cotisation_totale += r.cotisation_mensuelle ?? 0
    com_societe_24m += r.com_societe_24m
    com_mandataire_24m += r.com_mandataire_24m
    com_societe_mois += r.com_societe_mois
    com_societe_mois_suivant += r.com_societe_mois_suivant
  }

  return {
    commercial,
    nb_contrats: rows.length,
    cotisation_totale,
    com_societe_24m,
    com_mandataire_24m,
    com_societe_mois,
    com_societe_mois_suivant,
  }
}

interface ContratSummary {
  contrat_id: string
  client: string
  date_effet: string | null
  cotisation_mensuelle: number | null
  com_societe_24m: number
  com_mandataire_24m: number
  com_societe_mois_suivant: number
}

interface CompagnieGroup {
  compagnie: string
  contrats: ContratSummary[]
  nb_contrats: number
  cotisation_totale: number
  com_mandataire_24m: number
  com_societe_mois_suivant: number
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

  // Lignes filtr\u00e9es selon s\u00e9lection
  const filtered = useMemo<PortefeuilleRow[]>(() => {
    if (selected === 'Tous') return rows
    return rows.filter((r) => r.commercial_prenom === selected)
  }, [rows, selected])

  // KPIs du commercial s\u00e9lectionn\u00e9
  const selectedKpis = useMemo<PortefeuilleKpis | null>(() => {
    if (selected === 'Tous') return null
    return buildKpis(selected, filtered)
  }, [filtered, selected])

  // Groupement par compagnie (mode commercial unique)
  const groupes = useMemo<CompagnieGroup[]>(() => {
    if (selected === 'Tous') return []

    const byCompagnie = new Map<string, CompagnieGroup>()

    for (const r of filtered) {
      const cie = r.compagnie_assureur ?? '\u2014'
      const ex = byCompagnie.get(cie) ?? {
        compagnie: cie,
        contrats: [],
        nb_contrats: 0,
        cotisation_totale: 0,
        com_mandataire_24m: 0,
        com_societe_mois_suivant: 0,
      }
      ex.contrats.push({
        contrat_id: r.contrat_id,
        client: r.client,
        date_effet: r.date_effet,
        cotisation_mensuelle: r.cotisation_mensuelle,
        com_societe_24m: r.com_societe_24m,
        com_mandataire_24m: r.com_mandataire_24m,
        com_societe_mois_suivant: r.com_societe_mois_suivant,
      })
      ex.nb_contrats += 1
      ex.cotisation_totale += r.cotisation_mensuelle ?? 0
      ex.com_mandataire_24m += r.com_mandataire_24m
      ex.com_societe_mois_suivant += r.com_societe_mois_suivant
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

  if (loading) return <div style={{ color: '#64748b' }}>Chargement\u2026</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          Portefeuille \u2014 Renouvellements pr\u00e9vus
        </h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Commissions de renouvellement pr\u00e9vues sur le portefeuille actif
          (source : moteur de calcul Supabase).
        </p>
      </div>

      {/* Pills s\u00e9lecteur commercial */}
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
                  label="Com. soci\u00e9t\u00e9 mois suivant"
                  value={fmtEur(k.com_societe_mois_suivant)}
                  highlight
                />
                <MiniKpi
                  label="Com. mandataire 24m"
                  value={fmtEur(k.com_mandataire_24m)}
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
              hint="Mensuelle cumul\u00e9e"
            />
            <Kpi
              label="Com. soci\u00e9t\u00e9 mois"
              value={fmtEur(selectedKpis.com_societe_mois)}
              hint="Renouvellements \u00e0 venir"
              color="#00C18B"
            />
            <Kpi
              label="Com. soci\u00e9t\u00e9 mois suivant"
              value={fmtEur(selectedKpis.com_societe_mois_suivant)}
              hint="Mois suivant"
              color="#00C18B"
            />
          </div>

          {/* D\u00e9tail par compagnie */}
          {groupes.length === 0 ? (
            <Card title="D\u00e9tail par compagnie">
              <Empty label="Aucun contrat dans le portefeuille." />
            </Card>
          ) : (
            groupes.map((g) => (
              <Card
                key={g.compagnie}
                title={`${g.compagnie} \u2014 ${g.nb_contrats} contrat${g.nb_contrats > 1 ? 's' : ''}`}
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
                      fontFamily: MONO,
                    }}
                  >
                    {fmtEur(g.cotisation_totale)}/m
                  </strong>{' '}
                  \u00b7 Com. mandataire 24m :{' '}
                  <strong
                    style={{
                      color: '#00C18B',
                      fontFamily: MONO,
                    }}
                  >
                    {fmtEur(g.com_mandataire_24m)}
                  </strong>{' '}
                  \u00b7 Com. mois suivant :{' '}
                  <strong
                    style={{
                      color: '#00C18B',
                      fontFamily: MONO,
                    }}
                  >
                    {fmtEur(g.com_societe_mois_suivant)}
                  </strong>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <colgroup>
                      <col style={{ width: 140 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 120 }} />
                      <col style={{ width: 150 }} />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <thead>
                      <tr style={trHead}>
                        <th style={th}>Client</th>
                        <th style={th}>Date effet</th>
                        <th style={thRight}>Cotisation</th>
                        <th style={thRight}>Com. soci\u00e9t\u00e9 24m</th>
                        <th style={thRight}>Com. mois suivant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.contrats.map((c) => (
                        <tr
                          key={c.contrat_id}
                          style={trBody}
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
                              fontFamily: MONO,
                              fontSize: 11,
                            }}
                          >
                            {fmtDate(c.date_effet)}
                          </td>
                          <td
                            style={{
                              ...tdMontant,
                              color: '#475569',
                            }}
                          >
                            {c.cotisation_mensuelle
                              ? `${fmtEur(c.cotisation_mensuelle)}/m`
                              : '\u2014'}
                          </td>
                          <td
                            style={{
                              ...tdMontant,
                              color: '#00C18B',
                              fontWeight: 700,
                            }}
                          >
                            {fmtEur(c.com_societe_24m)}
                          </td>
                          <td
                            style={{
                              ...tdMontant,
                              color:
                                c.com_societe_mois_suivant > 0
                                  ? '#00C18B'
                                  : '#cbd5e1',
                            }}
                          >
                            {c.com_societe_mois_suivant > 0
                              ? fmtEur(c.com_societe_mois_suivant)
                              : '\u2014'}
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

// -- Sub-composants --

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
          fontFamily: MONO,
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
          fontFamily: MONO,
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

export default Portefeuille
