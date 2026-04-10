import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'
import {
  fetchZoneTampon,
  validerContrat,
  retracterContrat,
  passerInstance,
} from '../api'
import { ClientCell } from '../components/ClientCell'
import type { ZoneTamponRow } from '../types'

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

function ZoneTampon() {
  const [rows, setRows] = useState<ZoneTamponRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchZoneTampon()
      setRows(data)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo<ZoneTamponRow[]>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.client.toLowerCase().includes(q))
  }, [rows, search])

  async function handleValider(id: string) {
    setBusy(id)
    setMenuOpen(null)
    try {
      await validerContrat(id)
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function handleRetracter(id: string) {
    if (!window.confirm('Rétracter ce contrat ? Cette action est irréversible.'))
      return
    setBusy(id)
    setMenuOpen(null)
    try {
      await retracterContrat(id)
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function handleInstance(id: string) {
    const motif = window.prompt('Motif de l\'instance (optionnel) :')
    if (motif === null) return // cancelled
    setBusy(id)
    setMenuOpen(null)
    try {
      await passerInstance(id, motif || undefined)
      await load()
    } finally {
      setBusy(null)
    }
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick() {
      setMenuOpen(null)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Zone Tampon</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Contrats en attente de validation — commissions calculées mais non
          intégrées
        </p>
      </div>

      {/* Search + count */}
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
        <span
          style={{
            background: '#f0f9ff',
            color: '#1e40af',
            padding: '4px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {visible.length} contrat{visible.length > 1 ? 's' : ''} à valider
        </span>
      </div>

      {/* Table */}
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
            Aucun contrat en zone tampon.
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
                <th style={th}>Cotis./mois</th>
                <th style={th}>Type com.</th>
                <th style={th}>Date sig.</th>
                <th style={th}>Date effet</th>
                <th style={th}>Statut cie</th>
                <th style={{ ...th, textAlign: 'right', width: 80 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const comCol =
                  COMMERCIAL_COLORS[r.commercial_prenom ?? ''] ?? '#64748b'
                const isBusy = busy === r.id
                const isExpanded = expandedId === r.id
                const isMenuOpen = menuOpen === r.id

                return (
                  <Fragment key={r.id}>
                    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={td}>
                        <ClientCell name={r.client} />
                      </td>
                      <td style={td}>
                        {r.commercial_prenom ? (
                          <span
                            style={{
                              background: `${comCol}18`,
                              color: comCol,
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
                      <td style={{ ...td, color: '#64748b' }}>
                        {r.type_commission ?? '—'}
                      </td>
                      <td style={{ ...td, color: '#94a3b8' }}>
                        {fmtDate(r.date_signature)}
                      </td>
                      <td style={{ ...td, color: '#94a3b8' }}>
                        {fmtDate(r.date_effet)}
                      </td>
                      <td style={{ ...td, color: '#475569' }}>
                        {r.statut_compagnie ?? '—'}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          {/* Edit button → drill-down */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(
                                isExpanded ? null : r.id,
                              )
                            }
                            style={btnGray}
                            title="Détail"
                          >
                            ✎
                          </button>

                          {/* ··· menu */}
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpen(
                                  isMenuOpen ? null : r.id,
                                )
                              }}
                              style={{
                                ...btnGray,
                                padding: '4px 8px',
                                letterSpacing: 2,
                              }}
                            >
                              ···
                            </button>
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  marginTop: 4,
                                  background: '#fff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 8,
                                  boxShadow:
                                    '0 4px 12px rgba(0,0,0,0.1)',
                                  zIndex: 50,
                                  minWidth: 160,
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleValider(r.id)
                                  }}
                                  style={menuItem}
                                >
                                  <span style={{ color: '#00A876' }}>
                                    ✓
                                  </span>{' '}
                                  Valider
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleRetracter(r.id)
                                  }}
                                  style={menuItem}
                                >
                                  <span style={{ color: '#64748b' }}>
                                    ⊘
                                  </span>{' '}
                                  Rétracter
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleInstance(r.id)
                                  }}
                                  style={{
                                    ...menuItem,
                                    color: '#dc2626',
                                  }}
                                >
                                  <span>⚠</span> Instance
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Drill-down */}
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={9}
                          style={{ padding: 0, background: '#f8fafc' }}
                        >
                          <div
                            style={{
                              borderTop: '1px solid #e2e8f0',
                              padding: '14px 20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 14,
                            }}
                          >
                            {/* Données contrat */}
                            <div>
                              <h4
                                style={{
                                  margin: '0 0 8px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: '#0f172a',
                                }}
                              >
                                Données contrat
                              </h4>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns:
                                    'repeat(auto-fit, minmax(180px, 1fr))',
                                  gap: 8,
                                }}
                              >
                                <InfoField
                                  label="Type contrat"
                                  value={r.type_contrat}
                                />
                                <InfoField
                                  label="Origine"
                                  value={r.origine}
                                />
                                <InfoField
                                  label="Compagnie"
                                  value={r.compagnie_assureur}
                                />
                                <InfoField
                                  label="Type commission"
                                  value={r.type_commission}
                                />
                                <InfoField
                                  label="Cotisation"
                                  value={fmtEur(
                                    r.cotisation_mensuelle,
                                  )}
                                />
                                <InfoField
                                  label="Date signature"
                                  value={fmtDate(r.date_signature)}
                                />
                                <InfoField
                                  label="Date effet"
                                  value={fmtDate(r.date_effet)}
                                />
                                <InfoField
                                  label="Statut compagnie"
                                  value={r.statut_compagnie}
                                />
                              </div>
                            </div>

                            {/* Actions workflow */}
                            <div
                              style={{
                                display: 'flex',
                                gap: 8,
                                borderTop: '1px solid #e5e7eb',
                                paddingTop: 12,
                              }}
                            >
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  void handleValider(r.id)
                                }}
                                style={btnGreen}
                              >
                                ✓ Valider
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  void handleRetracter(r.id)
                                }}
                                style={btnGray}
                              >
                                ⊘ Rétracter
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  void handleInstance(r.id)
                                }}
                                style={btnRed}
                              >
                                ⚠ Instance
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function InfoField({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <div
        style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: value && value !== '—' ? '#0f172a' : '#cbd5e1',
          marginTop: 2,
        }}
      >
        {value ?? '—'}
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

const btnGreen: React.CSSProperties = {
  background: '#ecfdf5',
  border: '1px solid #00C18B40',
  color: '#00A876',
  borderRadius: 5,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}
const btnGray: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  color: '#64748b',
  borderRadius: 5,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}
const btnRed: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #E24B4A40',
  color: '#dc2626',
  borderRadius: 5,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}
const menuItem: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 500,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  color: '#374151',
  borderBottom: '1px solid #f1f5f9',
}

export default ZoneTampon
