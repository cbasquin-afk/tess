import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { fetchReprises, upsertReprise, deleteReprise, fetchContratsLean } from '../api'
import type { RepriseRow, ContratLean } from '../types'
import {
  tableStyle,
  trHead,
  th,
  thRight,
  td,
  tdMontant,
  trFooter,
  tdFooterLabel,
  tdFooterMontant,
  trBody,
  MONO,
} from '../styles/tableTokens'

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

const MOTIFS = [
  'Résiliation dans les 30 jours',
  'Résiliation compagnie',
  'Erreur de calcul',
  'Régularisation compagnie',
  'Autre',
] as const

const COMMERCIAL_COLOR: Record<string, string> = {
  Charlotte: '#378ADD',
  Cheyenne: '#BA7517',
  Mariam: '#534AB7',
  Christopher: '#1D9E75',
}

function fmtEur(n: number | null): string {
  if (n === null) return '—'
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

function fmtMois(annee: number, mois: number): string {
  return `${MOIS_NOMS[mois] ?? mois} ${annee}`
}

interface FormState {
  id: string | null
  client: string
  compagnie: string
  motif: string
  montant: string
  annee: string
  mois: string
  notes: string
}

const now = new Date()
const EMPTY_FORM: FormState = {
  id: null,
  client: '',
  compagnie: '',
  motif: MOTIFS[0],
  montant: '',
  annee: String(now.getFullYear()),
  mois: String(now.getMonth() + 1),
  notes: '',
}

const inputStyle: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '7px 10px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
}

