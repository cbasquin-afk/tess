import { useMemo, useState, type ChangeEvent } from 'react'
import { useAdminContrats } from '../context/ContractsContext'

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

function fmtEur(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return '—'
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

interface FraisRow {
  id: string
  client: string
  compagnie_assureur: string | null
  commercial_prenom: string | null
  date_signature: string | null
  frais_service: number
  sigAnnee: number | null
  sigMois: number | null
}

function Frais() {
  const { contrats, loading, error } = useAdminContrats()

  // Lignes annotées (mois/année du date_signature)
  const annoted = useMemo<FraisRow[]>(() => {
    return contrats
      .filter((c) => (c.frais_service ?? 0) > 0)
      .map((c) => {
        const ds = c.date_signature ? new Date(c.date_signature) : null
        return {
          id: c.id,
          client: c.client,
          compagnie_assureur: c.compagnie_assureur,
          commercial_prenom: c.commercial_prenom,
          date_signature: c.date_signature,
          frais_service: c.frais_service ?? 0,
          sigAnnee: ds ? ds.getFullYear() : null,
          sigMois: ds ? ds.getMonth() + 1 : null,
        }
      })
  }, [contrats])

  // Années distinctes pour le select
  const annees = useMemo<number[]>(() => {
    const set = new Set<number>()
    for (const r of annoted) if (r.sigAnnee !== null) set.add(r.sigAnnee)
    const list = Array.from(set).sort((a, b) => b - a)
    if (list.length === 0) list.push(new Date().getFullYear())
    return list
  }, [annoted])

  const [annee, setAnnee] = useState<number>(() => new Date().getFullYear())
  const [mois, setMois] = useState<string>('') // '' = tous mois

  // Si l'année courante n'a pas de data, basculer sur la première dispo
  // (effet uniquement quand `annees` change)
  const effectiveAnnee = useMemo(() => {
    if (annees.includes(annee)) return annee
    return annees[0] ?? new Date().getFullYear()
  }, [annee, annees])

  const filtered = useMemo<FraisRow[]>(() => {
    let rows = annoted.filter((r) => r.sigAnnee === effectiveAnnee)
    if (mois !== '') {
      const m = parseInt(mois, 10)
      rows = rows.filter((r) => r.sigMois === m)
    }
    rows.sort((a, b) => {
      const da = a.date_signature ?? ''
      const db = b.date_signature ?? ''
      return db.localeCompare(da)
    })
    return rows
  }, [annoted, effectiveAnnee, mois])

  const total = useMemo(
    () => filtered.reduce((s, r) => s + (r.frais_service ?? 0), 0),
    [filtered],
  )

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Frais de service</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Frais facturés sur les contrats — comptabilisés au mois de la
          date de signature.
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
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={labelStyle}>Mois</label>
          <select
            value={mois}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setMois(e.target.value)
            }
            style={inputStyle}
          >
            <option value="">Tous</option>
            {MOIS_NOMS.slice(1).map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {filtered.length} ligne{filtered.length > 1 ? 's' : ''}
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
        {filtered.length === 0 ? (
          <div
            style={{
              color: '#94a3b8',
              fontSize: 13,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 24,
            }}
          >
            Aucun frais pour cette période.
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
              <tr
                style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}
              >
                <th style={th}>Client</th>
                <th style={th}>Compagnie</th>
                <th style={th}>Commercial</th>
                <th style={th}>Date signature</th>
                <th style={{ ...th, textAlign: 'right' }}>Frais (€)</th>
                <th style={th}>Mois comptable</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
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
                  <td style={{ ...td, color: '#475569' }}>
                    {r.compagnie_assureur ?? '—'}
                  </td>
                  <td style={{ ...td, color: '#475569' }}>
                    {r.commercial_prenom ?? '—'}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#94a3b8',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {fmtDate(r.date_signature)}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: '#00C18B',
                      fontWeight: 600,
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {fmtEur(r.frais_service)}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#94a3b8',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {r.sigMois && r.sigAnnee
                      ? `${String(r.sigMois).padStart(2, '0')}/${r.sigAnnee}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                <td
                  colSpan={4}
                  style={{
                    ...td,
                    fontWeight: 600,
                    color: '#475569',
                  }}
                >
                  Total
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    color: '#00C18B',
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {fmtEur(total)}
                </td>
                <td style={{ ...td, color: '#94a3b8', fontSize: 11 }}>
                  sur {filtered.length} ligne{filtered.length > 1 ? 's' : ''}
                </td>
              </tr>
            </tfoot>
          </table>
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

export default Frais
