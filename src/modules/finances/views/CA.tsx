import { Fragment, useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useFinancesCtx } from '../context/FinancesContext'
import { fetchCommissionsParMois } from '../api'
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
import type { CAMensuel, CommissionDetail } from '../types'

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

type ViewMode = 'mensuel' | 'trimestriel' | 'annuel'

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'mensuel', label: 'Mensuel' },
  { key: 'trimestriel', label: 'Trimestriel' },
  { key: 'annuel', label: 'Annuel' },
]

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

interface AggregatedRow {
  label: string
  annee: number
  mois: number
  nb_lignes: number
  ca_societe: number
  frais: number
  total: number
}

function CA() {
  const { caMensuel, loading, error } = useFinancesCtx()
  const [mode, setMode] = useState<ViewMode>('mensuel')
  const [annee, setAnnee] = useState<number>(() => new Date().getFullYear())

  // Drill-down state
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [details, setDetails] = useState<CommissionDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  // Années distinctes pour le select, tri DESC. Fallback année courante.
  const annees = useMemo<number[]>(() => {
    const set = new Set<number>()
    for (const r of caMensuel) set.add(r.annee)
    const arr = Array.from(set).sort((a, b) => b - a)
    if (arr.length === 0) arr.push(new Date().getFullYear())
    return arr
  }, [caMensuel])

  const effectiveAnnee = useMemo(
    () => (annees.includes(annee) ? annee : (annees[0] ?? annee)),
    [annee, annees],
  )

  const rows = useMemo<AggregatedRow[]>(() => {
    if (mode === 'mensuel') {
      const yearRows = caMensuel
        .filter((r) => r.annee === effectiveAnnee)
        .sort((a, b) => a.mois - b.mois) // ASC : Janvier en haut
      return yearRows.map((r) => ({
        label: `${MOIS_NOMS[r.mois] ?? r.mois} ${r.annee}`,
        annee: r.annee,
        mois: r.mois,
        nb_lignes: r.nb_lignes,
        ca_societe: r.ca_societe,
        frais: r.frais,
        total: r.ca_societe + r.frais,
      }))
    }

    if (mode === 'trimestriel') {
      const yearRows = caMensuel.filter((r) => r.annee === effectiveAnnee)
      const quarters: Record<number, CAMensuel[]> = {
        1: [],
        2: [],
        3: [],
        4: [],
      }
      for (const r of yearRows) {
        const q = Math.ceil(r.mois / 3)
        if (q >= 1 && q <= 4) quarters[q]!.push(r)
      }
      const out: AggregatedRow[] = []
      for (let q = 1; q <= 4; q++) {
        const list = quarters[q]!
        if (list.length === 0) continue
        const acc = list.reduce(
          (s, r) => ({
            nb_lignes: s.nb_lignes + r.nb_lignes,
            ca_societe: s.ca_societe + r.ca_societe,
            frais: s.frais + r.frais,
          }),
          { nb_lignes: 0, ca_societe: 0, frais: 0 },
        )
        out.push({
          label: `T${q} ${effectiveAnnee}`,
          annee: effectiveAnnee,
          mois: q, // quarter number
          ...acc,
          total: acc.ca_societe + acc.frais,
        })
      }
      return out
    }

    // Annuel : toutes les années
    const map = new Map<number, AggregatedRow>()
    for (const r of caMensuel) {
      const ex = map.get(r.annee) ?? {
        label: String(r.annee),
        annee: r.annee,
        mois: 0,
        nb_lignes: 0,
        ca_societe: 0,
        frais: 0,
        total: 0,
      }
      ex.nb_lignes += r.nb_lignes
      ex.ca_societe += r.ca_societe
      ex.frais += r.frais
      ex.total = ex.ca_societe + ex.frais
      map.set(r.annee, ex)
    }
    return Array.from(map.values()).sort((a, b) => a.annee - b.annee)
  }, [caMensuel, mode, effectiveAnnee])

  const totals = useMemo(
    () =>
      rows.reduce(
        (s, r) => ({
          nb_lignes: s.nb_lignes + r.nb_lignes,
          ca_societe: s.ca_societe + r.ca_societe,
          frais: s.frais + r.frais,
          total: s.total + r.total,
        }),
        { nb_lignes: 0, ca_societe: 0, frais: 0, total: 0 },
      ),
    [rows],
  )

  const handleRowClick = useCallback(
    async (row: AggregatedRow) => {
      // Only drill-down in mensuel mode
      if (mode !== 'mensuel') return
      const key = `${row.annee}-${row.mois}`
      if (expandedRow === key) {
        setExpandedRow(null)
        return
      }
      setExpandedRow(key)
      setDetailLoading(true)
      try {
        const d = await fetchCommissionsParMois(row.annee, row.mois)
        setDetails(d)
      } catch {
        setDetails([])
      } finally {
        setDetailLoading(false)
      }
    },
    [expandedRow, mode],
  )

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Commissions mensuelles</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Commissions Tessoria et frais de service par période.
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
        <div
          style={{
            display: 'flex',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {VIEW_MODES.map((v) => {
            const active = mode === v.key
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  setMode(v.key)
                  setExpandedRow(null)
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#1f3a8a' : 'transparent',
                  color: active ? '#fff' : '#64748b',
                }}
              >
                {v.label}
              </button>
            )
          })}
        </div>

        {mode !== 'annuel' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={labelStyle}>Année</label>
            <select
              value={effectiveAnnee}
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
        )}

        <div style={{ flex: 1 }} />
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {rows.length} ligne{rows.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
          overflowX: 'auto',
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              color: '#94a3b8',
              fontSize: 13,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 24,
            }}
          >
            Pas de données pour cette période.
          </div>
        ) : (
          <table style={{ ...tableStyle, tableLayout: 'auto' }}>
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 140 }} />
            </colgroup>
            <thead>
              <tr style={trHead}>
                <th style={th}>Période</th>
                <th style={thRight}>Nb lignes</th>
                <th style={thRight}>Com&apos; Tessoria</th>
                <th style={thRight}>Frais</th>
                <th style={thRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = `${r.annee}-${r.mois}`
                const isExpanded = expandedRow === key
                const isCurrent =
                  mode === 'mensuel' &&
                  r.annee === curYear &&
                  r.mois === curMonth
                const clickable = mode === 'mensuel'
                return (
                  <Fragment key={key}>
                    <tr
                      onClick={() => {
                        if (clickable) void handleRowClick(r)
                      }}
                      style={{
                        ...trBody,
                        cursor: clickable ? 'pointer' : 'default',
                        background: isCurrent ? '#f0fdf4' : undefined,
                      }}
                    >
                      <td
                        style={{
                          ...td,
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        {clickable && (
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
                        )}
                        {r.label}
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
                          color: '#94a3b8',
                        }}
                      >
                        {r.nb_lignes}
                      </td>
                      <td
                        style={{
                          ...tdMontant,
                          color: '#0f172a',
                          fontWeight: 600,
                        }}
                      >
                        {fmtEur(r.ca_societe)}
                      </td>
                      <td style={{ ...tdMontant, color: '#BA7517' }}>
                        {fmtEur(r.frais)}
                      </td>
                      <td
                        style={{
                          ...tdMontant,
                          color: '#00C18B',
                          fontWeight: 700,
                        }}
                      >
                        {fmtEur(r.total)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${key}-detail`}>
                        <td
                          colSpan={5}
                          style={{ padding: 0, background: '#f8fafc' }}
                        >
                          <div
                            style={{
                              borderTop: '1px solid #e2e8f0',
                              padding: '8px 16px 12px',
                            }}
                          >
                            {detailLoading ? (
                              <div
                                style={{
                                  color: '#64748b',
                                  fontSize: 12,
                                  padding: 8,
                                }}
                              >
                                Chargement…
                              </div>
                            ) : details.length === 0 ? (
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
                                  {r.annee}/
                                  {String(r.mois).padStart(2, '0')}
                                </p>
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
                                      <th style={subTh}>Type com.</th>
                                      <th
                                        style={{
                                          ...subTh,
                                          textAlign: 'right',
                                        }}
                                      >
                                        Cotisation/mois
                                      </th>
                                      <th style={subTh}>Date sig.</th>
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
                                        Frais
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {details.map((d) => (
                                      <tr
                                        key={d.id}
                                        style={{
                                          borderTop: '1px solid #e5e7eb',
                                        }}
                                      >
                                        <td style={subTd}>
                                          <strong
                                            style={{ color: '#0f172a' }}
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
                                          {d.compagnie_assureur ?? '—'}
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
                                            textAlign: 'right',
                                            fontFamily: MONO,
                                            color: '#475569',
                                          }}
                                        >
                                          {d.cotisation_mensuelle
                                            ? `${fmtEur(d.cotisation_mensuelle)}/m`
                                            : '—'}
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
                                            color: '#0f172a',
                                            fontWeight: 600,
                                          }}
                                        >
                                          {fmtEur(d.montant_com_societe)}
                                        </td>
                                        <td
                                          style={{
                                            ...subTd,
                                            textAlign: 'right',
                                            fontFamily: MONO,
                                            color:
                                              d.montant_frais > 0
                                                ? '#BA7517'
                                                : '#cbd5e1',
                                          }}
                                        >
                                          {d.montant_frais > 0
                                            ? fmtEur(d.montant_frais)
                                            : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
                <td style={tdFooterLabel}>Total</td>
                <td
                  style={{
                    ...tdFooterMontant,
                    color: '#0f172a',
                    fontFamily: MONO,
                  }}
                >
                  {totals.nb_lignes}
                </td>
                <td style={{ ...tdFooterMontant, color: '#0f172a' }}>
                  {fmtEur(totals.ca_societe)}
                </td>
                <td style={{ ...tdFooterMontant, color: '#BA7517' }}>
                  {fmtEur(totals.frais)}
                </td>
                <td style={tdFooterMontant}>{fmtEur(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
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

export default CA
