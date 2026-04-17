import { Fragment, useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  fetchCommissionsMandataires,
  fetchCommissionsMandataireDetail,
} from '../api'
import {
  tableStyle,
  trHead,
  th,
  thRight,
  td,
  tdMontant,
  trFooter,
  tdFooterLabel,
  tdFooterMontant,
  trBody,
  MONO,
} from '../styles/tableTokens'
import type {
  CommissionMandataire,
  CommissionMandataireDetail,
} from '../types'

const COMMERCIAUX = [
  { prenom: 'Charlotte', color: '#378ADD' },
  { prenom: 'Cheyenne', color: '#BA7517' },
  { prenom: 'Christopher', color: '#1D9E75' },
] as const

const MOIS_NOMS = [
  '',
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

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

function Mandataires() {
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  const [annee, setAnnee] = useState(curYear)
  const [rows, setRows] = useState<CommissionMandataire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drill-down
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drillData, setDrillData] = useState<
    Record<string, CommissionMandataireDetail[]>
  >({})
  const [drillLoading, setDrillLoading] = useState<string | null>(null)

  // Fetch
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchCommissionsMandataires(annee)
      setRows(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [annee])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Available years for selector
  const annees = useMemo(() => {
    const set = new Set<number>()
    for (const r of rows) set.add(r.annee)
    set.add(curYear)
    return Array.from(set).sort((a, b) => b - a)
  }, [rows, curYear])

  // Drill-down handler
  const handleRowClick = useCallback(
    async (a: number, m: number, commercialId: string) => {
      const key = `${a}-${m}-${commercialId}`
      if (expanded === key) {
        setExpanded(null)
        return
      }
      setExpanded(key)
      if (!drillData[key]) {
        setDrillLoading(key)
        try {
          const d = await fetchCommissionsMandataireDetail(a, m, commercialId)
          setDrillData((prev) => ({ ...prev, [key]: d }))
        } catch {
          // silently fail
        } finally {
          setDrillLoading(null)
        }
      }
    },
    [expanded, drillData],
  )

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Commissions mandataires</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Calculées sur les contrats signés dans le mois — les 12 mois
          linéaires sont avancés au mois de signature.
        </p>
      </div>

      {/* Filtres */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={labelStyle}>Année</label>
          <select
            value={annee}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setAnnee(parseInt(e.target.value, 10))
            }
            style={inputStyle}
          >
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#94a3b8', fontSize: 11 }}>
          ℹ️ Logique différente de l&apos;onglet Commissions mensuelles
        </span>
      </div>

      {/* Un tableau par commercial */}
      {COMMERCIAUX.map((com) => {
        const comRows = rows.filter(
          (r) => r.commercial_prenom === com.prenom,
        )
        const totals = comRows.reduce(
          (acc, r) => ({
            nb_contrats: acc.nb_contrats + r.nb_contrats,
            com_societe: acc.com_societe + r.com_societe,
            com_mandataire: acc.com_mandataire + r.com_mandataire,
            frais_service: acc.frais_service + (r.frais_service ?? 0),
            frais_mandataire: acc.frais_mandataire + (r.frais_mandataire ?? 0),
          }),
          { nb_contrats: 0, com_societe: 0, com_mandataire: 0, frais_service: 0, frais_mandataire: 0 },
        )

        return (
          <Card
            key={com.prenom}
            title={com.prenom}
            titleColor={com.color}
          >
            {comRows.length === 0 ? (
              <Empty label={`Aucune commission pour ${com.prenom} en ${annee}.`} />
            ) : (
              <table style={{ ...tableStyle, tableLayout: 'auto' }}>
                <colgroup>
                  <col style={{ width: 180 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 130 }} />
                </colgroup>
                <thead>
                  <tr style={trHead}>
                    <th style={th}>Période</th>
                    <th style={thRight}>Nb contrats</th>
                    <th style={thRight}>Com&apos; Tessoria</th>
                    <th style={thRight}>Com&apos; mandataire</th>
                    <th style={thRight}>Frais serv.</th>
                    <th style={thRight}>Com&apos; frais 40%</th>
                    <th style={thRight}>Total à payer</th>
                  </tr>
                </thead>
                <tbody>
                  {comRows.map((r) => {
                    const key = `${r.annee}-${r.mois}-${r.commercial_id}`
                    const isExpanded = expanded === key
                    const isCurrent =
                      r.annee === curYear && r.mois === curMonth
                    const details = drillData[key]
                    const isLoading = drillLoading === key

                    return (
                      <Fragment key={key}>
                        <tr
                          onClick={() =>
                            void handleRowClick(
                              r.annee,
                              r.mois,
                              r.commercial_id,
                            )
                          }
                          style={{
                            ...trBody,
                            cursor: 'pointer',
                            background: isCurrent ? '#f0fdf4' : undefined,
                            borderLeft: isCurrent
                              ? '3px solid #00C18B'
                              : '3px solid transparent',
                          }}
                        >
                          <td
                            style={{
                              ...td,
                              fontWeight: 600,
                              color: '#0f172a',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: 16,
                                fontSize: 10,
                                color: '#94a3b8',
                              }}
                            >
                              {isExpanded ? '▾' : '▸'}
                            </span>
                            {(MOIS_NOMS[r.mois] ?? r.mois).toString().toLowerCase()}{' '}
                            {r.annee}
                            {isCurrent && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#1D9E75',
                                  background: '#dcfce7',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                En cours
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'right',
                              color: '#64748b',
                            }}
                          >
                            {r.nb_contrats}
                          </td>
                          <td
                            style={{
                              ...tdMontant,
                              color: '#0f172a',
                              fontWeight: 600,
                            }}
                          >
                            {fmtEur(r.com_societe)}
                          </td>
                          <td
                            style={{
                              ...tdMontant,
                              color: '#00C18B',
                              fontWeight: 700,
                            }}
                          >
                            {fmtEur(r.com_mandataire)}
                          </td>
                          <td style={{ ...tdMontant, color: '#64748b' }}>
                            {fmtEur(r.frais_service ?? 0)}
                          </td>
                          <td style={{ ...tdMontant, color: '#BA7517' }}>
                            {fmtEur(r.frais_mandataire ?? 0)}
                          </td>
                          <td
                            style={{
                              ...tdMontant,
                              color: '#0f172a',
                              fontWeight: 700,
                            }}
                          >
                            {fmtEur(r.com_mandataire + (r.frais_mandataire ?? 0))}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                padding: 0,
                                background: '#f8fafc',
                              }}
                            >
                              <div
                                style={{
                                  borderTop: '1px solid #e2e8f0',
                                  padding: '8px 16px 12px',
                                }}
                              >
                                {isLoading ? (
                                  <div
                                    style={{
                                      color: '#64748b',
                                      fontSize: 12,
                                      padding: 8,
                                    }}
                                  >
                                    Chargement…
                                  </div>
                                ) : !details || details.length === 0 ? (
                                  <div
                                    style={{
                                      color: '#94a3b8',
                                      fontSize: 12,
                                      fontStyle: 'italic',
                                      padding: 8,
                                    }}
                                  >
                                    Aucun contrat ce mois.
                                  </div>
                                ) : (
                                  <>
                                    <p
                                      style={{
                                        fontSize: 12,
                                        color: '#64748b',
                                        marginBottom: 8,
                                        marginTop: 4,
                                      }}
                                    >
                                      {details.length} contrat
                                      {details.length > 1 ? 's' : ''} ·{' '}
                                      {(MOIS_NOMS[r.mois] ?? '').toString().toLowerCase()}{' '}
                                      {r.annee}
                                    </p>
                                    <div style={{ overflowX: 'auto' }}>
                                      <table
                                        style={{
                                          width: '100%',
                                          fontSize: 12,
                                          borderCollapse: 'collapse',
                                        }}
                                      >
                                        <thead>
                                          <tr
                                            style={{
                                              color: '#64748b',
                                              fontSize: 10,
                                              fontWeight: 600,
                                            }}
                                          >
                                            <th style={subTh}>Client</th>
                                            <th style={subTh}>Compagnie</th>
                                            <th style={subTh}>Type</th>
                                            <th style={subTh}>Origine</th>
                                            <th style={subTh}>Date sig.</th>
                                            <th
                                              style={{
                                                ...subTh,
                                                textAlign: 'right',
                                              }}
                                            >
                                              Cotis./mois
                                            </th>
                                            <th
                                              style={{
                                                ...subTh,
                                                textAlign: 'right',
                                              }}
                                            >
                                              Com&apos; Tessoria
                                            </th>
                                            <th
                                              style={{
                                                ...subTh,
                                                textAlign: 'right',
                                              }}
                                            >
                                              Taux
                                            </th>
                                            <th
                                              style={{
                                                ...subTh,
                                                textAlign: 'right',
                                              }}
                                            >
                                              Com&apos; mandataire
                                            </th>
                                            <th
                                              style={{
                                                ...subTh,
                                                textAlign: 'right',
                                              }}
                                            >
                                              Frais
                                            </th>
                                            <th
                                              style={{
                                                ...subTh,
                                                textAlign: 'right',
                                              }}
                                            >
                                              Com&apos; frais
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {details.map((d) => (
                                            <tr
                                              key={d.contrat_id}
                                              style={{
                                                borderTop:
                                                  '1px solid #e5e7eb',
                                              }}
                                            >
                                              <td style={subTd}>
                                                <strong
                                                  style={{
                                                    color: '#0f172a',
                                                  }}
                                                >
                                                  {d.client}
                                                </strong>
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  color: '#475569',
                                                }}
                                              >
                                                {d.compagnie_assureur}
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  color: '#94a3b8',
                                                  fontSize: 10,
                                                }}
                                              >
                                                {d.type_commission ?? '—'}
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  color: '#64748b',
                                                }}
                                              >
                                                {d.origine ?? '—'}
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  color: '#94a3b8',
                                                  fontFamily: MONO,
                                                  fontSize: 10,
                                                }}
                                              >
                                                {fmtDate(d.date_signature)}
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  textAlign: 'right',
                                                  fontFamily: MONO,
                                                  color: '#475569',
                                                }}
                                              >
                                                {fmtEur(
                                                  d.cotisation_mensuelle,
                                                )}
                                                /m
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  textAlign: 'right',
                                                  fontFamily: MONO,
                                                  color: '#0f172a',
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {fmtEur(
                                                  d.montant_com_societe,
                                                )}
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  textAlign: 'right',
                                                  fontFamily: MONO,
                                                  color: '#64748b',
                                                  fontSize: 11,
                                                }}
                                              >
                                                {d.taux_mandataire_pct} %
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  textAlign: 'right',
                                                  fontFamily: MONO,
                                                  color: '#00C18B',
                                                  fontWeight: 700,
                                                }}
                                              >
                                                {fmtEur(
                                                  d.montant_com_mandataire,
                                                )}
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  textAlign: 'right',
                                                  fontFamily: MONO,
                                                  color: '#64748b',
                                                }}
                                              >
                                                {(d.montant_frais ?? 0) > 0
                                                  ? fmtEur(d.montant_frais ?? 0)
                                                  : '—'}
                                              </td>
                                              <td
                                                style={{
                                                  ...subTd,
                                                  textAlign: 'right',
                                                  fontFamily: MONO,
                                                  color: '#BA7517',
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {(d.montant_frais_mandataire ?? 0) > 0
                                                  ? fmtEur(d.montant_frais_mandataire ?? 0)
                                                  : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  <tr style={trFooter}>
                    <td style={tdFooterLabel}>Total {com.prenom}</td>
                    <td style={{ ...tdFooterMontant, color: '#0f172a' }}>
                      {totals.nb_contrats}
                    </td>
                    <td style={{ ...tdFooterMontant, color: '#0f172a' }}>
                      {fmtEur(totals.com_societe)}
                    </td>
                    <td style={tdFooterMontant}>
                      {fmtEur(totals.com_mandataire)}
                    </td>
                    <td style={{ ...tdFooterMontant, color: '#64748b' }}>
                      {fmtEur(totals.frais_service)}
                    </td>
                    <td style={{ ...tdFooterMontant, color: '#BA7517' }}>
                      {fmtEur(totals.frais_mandataire)}
                    </td>
                    <td style={{ ...tdFooterMontant, color: '#0f172a' }}>
                      {fmtEur(totals.com_mandataire + totals.frais_mandataire)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function Card({
  title,
  titleColor,
  children,
}: {
  title: string
  titleColor?: string
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
      <h3
        style={{
          margin: '0 0 14px',
          fontSize: 15,
          color: titleColor ?? '#0f172a',
        }}
      >
        {title}
      </h3>
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

const subTh: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 8px',
  borderBottom: '1px solid #e5e7eb',
}
const subTd: React.CSSProperties = { padding: '6px 8px' }

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
}
const inputStyle: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
}

export default Mandataires
