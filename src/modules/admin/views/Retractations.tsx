import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { fetchAdminRetractations } from '../api'
import { ClientCell } from '../components/ClientCell'

export interface AdminRetractationRow {
  id: string
  client: string
  commercial_prenom: string | null
  compagnie_assureur: string | null
  cotisation_mensuelle: number | null
  type_commission: string | null
  date_signature: string | null
  origine: string | null
}

const COMMERCIAL_COLORS: Record<string, string> = {
  Charlotte: '#378ADD',
  Cheyenne: '#BA7517',
  Mariam: '#534AB7',
  Christopher: '#1D9E75',
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

function fmtCurrency(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })
}

function Retractations() {
  const [rows, setRows] = useState<AdminRetractationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdminRetractations()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo<AdminRetractationRow[]>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.client.toLowerCase().includes(q) ||
        (r.commercial_prenom ?? '').toLowerCase().includes(q) ||
        (r.compagnie_assureur ?? '').toLowerCase().includes(q),
    )
  }, [rows, search])

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Rétractations</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Contrats rétractés — irréversible
        </p>
      </div>

      {/* Recherche + compteur */}
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
        <input
          type="text"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          placeholder="Rechercher un client…"
          style={{
            padding: '6px 12px',
            fontSize: 13,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: '#f9fafb',
            color: '#374151',
            flex: 1,
            maxWidth: 280,
          }}
        />
        <div style={{ flex: 1 }} />
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {visible.length} contrat{visible.length > 1 ? 's' : ''}
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
        {visible.length === 0 ? (
          <div
            style={{
              color: '#94a3b8',
              fontSize: 13,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 24,
            }}
          >
            Aucune rétractation trouvée.
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
                <th style={th}>Commercial</th>
                <th style={th}>Compagnie</th>
                <th style={{ ...th, textAlign: 'right' }}>Cotis./mois</th>
                <th style={th}>Type com.</th>
                <th style={th}>Date sig.</th>
                <th style={th}>Origine</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const comColor =
                  COMMERCIAL_COLORS[r.commercial_prenom ?? ''] ?? '#64748b'
                return (
                  <tr
                    key={r.id}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td style={td}>
                      <ClientCell name={r.client} />
                    </td>
                    <td style={td}>
                      {r.commercial_prenom ? (
                        <span
                          style={{
                            background: `${comColor}18`,
                            color: comColor,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {r.commercial_prenom}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {r.compagnie_assureur ?? '—'}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {fmtCurrency(r.cotisation_mensuelle)}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {r.type_commission ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(r.date_signature)}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {r.origine ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
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

export default Retractations
