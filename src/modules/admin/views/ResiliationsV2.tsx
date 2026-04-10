import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { fetchResiliationsV2 } from '../api'
import { ClientCell } from '../components/ClientCell'
import type { ResiliationV2Row } from '../types'

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

function fmtEur(n: number | null): string {
  if (n === null) return '—'
  return (
    n.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

function statutBadge(statut: string | null) {
  if (!statut) return <span style={{ color: '#cbd5e1' }}>—</span>
  const isReplace = statut.toLowerCase().includes('replacé') && !statut.toLowerCase().includes('non')
  const color = isReplace ? '#1D9E75' : '#E24B4A'
  return (
    <span
      style={{
        background: `${color}18`,
        color,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {statut}
    </span>
  )
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
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Résiliations</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Contrats résiliés dans OGGO (Résilié replacé / non replacé)
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
                <th style={th}>Cotis.</th>
                <th style={th}>Statut OGGO</th>
                <th style={th}>Date résil.</th>
                <th style={th}>Type résil.</th>
                <th style={th}>Dépôt</th>
                <th style={th}>AR</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
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
                    <td style={{ ...td, fontWeight: 600 }}>
                      {fmtEur(r.cotisation_mensuelle)}
                    </td>
                    <td style={td}>{statutBadge(r.statut_perflead)}</td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(r.date_resiliation_perflead)}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {r.type_resiliation ?? '—'}
                    </td>
                    <td style={td}>
                      {r.resil_url_depot ? (
                        <a
                          href={r.resil_url_depot}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preuve de dépôt"
                          style={{
                            color: '#2563eb',
                            textDecoration: 'none',
                            fontSize: 14,
                          }}
                        >
                          📄
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={td}>
                      {r.resil_url_ar ? (
                        <a
                          href={r.resil_url_ar}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Accusé de réception"
                          style={{
                            color: '#2563eb',
                            textDecoration: 'none',
                            fontSize: 14,
                          }}
                        >
                          📄
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
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
