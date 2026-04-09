import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useAdminContrats } from '../context/ContractsContext'
import {
  deleteContrat,
  fetchCommissions,
  insertContrat,
  type InsertContratParams,
} from '../api'
import type { TadminCommission, TadminContrat } from '../types'
import { ModalSaisie } from '../components/ModalSaisie'
import { ClientCell } from '../components/ClientCell'

// ── Constantes UI ─────────────────────────────────────────────
const COMMERCIAUX = ['Charlotte', 'Cheyenne', 'Mariam', 'Christopher'] as const

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

const ORIGINE_COLORS: Record<string, { bg: string; fg: string }> = {
  Mapapp: { bg: '#dbeafe', fg: '#1e40af' },
  Site: { bg: '#ede9fe', fg: '#5b21b6' },
  Recommandation: { bg: '#dcfce7', fg: '#15803d' },
  'Multi-équipement': { bg: '#fef3c7', fg: '#92400e' },
  'Back-office': { bg: '#f3f4f6', fg: '#374151' },
}

// Options du modal Add — fidèles au natif (pas la liste de la spec)
const TYPE_CONTRAT_OPTIONS = [
  'Mutuelle',
  'Prévoyance',
  'Obsèques',
  'Emprunteur',
  'Chiens Chats',
  'PJ',
] as const

const ORIGINE_OPTIONS = ['Mapapp', 'Multi-équipement', 'Recommandation', 'Site'] as const

type FilterPill =
  | 'all'
  | 'mois_courant'
  | 'En attente'
  | 'Validé'
  | 'Instance'
  | 'Rétracté'

const FILTER_PILLS: { key: FilterPill; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'mois_courant', label: 'Mois en cours' },
  { key: 'En attente', label: 'En attente' },
  { key: 'Validé', label: 'Validés' },
  { key: 'Instance', label: 'Instance' },
  { key: 'Rétracté', label: 'Rétractés' },
]

type SortKey =
  | 'client'
  | 'compagnie_assureur'
  | 'commercial_prenom'
  | 'date_signature'
  | 'date_effet'
  | 'cotisation_mensuelle'
  | 'commission_generee'
type SortDir = 'asc' | 'desc'

// ── Helpers format ────────────────────────────────────────────
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

function fmtMois(annee: number, mois: number): string {
  return String(mois).padStart(2, '0') + '/' + annee
}

