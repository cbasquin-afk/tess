import { useMemo, useState, type ChangeEvent } from 'react'
import { useAdminContrats } from '../context/ContractsContext'
import { ModalSaisie } from '../components/ModalSaisie'
import {
  InlineSelect,
  type InlineSelectOption,
} from '../components/InlineSelect'
import { ClientCell } from '../components/ClientCell'
import type { TadminContrat } from '../types'

// Options unifiées avec celles du modal-saisie pour cohérence
const SAISIE_INLINE_OPTIONS: readonly InlineSelectOption[] = [
  { value: 'NON SAISI', label: 'Non saisi', color: '#888780' },
  { value: 'EN ATTENTE', label: 'En attente', color: '#BA7517' },
  { value: 'VALIDE', label: 'Validé', color: '#1D9E75' },
]

const STATUT_CIE_INLINE_OPTIONS: readonly InlineSelectOption[] = [
  { value: 'En attente', label: 'En attente', color: '#BA7517' },
  { value: 'Validé', label: 'Validé', color: '#1D9E75' },
  { value: 'Instance', label: 'Instance', color: '#E24B4A' },
  { value: 'Rétracté', label: 'Rétracté', color: '#888780' },
  { value: 'Résilié', label: 'Résilié', color: '#888780' },
]

const RESIL_STATUT_INLINE_OPTIONS: readonly InlineSelectOption[] = [
  { value: 'EN ATTENTE', label: 'En attente', color: '#BA7517' },
  { value: 'ENVOYÉE', label: 'Envoyée', color: '#378ADD' },
  { value: 'AR COMPAGNIE', label: 'AR Compagnie', color: '#1D9E75' },
  { value: 'RAF', label: 'RAF', color: '#1D9E75' },
  { value: 'REFUSEE', label: 'Refusée', color: '#E24B4A' },
]

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
  const { contrats, loading, error, reload } = useAdminContrats()
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
                <th style={th}>Preuve dépôt</th>
                <th style={th}>Accusé récept.</th>
                <th style={{ ...th, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const commCol = c.commercial_prenom
                  ? COMM_COLORS[c.commercial_prenom] ?? '#64748b'
                  : '#94a3b8'
                return (
                  <tr
                    key={c.id}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td style={td}>
                      <ClientCell name={c.client} />
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
                    {/* Saisie : InlineSelect statut_saisie */}
                    <td style={td}>
                      <InlineSelect
                        contratId={c.id}
                        field="statut_saisie"
                        value={c.statut_saisie}
                        options={SAISIE_INLINE_OPTIONS}
                      />
                    </td>
                    {/* Statut cie : InlineSelect statut_compagnie */}
                    <td style={td}>
                      <InlineSelect
                        contratId={c.id}
                        field="statut_compagnie"
                        value={c.statut_compagnie}
                        options={STATUT_CIE_INLINE_OPTIONS}
                      />
                    </td>
                    {/* Résiliation : InlineSelect resil_statut + sub type_resiliation */}
                    <td style={td}>
                      <InlineSelect
                        contratId={c.id}
                        field="resil_statut"
                        value={c.resil_statut}
                        options={RESIL_STATUT_INLINE_OPTIONS}
                      />
                      {c.type_resiliation && (
                        <div
                          style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            marginTop: 2,
                          }}
                        >
                          {c.type_resiliation}
                        </div>
                      )}
                    </td>
                    {/* Lettre envoyée : date d'envoi */}
                    <td
                      style={{
                        ...td,
                        color: '#94a3b8',
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: 11,
                      }}
                    >
                      {fmtDate(c.resil_date_envoi)}
                    </td>
                    {/* Preuve dépôt : lien PDF resil_url_depot */}
                    <td style={td}>
                      {c.resil_url_depot ? (
                        <a
                          href={c.resil_url_depot}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: '#378ADD',
                            textDecoration: 'none',
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                            borderBottom: '1px dashed #378ADD',
                          }}
                          title="Justificatif de dépôt"
                        >
                          📎{' '}
                          {c.resil_date_envoi
                            ? fmtDate(c.resil_date_envoi)
                            : 'Voir'}
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    {/* Accusé récept : lien resil_url_ar ou date avec ✓ */}
                    <td style={td}>
                      {c.resil_date_ar ? (
                        c.resil_url_ar ? (
                          <a
                            href={c.resil_url_ar}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: '#1D9E75',
                              textDecoration: 'none',
                              fontSize: 11,
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                              fontWeight: 600,
                              borderBottom: '1px dashed #1D9E75',
                            }}
                            title="Accusé de réception"
                          >
                            ✓ {fmtDate(c.resil_date_ar)}
                          </a>
                        ) : (
                          <span
                            style={{
                              color: '#1D9E75',
                              fontSize: 11,
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                              fontWeight: 600,
                            }}
                          >
                            ✓ {fmtDate(c.resil_date_ar)}
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSaisieTarget(c)}
                        title="Éditer la saisie complète"
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
