import { useMemo, useState, type ChangeEvent } from 'react'
import { useInstances } from '../hooks/useInstances'
import { resolveInstance, leverInstance } from '../api'
import { ClientCell } from '../components/ClientCell'
import type { TadminInstance } from '../types'

type Filter = 'all' | 'urgent' | 'ASAF' | 'FMA' | 'SMATIS' | 'VERALTI'

const SOURCE_FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'urgent', label: 'Urgentes' },
  { key: 'ASAF', label: 'ASAF' },
  { key: 'FMA', label: 'FMA' },
  { key: 'SMATIS', label: 'SMATIS' },
  { key: 'VERALTI', label: 'VERALTI' },
]

const SOURCE_COLORS: Record<string, string> = {
  ASAF: '#00C18B',
  FMA: '#378ADD',
  SMATIS: '#BA7517',
  VERALTI: '#534AB7',
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

function deadlineColor(jours: number | null): string {
  if (jours === null) return '#94a3b8'
  if (jours < 0) return '#E24B4A'
  if (jours <= 2) return '#E24B4A'
  if (jours <= 5) return '#BA7517'
  return '#1D9E75'
}

function joursDisplay(jours: number | null): string {
  if (jours === null) return '—'
  if (jours < 0) return `${jours}j ⚠`
  if (jours === 0) return 'auj.'
  return `${jours}j`
}

interface ResolveTarget {
  id: string
  client: string
  gmailMessageId: string | null
}

function Instances() {
  const { instances, loading, error, reload } = useInstances()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(
    null,
  )
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const visible = useMemo<TadminInstance[]>(() => {
    let rows = instances
    if (filter === 'urgent') {
      // Fidèle au natif : ≤ 2 jours = urgent
      rows = rows.filter(
        (r) => r.jours_restants !== null && r.jours_restants <= 2,
      )
    } else if (filter !== 'all') {
      rows = rows.filter((r) => r.source === filter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) =>
          r.client_nom.toLowerCase().includes(q) ||
          (r.motif ?? '').toLowerCase().includes(q),
      )
    }
    return rows
  }, [instances, filter, search])

  async function handleConfirmResolve() {
    if (!resolveTarget) return
    setResolving(true)
    setResolveError(null)
    try {
      // Le natif passe en priorité gmailMsgId, sinon l'id
      const key = resolveTarget.gmailMessageId || resolveTarget.id
      await resolveInstance(key)
      setResolveTarget(null)
      await reload()
    } catch (e: unknown) {
      setResolveError(e instanceof Error ? e.message : String(e))
    } finally {
      setResolving(false)
    }
  }

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Instances</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Alertes Gmail des compagnies (ASAF, FMA, SMATIS, VERALTI).
        </p>
      </div>

      {/* Filtres + recherche */}
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
        <div
          style={{
            display: 'flex',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {SOURCE_FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
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
                {f.label}
              </button>
            )
          })}
        </div>
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
          {visible.length} / {instances.length} ouverte
          {instances.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Banner de confirmation Resolve (modal inline) */}
      {resolveTarget && (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#92400e' }}>
              Résoudre l'instance pour {resolveTarget.client} ?
            </strong>
            <div style={{ fontSize: 12, color: '#78350f', marginTop: 2 }}>
              Cette action passe l'instance en statut "résolu" via{' '}
              <code>tadmin_resolve_instance</code>.
            </div>
            {resolveError && (
              <div
                style={{
                  fontSize: 12,
                  color: '#dc2626',
                  marginTop: 6,
                }}
              >
                Erreur : {resolveError}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setResolveTarget(null)
              setResolveError(null)
            }}
            disabled={resolving}
            style={btnSecondary}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirmResolve()
            }}
            disabled={resolving}
            style={btnPrimary}
          >
            {resolving ? '…' : '✓ Confirmer'}
          </button>
        </div>
      )}

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
            Aucune instance ouverte sur ce filtre.
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
                <th style={th}>Source</th>
                <th style={th}>Motif</th>
                <th style={th}>Reçu</th>
                <th style={th}>Deadline</th>
                <th style={{ ...th, textAlign: 'right' }}>Jours rest.</th>
                <th style={{ ...th, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const col = SOURCE_COLORS[r.source] ?? '#888780'
                const dCol = deadlineColor(r.jours_restants)
                return (
                  <tr
                    key={r.id}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td style={td}>
                      <ClientCell name={r.client_nom} />
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          background: `${col}18`,
                          color: col,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {r.source}
                      </span>
                    </td>
                    <td
                      style={{
                        ...td,
                        color: '#475569',
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={r.motif ?? undefined}
                    >
                      {r.motif ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(r.date_reception)}
                    </td>
                    <td style={{ ...td, color: dCol, fontWeight: 600 }}>
                      {fmtDate(r.deadline)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        color: dCol,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      }}
                    >
                      {joursDisplay(r.jours_restants)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        display: 'flex',
                        gap: 6,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await leverInstance(r.id)
                            await reload()
                          } catch (e: unknown) {
                            alert(
                              e instanceof Error ? e.message : 'Erreur',
                            )
                          }
                        }}
                        style={btnLever}
                      >
                        ↑ Lever
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setResolveTarget({
                            id: r.id,
                            client: r.client_nom,
                            gmailMessageId: r.gmail_message_id,
                          })
                        }
                        style={btnResolve}
                      >
                        ✓ Résoudre
                      </button>
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

const btnPrimary: React.CSSProperties = {
  background: '#00C18B',
  border: '1px solid #00A876',
  color: '#fff',
  borderRadius: 6,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnLever: React.CSSProperties = {
  background: '#dbeafe',
  border: '1px solid #378ADD40',
  color: '#1e40af',
  borderRadius: 5,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnResolve: React.CSSProperties = {
  background: '#ecfdf5',
  border: '1px solid #00C18B40',
  color: '#00A876',
  borderRadius: 5,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}

export default Instances
