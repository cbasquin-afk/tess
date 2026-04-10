import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { fetchResiliationsV2 } from '../api'
import { ClientCell } from '../components/ClientCell'
import type { ResiliationV2Row } from '../types'

const STATUT_COLORS: Record<string, string> = {
  'EN ATTENTE': '#BA7517',
  'ENVOYÉE': '#378ADD',
  'AR COMPAGNIE': '#1D9E75',
  'RAF': '#1D9E75',
  'REFUSEE': '#E24B4A',
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

function statutColor(statut: string | null): string {
  if (!statut) return '#94a3b8'
  return STATUT_COLORS[statut.toUpperCase()] ?? '#94a3b8'
}

function ResiliationsV2() {
  const [rows, setRows] = useState<ResiliationV2Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchResiliationsV2()
      .then((data) => {
        if (!cancelled) {
          setRows(data)
          setError(null)
        }
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

  const visible = useMemo<ResiliationV2Row[]>(() => {
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
    return <div style={{ color: '#64748b' }}>Chargement...</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Résiliations</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Contrats résiliés — suivi des demandes de résiliation
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
          placeholder="Rechercher un client..."
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
          {visible.length} résiliation{visible.length > 1 ? 's' : ''}
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
            Aucune résiliation trouvée.
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
                <th style={th}>Date sig.</th>
                <th style={th}>Type résil.</th>
                <th style={th}>Date résil.</th>
                <th style={th}>Statut</th>
                <th style={th}>Lettre</th>
                <th style={th}>AR</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const sCol = statutColor(r.statut_demande)
                const cCol =
                  COMMERCIAL_COLORS[r.commercial_prenom ?? ''] ?? '#94a3b8'
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
                            background: `${cCol}18`,
                            color: cCol,
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
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(r.date_signature)}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {r.type_resiliation ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {fmtDate(r.date_resiliation)}
                    </td>
                    <td style={td}>
                      {r.statut_demande ? (
                        <span
                          style={{
                            background: `${sCol}18`,
                            color: sCol,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {r.statut_demande}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {r.date_envoi ? fmtDate(r.date_envoi) : '—'}
                    </td>
                    <td style={{ ...td, color: r.date_ar ? '#1D9E75' : '#94a3b8' }}>
                      {r.date_ar ? `\u2713 ${fmtDate(r.date_ar)}` : '—'}
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

export default ResiliationsV2