function isCurrentMonth(dateStr: string | null): boolean {
  if (!dateStr) return false
  try {
    const d = new Date(dateStr)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    )
  } catch {
    return false
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Composant principal ──────────────────────────────────────
function Contrats() {
  const { contrats, loading, error, reload } = useAdminContrats()
  const [filter, setFilter] = useState<FilterPill>('mois_courant')
  const [commercial, setCommercial] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date_signature')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TadminContrat | null>(null)
  const [detailTarget, setDetailTarget] = useState<TadminContrat | null>(null)
  const [saisieTarget, setSaisieTarget] = useState<TadminContrat | null>(null)

  // Tri client-side
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

  // Filtres : pill + commercial + search
  const visible = useMemo<TadminContrat[]>(() => {
    let rows = sorted
    if (filter === 'mois_courant') {
      rows = rows.filter((c) => isCurrentMonth(c.date_signature))
    } else if (filter !== 'all') {
      rows = rows.filter((c) => c.statut_compagnie === filter)
    }
    if (commercial) {
      rows = rows.filter((c) => c.commercial_prenom === commercial)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (c) =>
          c.client.toLowerCase().includes(q) ||
          (c.compagnie_assureur ?? '').toLowerCase().includes(q) ||
          (c.commercial_prenom ?? '').toLowerCase().includes(q),
      )
    }
    return rows
  }, [sorted, filter, commercial, search])

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
        <h1 style={{ margin: 0, fontSize: 24 }}>Contrats</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Liste centrale des contrats — filtre Mois en cours actif par défaut.
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

        <select
          value={commercial}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setCommercial(e.target.value)
          }
          style={inputStyle}
        >
          <option value="">Tous commerciaux</option>
          {COMMERCIAUX.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          style={btnPrimary}
        >
          + Ajouter
        </button>
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
                  k="compagnie_assureur"
                  label="Compagnie"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
                <th style={th}>Origine</th>
                <SortableTh
                  k="commercial_prenom"
                  label="Commercial"
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
                  k="cotisation_mensuelle"
                  label="Cotisation"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  right
                />
                <th style={th}>Type com.</th>
                <th style={{ ...th, textAlign: 'center' }}>R/NR</th>
                <SortableTh
                  k="commission_generee"
                  label="Com. générée"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  right
                />
                <th style={{ ...th, textAlign: 'right' }}>Statut</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
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
                return (
                  <tr
                    key={c.id}
                    onClick={() => setDetailTarget(c)}
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={td}>
                      <ClientCell name={c.client} />
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {c.compagnie_assureur ?? '—'}
                    </td>
                    <td style={td}>
                      <OrigineBadge origine={c.origine} />
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
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(c.date_signature)}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(c.date_effet)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        color: '#0f172a',
                      }}
                    >
                      {c.cotisation_mensuelle
                        ? `${fmtEur(c.cotisation_mensuelle)}/m`
                        : '—'}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: '#94a3b8',
                        fontSize: 11,
                      }}
                    >
                      {c.type_commission ?? '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {c.recurrent ? (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          R
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#f3f4f6',
                            color: '#64748b',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          NR
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        color:
                          (c.commission_generee ?? 0) > 0
                            ? '#1D9E75'
                            : '#94a3b8',
                        fontWeight: (c.commission_generee ?? 0) > 0 ? 600 : 400,
                      }}
                    >
                      {fmtEur(c.commission_generee)}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {c.statut_compagnie ? (
                        <span
                          style={{
                            background: `${statutCol}18`,
                            color: statutCol,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.statut_compagnie}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{ ...td, textAlign: 'right' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSaisieTarget(c)}
                        title="Saisie & résiliation"
                        style={iconBtn}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        title="Supprimer"
                        style={{ ...iconBtn, color: '#E24B4A' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modales */}
      {addOpen && (
        <ModalAdd
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false)
            void reload()
          }}
        />
      )}
      {deleteTarget && (
        <ModalDelete
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null)
            void reload()
          }}
        />
      )}
      {detailTarget && (
        <PanelDetail
          contrat={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
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

// ── Sub-composants ──────────────────────────────────────────

function OrigineBadge({ origine }: { origine: string | null }) {
  if (!origine) return <span style={{ color: '#cbd5e1' }}>—</span>
  const c = ORIGINE_COLORS[origine] ?? { bg: '#f3f4f6', fg: '#374151' }
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {origine}
    </span>
  )
}

interface SortableThProps {
  k: SortKey
  label: string
  sortKey: SortKey
  sortDir: SortDir
  onToggle: (k: SortKey) => void
  right?: boolean
}

function SortableTh({
  k,
  label,
  sortKey,
  sortDir,
  onToggle,
  right,
}: SortableThProps) {
  const active = sortKey === k
  return (
    <th
      style={{
        textAlign: right ? 'right' : 'left',
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

// ── Modal Add ────────────────────────────────────────────────

interface ModalAddProps {
  onClose: () => void
  onSuccess: () => void
}

function ModalAdd({ onClose, onSuccess }: ModalAddProps) {
  const [form, setForm] = useState<InsertContratParams>({
    client: '',
    type_contrat: 'Mutuelle',
    origine: 'Mapapp',
    commercial_prenom: null,
    date_signature: todayISO(),
    compagnie_assureur: null,
    cotisation_mensuelle: null,
    recurrent: true,
    date_effet: null,
    type_commission: null,
    frais_service: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function update<K extends keyof InsertContratParams>(
    k: K,
    v: InsertContratParams[K],
  ) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.client.trim()) {
      setErr('Le nom du client est requis.')
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      await insertContrat(form)
      onSuccess()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="Ajouter un contrat" onClose={onClose} width={560}>
      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
      >
        <FormRow>
          <Field label="Client *">
            <input
              type="text"
              value={form.client}
              onChange={(e) => update('client', e.target.value)}
              placeholder="Nom du client"
              style={inputStyle}
              required
            />
          </Field>
          <Field label="Commercial">
            <select
              value={form.commercial_prenom ?? ''}
              onChange={(e) =>
                update('commercial_prenom', e.target.value || null)
              }
              style={inputStyle}
            >
              <option value="">— Sélectionner —</option>
              {COMMERCIAUX.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Compagnie">
            <input
              type="text"
              value={form.compagnie_assureur ?? ''}
              onChange={(e) =>
                update('compagnie_assureur', e.target.value || null)
              }
              placeholder="ASAF, FMA, COVERITY…"
              style={inputStyle}
            />
          </Field>
          <Field label="Type contrat">
            <select
              value={form.type_contrat}
              onChange={(e) => update('type_contrat', e.target.value)}
              style={inputStyle}
            >
              {TYPE_CONTRAT_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Cotisation mensuelle (€)">
            <input
              type="number"
              step="0.01"
              value={form.cotisation_mensuelle ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                update('cotisation_mensuelle', isNaN(v) ? null : v)
              }}
              placeholder="0.00"
              style={inputStyle}
            />
          </Field>
          <Field label="Type commission">
            <input
              type="text"
              value={form.type_commission ?? ''}
              onChange={(e) =>
                update('type_commission', e.target.value || null)
              }
              placeholder="PA 30/10, PS 25/15…"
              style={inputStyle}
            />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Date signature">
            <input
              type="date"
              value={form.date_signature ?? ''}
              onChange={(e) =>
                update('date_signature', e.target.value || null)
              }
              style={inputStyle}
            />
          </Field>
          <Field label="Date d'effet">
            <input
              type="date"
              value={form.date_effet ?? ''}
              onChange={(e) => update('date_effet', e.target.value || null)}
              style={inputStyle}
            />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Frais de service (€)">
            <input
              type="number"
              step="0.1"
              value={form.frais_service ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                update('frais_service', isNaN(v) ? null : v)
              }}
              placeholder="0"
              style={inputStyle}
            />
          </Field>
          <Field label="Origine">
            <select
              value={form.origine}
              onChange={(e) => update('origine', e.target.value)}
              style={inputStyle}
            >
              {ORIGINE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
        </FormRow>

        {err && (
          <div
            style={{
              color: '#dc2626',
              fontSize: 12,
              marginTop: 8,
              padding: '8px 10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={btnSecondary}
          >
            Annuler
          </button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? '…' : 'Ajouter'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Modal Delete ─────────────────────────────────────────────

interface ModalDeleteProps {
  target: TadminContrat
  onClose: () => void
  onSuccess: () => void
}

function ModalDelete({ target, onClose, onSuccess }: ModalDeleteProps) {
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setErr(null)
    try {
      await deleteContrat(target.id)
      onSuccess()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="Supprimer ce contrat" onClose={onClose} width={420}>
      <p
        style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}
      >
        Supprimer définitivement le contrat de{' '}
        <strong style={{ color: '#0f172a' }}>{target.client}</strong> ? Cette
        action supprimera aussi toutes les commissions prévues associées.
      </p>
      {err && (
        <div
          style={{
            color: '#dc2626',
            fontSize: 12,
            marginTop: 12,
            padding: '8px 10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
          }}
        >
          {err}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 18,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          style={btnSecondary}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => {
            void handleConfirm()
          }}
          disabled={submitting}
          style={btnDanger}
        >
          {submitting ? '…' : 'Supprimer définitivement'}
        </button>
      </div>
    </ModalShell>
  )
}

// ── Panel Détail (panel latéral) ─────────────────────────────

interface PanelDetailProps {
  contrat: TadminContrat
  onClose: () => void
}

function PanelDetail({ contrat, onClose }: PanelDetailProps) {
  const [commissions, setCommissions] = useState<TadminCommission[]>([])
  const [loadingCom, setLoadingCom] = useState(true)
  const [errCom, setErrCom] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingCom(true)
    setErrCom(null)
    fetchCommissions(contrat.id)
      .then((d) => {
        if (!cancelled) setCommissions(d)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setErrCom(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoadingCom(false)
      })
    return () => {
      cancelled = true
    }
  }, [contrat.id])

  const totalCom = useMemo(
    () =>
      commissions.reduce(
        (s, c) => s + (Number(c.montant_com_societe) || 0),
        0,
      ),
    [commissions],
  )

  const statutCol = contrat.statut_compagnie
    ? STATUT_COLORS[contrat.statut_compagnie] ?? '#888780'
    : '#888780'

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 999,
        }}
      />
      {/* Panel latéral */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          background: '#fff',
          borderLeft: '1px solid #e2e8f0',
          padding: 24,
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              CONTRAT
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 20 }}>
              {contrat.client}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              color: '#64748b',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Grille infos */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <DetailItem label="Compagnie" value={contrat.compagnie_assureur} />
          <DetailItem label="Commercial" value={contrat.commercial_prenom} />
          <DetailItem label="Type contrat" value={contrat.type_contrat} />
          <DetailItem
            label="Cotisation"
            value={
              contrat.cotisation_mensuelle
                ? `${fmtEur(contrat.cotisation_mensuelle)} /mois`
                : null
            }
          />
          <DetailItem
            label="Date signature"
            value={fmtDate(contrat.date_signature)}
          />
          <DetailItem
            label="Date d'effet"
            value={fmtDate(contrat.date_effet)}
          />
          <DetailItem
            label="Type commission"
            value={contrat.type_commission}
          />
          <DetailItem
            label="Statut compagnie"
            valueNode={
              contrat.statut_compagnie ? (
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
                  {contrat.statut_compagnie}
                </span>
              ) : (
                <span style={{ color: '#cbd5e1' }}>—</span>
              )
            }
          />
          <DetailItem
            label="Résiliation"
            value={contrat.type_resiliation ?? 'Aucune'}
          />
          <DetailItem label="Origine" value={contrat.origine} />
          <DetailItem
            label="Frais de service"
            value={contrat.frais_service ? fmtEur(contrat.frais_service) : null}
          />
          <DetailItem
            label="Com. totale prévue"
            valueNode={
              contrat.commission_totale_prevue ? (
                <span style={{ color: '#1D9E75', fontWeight: 600 }}>
                  {fmtEur(contrat.commission_totale_prevue)}
                </span>
              ) : (
                <span style={{ color: '#cbd5e1' }}>—</span>
              )
            }
          />
        </div>

        {/* Commissions */}
        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 8,
            }}
          >
            Commissions mensuelles prévues
          </div>
          {loadingCom ? (
            <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
              Chargement…
            </div>
          ) : errCom ? (
            <div style={{ color: '#dc2626', fontSize: 12 }}>
              Erreur : {errCom}
            </div>
          ) : commissions.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              Aucune commission prévue
            </div>
          ) : (
            <>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>
                    <th style={{ ...th, padding: '6px 8px 6px 0' }}>Mois</th>
                    <th
                      style={{
                        ...th,
                        textAlign: 'right',
                        padding: '6px 8px 6px 0',
                      }}
                    >
                      Commission
                    </th>
                    <th
                      style={{
                        ...th,
                        textAlign: 'right',
                        padding: '6px 8px 6px 0',
                      }}
                    >
                      Frais
                    </th>
                    <th style={{ ...th, padding: '6px 0 6px 0' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c, i) => (
                    <tr
                      key={`${c.annee}-${c.mois}-${i}`}
                      style={{ borderTop: '1px solid #f1f5f9' }}
                    >
                      <td
                        style={{
                          padding: '6px 8px 6px 0',
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          color: '#475569',
                        }}
                      >
                        {fmtMois(c.annee, c.mois)}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px 6px 0',
                          textAlign: 'right',
                          color: '#1D9E75',
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          fontWeight: 600,
                        }}
                      >
                        {fmtEur(c.montant_com_societe)}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px 6px 0',
                          textAlign: 'right',
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          color: '#94a3b8',
                        }}
                      >
                        {c.montant_frais && c.montant_frais > 0
                          ? fmtEur(c.montant_frais)
                          : '—'}
                      </td>
                      <td
                        style={{
                          padding: '6px 0 6px 0',
                          color: '#94a3b8',
                          fontSize: 11,
                        }}
                      >
                        {c.type_ligne ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: '#94a3b8',
                }}
              >
                Total com. :{' '}
                <strong style={{ color: '#1D9E75' }}>{fmtEur(totalCom)}</strong>{' '}
                sur {commissions.length} mois
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function DetailItem({
  label,
  value,
  valueNode,
}: {
  label: string
  value?: string | null
  valueNode?: React.ReactNode
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2 }}>
        {valueNode ?? (value && value !== '—' ? value : <span style={{ color: '#cbd5e1' }}>—</span>)}
      </div>
    </div>
  )
}

// ── Modal shell générique (overlay + card centrée) ──────────

interface ModalShellProps {
  title: string
  onClose: () => void
  width?: number
  children: React.ReactNode
}

function ModalShell({ title, onClose, width = 480, children }: ModalShellProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: 22,
          width: `min(${width}px, 92vw)`,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(15,23,42,0.25)',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 16,
            color: '#0f172a',
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}

function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: '#64748b',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Styles partagés ─────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  background: '#1f3a8a',
  border: '1px solid #1f3a8a',
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

const btnDanger: React.CSSProperties = {
  background: '#dc2626',
  border: '1px solid #dc2626',
  color: '#fff',
  borderRadius: 6,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 13,
  cursor: 'pointer',
  padding: '4px 6px',
  marginLeft: 2,
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

export default Contrats
