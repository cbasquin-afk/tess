import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAlertes, marquerVerifie } from '../api'
import type { AnnuaireRow } from '../types'

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function Alertes() {
  const [rows, setRows] = useState<AnnuaireRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchAlertes())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleVerify = useCallback(
    async (slug: string) => {
      // Optimistic
      setRows((prev) => prev.filter((r) => r.slug !== slug))
      try {
        await marquerVerifie(slug)
      } catch (e: unknown) {
        alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
        await load()
      }
    },
    [load],
  )

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ padding: 24, color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Alertes annuaire
      </h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        Fiches publiées avec alerte manuelle ou dernière mise à jour &gt; 90 jours.
      </p>

      {rows.length === 0 ? (
        <div
          style={{
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: 20,
            color: '#166534',
            fontSize: 14,
          }}
        >
          ✓ Aucune alerte active. Toutes les fiches publiées sont à jour.
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                <th style={th}>Compagnie</th>
                <th style={th}>Type alerte</th>
                <th style={th}>Dernière MAJ</th>
                <th style={th}>Ancienneté</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const age = daysSince(r.date_derniere_maj)
                const stale = age !== null && age > 90
                return (
                  <tr key={r.slug} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {r.seo_title_override || r.slug}
                      </div>
                      {r.seo_title_override && (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.slug}</div>
                      )}
                    </td>
                    <td style={td}>
                      {r.alerte_verif && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: 11,
                            fontWeight: 600,
                            marginRight: 4,
                          }}
                        >
                          Manuelle
                        </span>
                      )}
                      {stale && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Dépassée
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {r.date_derniere_maj
                        ? new Date(r.date_derniere_maj).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: stale ? '#dc2626' : '#64748b',
                        fontWeight: stale ? 600 : 400,
                      }}
                    >
                      {age !== null ? `${age} jours` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <Link
                        to={`/annuaire/${r.slug}`}
                        style={{
                          padding: '4px 10px',
                          background: '#1f3a8a',
                          color: '#fff',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          textDecoration: 'none',
                          marginRight: 6,
                        }}
                      >
                        Éditer
                      </Link>
                      <button
                        onClick={() => void handleVerify(r.slug)}
                        style={{
                          padding: '4px 10px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Marquer vérifié
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
}
const td: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
}

export default Alertes
