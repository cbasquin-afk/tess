import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useClotures } from '../hooks/useClotures'
import { deleteAsafCloture, upsertAsafCloture } from '../api'

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

interface DeleteTarget {
  annee: number
  mois: number
}

function Clotures() {
  const { clotures, loading, error, reload } = useClotures()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteErr(null)
    try {
      await deleteAsafCloture(deleteTarget.annee, deleteTarget.mois)
      setDeleteTarget(null)
      await reload()
    } catch (e: unknown) {
      setDeleteErr(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(false)
    }
  }

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Clôtures ASAF</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Dates de clôture comptable ASAF par mois.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          style={btnPrimary}
        >
          + Ajouter
        </button>
      </div>

      {/* Banner de confirmation suppression */}
      {deleteTarget && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#991b1b' }}>
              Supprimer la clôture {MOIS_NOMS[deleteTarget.mois]}{' '}
              {deleteTarget.annee} ?
            </strong>
            {deleteErr && (
              <div
                style={{
                  fontSize: 12,
                  color: '#dc2626',
                  marginTop: 6,
                }}
              >
                Erreur : {deleteErr}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteTarget(null)
              setDeleteErr(null)
            }}
            disabled={deleting}
            style={btnSecondary}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirmDelete()
            }}
            disabled={deleting}
            style={btnDanger}
          >
            {deleting ? '…' : 'Supprimer'}
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
        }}
      >
        {clotures.length === 0 ? (
          <div
            style={{
              color: '#94a3b8',
              fontSize: 13,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 24,
            }}
          >
            Aucune clôture enregistrée.
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
                <th style={th}>Année</th>
                <th style={th}>Mois</th>
                <th style={th}>Date de clôture</th>
                <th style={th}>Note</th>
                <th style={{ ...th, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {clotures.map((c) => (
                <tr
                  key={`${c.annee}-${c.mois}`}
                  style={{ borderTop: '1px solid #f1f5f9' }}
                >
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: '#0f172a',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {c.annee}
                  </td>
                  <td style={{ ...td, color: '#475569' }}>
                    {MOIS_NOMS[c.mois] ?? c.mois}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#0f172a',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {fmtDate(c.date_cloture)}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#94a3b8',
                      fontSize: 11,
                      maxWidth: 320,
                    }}
                  >
                    {c.note ?? '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({ annee: c.annee, mois: c.mois })
                      }
                      title="Supprimer"
                      style={{ ...iconBtn, color: '#E24B4A' }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addOpen && (
        <ModalAddCloture
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false)
            void reload()
          }}
        />
      )}
    </div>
  )
}

// ── Modal Add Clôture ───────────────────────────────────────

interface ModalAddClotureProps {
  onClose: () => void
  onSuccess: () => void
}

function ModalAddCloture({ onClose, onSuccess }: ModalAddClotureProps) {
  const now = new Date()
  const [annee, setAnnee] = useState<number>(now.getFullYear())
  const [mois, setMois] = useState<number>(now.getMonth() + 1)
  const [dateCloture, setDateCloture] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dateCloture) {
      setErr('La date de clôture est requise.')
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      await upsertAsafCloture({
        annee,
        mois,
        date_cloture: dateCloture,
        note: note.trim() || null,
      })
      onSuccess()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="Ajouter une clôture ASAF" onClose={onClose}>
      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
      >
        <FormRow>
          <Field label="Année">
            <input
              type="number"
              value={annee}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAnnee(parseInt(e.target.value, 10) || now.getFullYear())
              }
              min={2020}
              max={2099}
              style={inputStyle}
            />
          </Field>
          <Field label="Mois">
            <select
              value={mois}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setMois(parseInt(e.target.value, 10))
              }
              style={inputStyle}
            >
              {MOIS_NOMS.slice(1).map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </FormRow>

        <Field label="Date de clôture">
          <input
            type="date"
            value={dateCloture}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDateCloture(e.target.value)
            }
            style={inputStyle}
            required
          />
        </Field>

        <Field label="Note (optionnel)">
          <textarea
            value={note}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setNote(e.target.value)
            }
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>

        {err && (
          <div
            style={{
              color: '#dc2626',
              fontSize: 12,
              padding: '8px 10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              marginTop: 8,
              marginBottom: 8,
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
            marginTop: 12,
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
            {submitting ? '…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── ModalShell + helpers ────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
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
          width: 'min(440px, 92vw)',
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

function FormRow({ children }: { children: ReactNode }) {
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
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
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

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

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
}

export default Clotures
