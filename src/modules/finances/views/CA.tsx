import { useMemo, useState, type ChangeEvent } from 'react'
import { useFinancesCtx } from '../context/FinancesContext'
import type { CAMensuel } from '../types'

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

interface AggregatedRow {
  label: string
  nb_lignes: number
  ca_societe: number
  ca_mandataire: number
  frais: number
  total: number
}

function CA() {
  const { caMensuel, loading, error } = useFinancesCtx()
  const [mode, setMode] = useState<ViewMode>('mensuel')
  const [annee, setAnnee] = useState<number>(() => new Date().getFullYear())

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
        .sort((a, b) => b.mois - a.mois)
      return yearRows.map((r) => ({
        label: `${MOIS_NOMS[r.mois] ?? r.mois} ${r.annee}`,
        nb_lignes: r.nb_lignes,
        ca_societe: r.ca_societe,
        ca_mandataire: r.ca_mandataire,
        frais: r.frais,
        total: r.ca_societe + r.frais,
      }))
    }

    if (mode === 'trimestriel') {
      const yearRows = caMensuel.filter((r) => r.annee === effectiveAnnee)
      const quarters: Record<number, CAMensuel[]> = { 1: [], 2: [], 3: [], 4: [] }
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
            ca_mandataire: s.ca_mandataire + r.ca_mandataire,
            frais: s.frais + r.frais,
          }),
          { nb_lignes: 0, ca_societe: 0, ca_mandataire: 0, frais: 0 },
        )
        out.push({
          label: `T${q} ${effectiveAnnee}`,
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
        nb_lignes: 0,
        ca_societe: 0,
        ca_mandataire: 0,
        frais: 0,
        total: 0,
      }
      ex.nb_lignes += r.nb_lignes
      ex.ca_societe += r.ca_societe
      ex.ca_mandataire += r.ca_mandataire
      ex.frais += r.frais
      ex.total = ex.ca_societe + ex.frais
      map.set(r.annee, ex)
    }
    return Array.from(map.values()).sort((a, b) =>
      b.label.localeCompare(a.label),
    )
  }, [caMensuel, mode, effectiveAnnee])

  const totals = useMemo(
    () =>
      rows.reduce(
        (s, r) => ({
          nb_lignes: s.nb_lignes + r.nb_lignes,
          ca_societe: s.ca_societe + r.ca_societe,
          ca_mandataire: s.ca_mandataire + r.ca_mandataire,
          frais: s.frais + r.frais,
          total: s.total + r.total,
        }),
        {
          nb_lignes: 0,
          ca_societe: 0,
          ca_mandataire: 0,
          frais: 0,
          total: 0,
        },
      ),
    [rows],
  )

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>CA mensuel</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Marge brute société, commissions mandataires et frais de service.
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
                onClick={() => setMode(v.key)}
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
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={trHead}>
                <th style={th}>Période</th>
                <th style={{ ...th, textAlign: 'right' }}>Nb lignes</th>
                <th style={{ ...th, textAlign: 'right' }}>CA société</th>
                <th style={{ ...th, textAlign: 'right' }}>CA mandataires</th>
                <th style={{ ...th, textAlign: 'right' }}>Frais</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td
                    style={{
                      ...td,
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {r.label}
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
                      ...td,
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  >
                    {fmtEur(r.ca_societe)}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      color: '#64748b',
                    }}
                  >
                    {fmtEur(r.ca_mandataire)}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      color: '#BA7517',
                    }}
                  >
                    {fmtEur(r.frais)}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      color: '#00C18B',
                      fontWeight: 700,
                    }}
                  >
                    {fmtEur(r.total)}
                  </td>
                </tr>
              ))}
              <tr
                style={{
                  background: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 700,
                }}
              >
                <td style={{ ...td, color: '#0f172a' }}>Total</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {totals.nb_lignes}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#0f172a',
                  }}
                >
                  {fmtEur(totals.ca_societe)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#64748b',
                  }}
                >
                  {fmtEur(totals.ca_mandataire)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#BA7517',
                  }}
                >
                  {fmtEur(totals.frais)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: '#00C18B',
                  }}
                >
                  {fmtEur(totals.total)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
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
