import { useMemo, useState, type ChangeEvent } from 'react'
import { useContrats } from '../hooks/useContrats'
import { ModalSaisie } from '../components/ModalSaisie'
import type { TadminContrat } from '../types'

type FilterPill = 'all' | 'sans_statut' | 'resil' | 'sans_saisie'

const FILTER_PILLS: { key: FilterPill; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'sans_statut', label: 'Sans validation cie' },
  { key: 'resil', label: 'Avec résiliation' },
  { key: 'sans_saisie', label: 'Non transmis' },
]

type SortKey =
  | 'client'
  | 'date_signature'
  | 'date_effet'
  | 'compagnie_assureur'
  | 'commercial_prenom'
  | 'statut_compagnie'
type SortDir = 'asc' | 'desc'

const COMM_COLORS: Record<string, string> = {
  Charlotte: '#378ADD',
  Cheyenne: '#BA7517',
  Mariam: '#534AB7',
  Christopher: '#1D9E75',
}

const STATUT_COLORS: Record<string, string> = {
  'En attente': '#BA7517',
  Validé: '#1D9E75',
  Instance: '#E24B4A',
  Rétracté: '#888780',
  Résilié: '#888780',
}

const SAISIE_LABELS: Record<string, string> = {
  'NON SAISI': 'Non saisi',
  'EN ATTENTE': 'En attente',
  VALIDE: 'Validé',
}

const SAISIE_COLORS: Record<string, string> = {
  'NON SAISI': '#888780',
  'EN ATTENTE': '#BA7517',
  VALIDE: '#1D9E75',
}

const RESIL_STATUT_COLORS: Record<string, string> = {
  'EN ATTENTE': '#BA7517',
  ENVOYÉE: '#378ADD',
  'AR COMPAGNIE': '#1D9E75',
  RAF: '#1D9E75',
  REFUSEE: '#E24B4A',
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

function Saisie() {
  const { contrats, loading, error, reload } = useContrats()
  const [filter, setFilter] = useState<FilterPill>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date_signature')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [saisieTarget, setSaisieTarget] = useState<TadminContrat | null>(null)

  const sorted = useMemo<TadminContrat[]>(() => {
    const arr = [...contrats]
    arr.sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'fr', {
        numeric: true,
      })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [contrats, sortKey, sortDir])

  const visible = useMemo<TadminContrat[]>(() => {
    let rows = sorted
    // Filtres fidèles au natif filterSaisie
    if (filter === 'sans_statut') {
      rows = rows.filter((c) => c.statut_compagnie === 'En attente')
    } else if (filter === 'resil') {
      rows = rows.filter((c) => !!c.type_resiliation)
    } else if (filter === 'sans_saisie') {
      rows = rows.filter(
        (c) => !c.statut_saisie || c.statut_saisie === '',
      )
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (c) =>
          c.client.toLowerCase().includes(q) ||
          (c.compagnie_assureur ?? '').toLowerCase().includes(q),
      )
    }
    return rows
  }, [sorted, filter, search])

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir(k === 'client' ? 'asc' : 'desc')
    }
  }

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Saisie & Résiliations</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Suivi des saisies compagnies et des résiliations en cours.
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
        <div
          style={{
            display: 'flex',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {FILTER_PILLS.map((p) => {
            const active = filter === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setFilter(p.key)}
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
                {p.label}
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
          placeholder="Rechercher…"
          style={{ ...inputStyle, flex: 1, maxWidth: 240 }}
        />

        <div style={{ flex: 1 }} />

        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {visible.length} / {contrats.length} contrats
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
            Aucun contrat sur ce filtre.
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
                <SortableTh
                  k="client"
                  label="Client"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
                <SortableTh
                  k="date_signature"
                  label="Date sign."
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
                <SortableTh
                  k="date_effet"
                  label="Date effet"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
                <SortableTh
                  k="compagnie_assureur"
                  label="Compagnie"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
                <SortableTh
                  k="commercial_prenom"
                  label="Commercial"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
                <th style={th}>Saisie</th>
                <SortableTh
                  k="statut_compagnie"
                  label="Statut cie"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
                <th style={th}>Résiliation</th>
                <th style={th}>Lettre envoyée</th>
                <th style={th}>Date résil.</th>
                <th style={th}>Accusé récept.</th>
                <th style={{ ...th, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const commCol = c.commercial_prenom
                  ? COMM_COLORS[c.commercial_prenom] ?? '#64748b'
                  : '#94a3b8'
                const statutCol = c.statut_compagnie
                  ? STATUT_COLORS[c.statut_compagnie] ?? '#888780'
                  : '#888780'
                const saisieKey = c.statut_saisie ?? ''
                const saisieLabel = SAISIE_LABELS[saisieKey] ?? '—'
                const saisieCol = SAISIE_COLORS[saisieKey] ?? '#94a3b8'
                const resilCol = c.resil_statut
                  ? RESIL_STATUT_COLORS[c.resil_statut] ?? '#888780'
                  : '#888780'
                return (
                  <tr
                    key={c.id}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td
                      style={{
                        ...td,
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {c.client}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(c.date_signature)}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(c.date_effet)}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {c.compagnie_assureur ?? '—'}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: commCol,
                        fontWeight: 600,
                      }}
                    >
                      {c.commercial_prenom ?? '—'}
                    </td>
                    <td style={td}>
                      {c.statut_saisie ? (
                        <span
                          style={{
                            background: `${saisieCol}18`,
                            color: saisieCol,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {saisieLabel}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={td}>
                      {c.statut_compagnie ? (
                        <span
                          style={{
                            background: `${statutCol}18`,
                            color: statutCol,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {c.statut_compagnie}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: '#475569',
                        fontSize: 11,
                      }}
                    >
                      {c.type_resiliation ?? '—'}
                    </td>
                    <td style={td}>
                      {c.resil_statut ? (
                        <span
                          style={{
                            color: resilCol,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {c.resil_statut}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: '#94a3b8',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: 11,
                      }}
                    >
                      {fmtDate(c.date_resiliation)}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: c.resil_date_ar ? '#1D9E75' : '#94a3b8',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: 11,
                      }}
                    >
                      {c.resil_date_ar ? `✓ ${fmtDate(c.resil_date_ar)}` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSaisieTarget(c)}
                        title="Éditer la saisie"
                        style={iconBtn}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {saisieTarget && (
        <ModalSaisie
          contrat={saisieTarget}
          onClose={() => setSaisieTarget(null)}
          onSuccess={() => {
            setSaisieTarget(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}

interface SortableThProps {
  k: SortKey
  label: string
  sortKey: SortKey
  sortDir: SortDir
  onToggle: (k: SortKey) => void
}
function SortableTh({
  k,
  label,
  sortKey,
  sortDir,
  onToggle,
}: SortableThProps) {
  const active = sortKey === k
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '8px 12px 8px 0',
        borderBottom: '1px solid #e5e7eb',
        cursor: 'pointer',
        userSelect: 'none',
        color: active ? '#0f172a' : '#64748b',
      }}
      onClick={() => onToggle(k)}
    >
      {label}
      {active && (
        <span style={{ marginLeft: 4, fontSize: 9 }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

const inputStyle: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 13,
  cursor: 'pointer',
  padding: '4px 6px',
}

export default Saisie