function Reprises() {
  const [reprises, setReprises] = useState<RepriseRow[]>([])
  const [contrats, setContrats] = useState<ContratLean[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  async function load() {
    try {
      const [rows, lean] = await Promise.all([fetchReprises(), fetchContratsLean()])
      setReprises(rows)
      setContrats(lean)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function openNew() {
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(r: RepriseRow) {
    setForm({
      id: r.id,
      client: r.client,
      compagnie: r.compagnie ?? '',
      motif: r.motif ?? MOTIFS[0],
      montant: String(r.montant),
      annee: String(r.annee),
      mois: String(r.mois),
      notes: r.notes ?? '',
    })
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const montant = parseFloat(form.montant)
    if (!form.client.trim() || isNaN(montant)) return
    setSaving(true)
    try {
      await upsertReprise({
        id: form.id ?? undefined,
        client: form.client.trim(),
        compagnie: form.compagnie.trim() || null,
        motif: form.motif || null,
        montant,
        annee: parseInt(form.annee, 10),
        mois: parseInt(form.mois, 10),
        notes: form.notes.trim() || null,
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer cette reprise ?')) return
    try {
      await deleteReprise(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function onField(field: keyof FormState) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  // ── Client names from contrats for datalist ────────────────
  const clientNames = Array.from(
    new Set(
      contrats
        .map((c) => c.commercial_prenom)
        .filter((n): n is string => n !== null && n !== ''),
    ),
  ).sort()
  // Actually, we want unique client identifiers — contrats don't have a "client" field directly.
  // Use reprises themselves + manual entry. We'll gather all known client names.
  const allClientNames = Array.from(
    new Set([
      ...reprises.map((r) => r.client),
      ...clientNames,
    ]),
  )
    .filter(Boolean)
    .sort()

  const totalMontant = reprises.reduce((s, r) => s + r.montant, 0)

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement...</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  // ── Empty state ─────────────────────────────────────────────
  if (reprises.length === 0 && !showForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Reprises de commissions</h1>
            <p style={{ color: '#64748b', marginTop: 4 }}>
              Commissions a restituer suite a resiliation ou erreur
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            style={{
              background: '#1f3a8a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Nouvelle reprise
          </button>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px dashed #cbd5e1',
            borderRadius: 10,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F4B8;</div>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 16,
              color: '#0f172a',
              fontWeight: 600,
            }}
          >
            Aucune reprise enregistree
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#64748b',
              lineHeight: 1.6,
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Les reprises de commissions (clawbacks) seront saisies ici
            lorsqu'un contrat est resilie ou qu'une erreur de calcul est detectee.
          </p>
        </div>
      </div>
    )
  }

  // ── Main view ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Reprises de commissions</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Commissions a restituer suite a resiliation ou erreur
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openNew}
            style={{
              background: '#1f3a8a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Nouvelle reprise
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
            {form.id ? 'Modifier la reprise' : 'Nouvelle reprise'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Client
              <input
                type="text"
                value={form.client}
                onChange={onField('client')}
                list="reprises-clients"
                required
                style={inputStyle}
                placeholder="Nom du client"
              />
              <datalist id="reprises-clients">
                {allClientNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>

            <label style={labelStyle}>
              Compagnie
              <input
                type="text"
                value={form.compagnie}
                onChange={onField('compagnie')}
                style={inputStyle}
                placeholder="Compagnie"
              />
            </label>

            <label style={labelStyle}>
              Motif
              <select
                value={form.motif}
                onChange={onField('motif')}
                style={inputStyle}
              >
                {MOTIFS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 12 }}>
            <label style={labelStyle}>
              Montant reprise
              <input
                type="number"
                value={form.montant}
                onChange={onField('montant')}
                required
                min="0"
                step="0.01"
                style={{ ...inputStyle, fontFamily: MONO }}
                placeholder="0"
              />
            </label>

            <label style={labelStyle}>
              Mois
              <select
                value={form.mois}
                onChange={onField('mois')}
                style={inputStyle}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {MOIS_NOMS[m]}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Annee
              <input
                type="number"
                value={form.annee}
                onChange={onField('annee')}
                required
                min="2020"
                max="2099"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Notes
              <textarea
                value={form.notes}
                onChange={onField('notes')}
                rows={1}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Notes optionnelles"
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={cancel}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '7px 16px',
                fontSize: 13,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: '#1f3a8a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

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
        {reprises.length === 0 ? (
          <div
            style={{
              color: '#94a3b8',
              fontSize: 13,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 24,
            }}
          >
            Aucune reprise enregistree.
          </div>
        ) : (
          <table style={tableStyle}>
            <colgroup>
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 110 }} />
              <col />
              <col style={{ width: 70 }} />
            </colgroup>
            <thead>
              <tr style={trHead}>
                <th style={th}>Client</th>
                <th style={th}>Compagnie</th>
                <th style={th}>Com.</th>
                <th style={th}>Motif</th>
                <th style={th}>Mois application</th>
                <th style={thRight}>Montant reprise</th>
                <th style={th}>Notes</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reprises.map((r) => (
                <tr key={r.id} style={trBody}>
                  <td
                    style={{
                      ...td,
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {r.client}
                  </td>
                  <td style={{ ...td, color: '#475569' }}>
                    {r.compagnie ?? '—'}
                  </td>
                  <td style={td}>
                    {r.commercial ? (
                      <span
                        style={{
                          color: COMMERCIAL_COLOR[r.commercial] ?? '#64748b',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {r.commercial}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#64748b',
                      fontSize: 12,
                    }}
                  >
                    {r.motif ?? '—'}
                  </td>
                  <td style={{ ...td, color: '#475569' }}>
                    {fmtMois(r.annee, r.mois)}
                  </td>
                  <td
                    style={{
                      ...tdMontant,
                      color: '#E24B4A',
                      fontWeight: 600,
                    }}
                  >
                    {fmtEur(r.montant)}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#94a3b8',
                      fontSize: 11,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={r.notes ?? undefined}
                  >
                    {r.notes ?? '—'}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      title="Modifier"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '2px 4px',
                      }}
                    >
                      &#x270F;&#xFE0F;
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(r.id)}
                      title="Supprimer"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '2px 4px',
                      }}
                    >
                      &#x1F5D1;&#xFE0F;
                    </button>
                  </td>
                </tr>
              ))}
              <tr style={trFooter}>
                <td colSpan={5} style={tdFooterLabel}>
                  Total
                </td>
                <td style={{ ...tdFooterMontant, color: '#E24B4A' }}>
                  {fmtEur(totalMontant)}
                </td>
                <td colSpan={2} style={td}></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Reprises
