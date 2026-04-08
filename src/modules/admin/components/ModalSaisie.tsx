import { useState, type FormEvent, type ReactNode } from 'react'
import { updateSaisie } from '../api'
import type { TadminContrat } from '../types'

// Options fidèles au natif modal-saisie (pas aux selects inline de
// renderSaisie qui sont divergents).
const STATUT_CIE_OPTIONS = [
  'En attente',
  'Validé',
  'Instance',
  'Résilié',
  'Rétracté',
] as const

const STATUT_SAISIE_OPTIONS = [
  { value: 'NON SAISI', label: 'Non saisi' },
  { value: 'EN ATTENTE', label: 'En attente' },
  { value: 'VALIDE', label: 'Saisi / Validé' },
] as const

const TYPE_RESIL_OPTIONS = [
  'RIA',
  'FIN MUTUELLE GROUPE',
  'RÉSILIATION CLIENT',
  'RÉSILIATION COMPAGNIE',
  'SANS MUTUELLE',
] as const

const STATUT_RESIL_OPTIONS = [
  'EN ATTENTE',
  'ENVOYÉE',
  'AR COMPAGNIE',
  'RAF',
  'REFUSEE',
] as const

interface FormState {
  statut_compagnie: string | null
  statut_saisie: string | null
  type_resiliation: string | null
  resil_statut: string | null
  date_resiliation: string | null
  date_envoi: string | null
  date_ar: string | null
}

function initialFromContrat(c: TadminContrat): FormState {
  return {
    statut_compagnie: c.statut_compagnie ?? null,
    statut_saisie: c.statut_saisie ?? 'NON SAISI',
    type_resiliation: c.type_resiliation ?? null,
    resil_statut: c.resil_statut ?? null,
    date_resiliation: c.date_resiliation ?? null,
    date_envoi: c.resil_date_envoi ?? null,
    date_ar: c.resil_date_ar ?? null,
  }
}

export interface ModalSaisieProps {
  contrat: TadminContrat
  onClose: () => void
  onSuccess: () => void
}

export function ModalSaisie({ contrat, onClose, onSuccess }: ModalSaisieProps) {
  const [form, setForm] = useState<FormState>(() => initialFromContrat(contrat))
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      await updateSaisie({
        contrat_id: contrat.id,
        statut_compagnie: form.statut_compagnie,
        statut_saisie: form.statut_saisie,
        type_resiliation: form.type_resiliation,
        resil_statut: form.resil_statut,
        date_resiliation: form.date_resiliation,
        date_envoi: form.date_envoi,
        date_ar: form.date_ar,
      })
      onSuccess()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title={`Saisie — ${contrat.client}`} onClose={onClose} width={520}>
      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
      >
        <Field label="Statut compagnie">
          <select
            value={form.statut_compagnie ?? ''}
            onChange={(e) =>
              update('statut_compagnie', e.target.value || null)
            }
            style={inputStyle}
          >
            <option value="">— Non renseigné —</option>
            {STATUT_CIE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Statut saisie">
          <select
            value={form.statut_saisie ?? 'NON SAISI'}
            onChange={(e) =>
              update('statut_saisie', e.target.value || null)
            }
            style={inputStyle}
          >
            {STATUT_SAISIE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Bloc Résiliation */}
        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            margin: '14px 0 12px',
            paddingTop: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 10,
            }}
          >
            Résiliation
          </div>

          <FormRow>
            <Field label="Type de résiliation">
              <select
                value={form.type_resiliation ?? ''}
                onChange={(e) =>
                  update('type_resiliation', e.target.value || null)
                }
                style={inputStyle}
              >
                <option value="">— Aucune —</option>
                {TYPE_RESIL_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Statut demande">
              <select
                value={form.resil_statut ?? ''}
                onChange={(e) =>
                  update('resil_statut', e.target.value || null)
                }
                style={inputStyle}
              >
                <option value="">— Non renseigné —</option>
                {STATUT_RESIL_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>

          <FormRow>
            <Field label="Date d'envoi (dépôt)">
              <input
                type="date"
                value={form.date_envoi ?? ''}
                onChange={(e) =>
                  update('date_envoi', e.target.value || null)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Date AR compagnie">
              <input
                type="date"
                value={form.date_ar ?? ''}
                onChange={(e) => update('date_ar', e.target.value || null)}
                style={inputStyle}
              />
            </Field>
          </FormRow>

          <Field label="Date effective résiliation">
            <input
              type="date"
              value={form.date_resiliation ?? ''}
              onChange={(e) =>
                update('date_resiliation', e.target.value || null)
              }
              style={inputStyle}
            />
          </Field>
        </div>

        {err && (
          <div
            style={{
              color: '#dc2626',
              fontSize: 12,
              padding: '8px 10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              marginBottom: 12,
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

// ── ModalShell local (duplication assumée vs Contrats.tsx) ──

interface ModalShellProps {
  title: string
  onClose: () => void
  width?: number
  children: ReactNode
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
