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
  insertContrat,
  updateSaisie,
  updateField,
} from '../api'
import { ClientCell } from '../components/ClientCell'
import type { ZoneTamponRow } from '../types'

const COMMERCIAL_COLORS: Record<string, string> = {
  Charlotte: '#378ADD',
  Cheyenne: '#BA7517',
  Mariam: '#534AB7',
  Christopher: '#1D9E75',
}

const TYPE_COMMISSION_OPTIONS = [
  'PA 34/10',
  'PA 30/10',
  'PA 40/10',
  'PS 25/15',
  'PS 25/10',
  'LE 20/20',
  'LR 30/10',
  'Linéaire 17',
  'Linéaire 10',
] as const

const STATUT_CIE_OPTIONS = ['En attente', 'Validé', 'Instance'] as const

const SAISIE_OPTIONS = [
  'A scanner',
  'Téléversée',
  'Extranet',
  'Mail cie',
  'Saisie',
] as const

const RESIL_TYPES = [
  '— Aucune —',
  'Pas de mutuelle',
  'Départ à la retraite',
  'Fin de portabilité',
  'Client lui-même',
  'RIA',
  'Échéance principale',
  'Augmentation tarifaire',
  'Autre',
] as const

const RESIL_AVEC_ACTION = ['RIA', 'Échéance principale', 'Augmentation tarifaire', 'Autre']

const RESIL_STATUTS = ['A faire', 'Faite'] as const

const COMMERCIAUX = ['Charlotte', 'Cheyenne', 'Mariam', 'Christopher'] as const

const COMPAGNIES = [
  'ASAF', 'SWISSLIFE', 'FMA', 'APRIL', 'COVERITY',
  'ALPTIS', 'UTWIN', 'APICIL', 'HENNER', 'GSMC',
] as const

const TYPE_CONTRAT_OPTIONS = [
  'Mutuelle', 'Obsèques', 'Prévoyance', 'Animal', 'Emprunteur', 'Dépendance',
] as const

const ORIGINE_OPTIONS = [
  'Mapapp', 'Recommandation', 'Multi Equipement', 'Back-office', 'Site',
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

function fmtEur(n: number | null): string {
  if (n === null) return '—'
  return (
    n.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

interface EditForm {
  type_commission: string
  date_signature: string
  date_effet: string
  statut_compagnie: string
  statut_saisie: string
  date_transmission: string
  type_resiliation: string
  resil_statut: string
  date_envoi: string
  date_ar: string
  date_resiliation: string
}

function buildForm(r: ZoneTamponRow): EditForm {
  return {
    type_commission: r.type_commission ?? '',
    date_signature: r.date_signature ?? '',
    date_effet: r.date_effet ?? '',
    statut_compagnie: r.statut_compagnie ?? 'En attente',
    statut_saisie: '',
    date_transmission: '',
    type_resiliation: '— Aucune —',
    resil_statut: 'A faire',
    date_envoi: '',
    date_ar: '',
    date_resiliation: '',
  }
}

function ZoneTampon() {
  const [rows, setRows] = useState<ZoneTamponRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

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

  function toggleExpand(r: ZoneTamponRow) {
    if (expandedId === r.id) {
      setExpandedId(null)
      setForm(null)
    } else {
      setExpandedId(r.id)
      setForm(buildForm(r))
    }
  }

  function updateForm<K extends keyof EditForm>(k: K, v: EditForm[K]) {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev))
  }

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  async function handleSave(id: string) {
    if (!form) return
    setSaving(true)
    try {
      // Update type_commission, dates, statut_compagnie via updateField
      if (form.type_commission) {
        await updateField(id, 'type_commission', form.type_commission)
      }
      if (form.date_signature) {
        await updateField(id, 'date_signature', form.date_signature)
      }
      if (form.date_effet) {
        await updateField(id, 'date_effet', form.date_effet)
      }
      if (form.statut_compagnie) {
        await updateField(id, 'statut_compagnie', form.statut_compagnie)
      }

      // Update saisie + résiliation via updateSaisie
      const resilType =
        form.type_resiliation !== '— Aucune —'
          ? form.type_resiliation
          : null
      await updateSaisie({
        contrat_id: id,
        statut_compagnie: form.statut_compagnie || null,
        statut_saisie: form.statut_saisie || null,
        type_resiliation: resilType,
        resil_statut: resilType ? form.resil_statut : null,
        date_resiliation: form.date_resiliation || null,
        date_envoi: form.date_envoi || null,
        date_ar: form.date_ar || null,
      })

      setToast('Enregistré')
      await load()
      // Re-populate form with fresh data
      const fresh = rows.find((r) => r.id === id)
      if (fresh) setForm(buildForm(fresh))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleValider(id: string) {
    setBusy(id)
    setMenuOpen(null)
    try {
      await validerContrat(id)
      setExpandedId(null)
      setForm(null)
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function handleRetracter(id: string) {
    if (
      !window.confirm(
        'Rétracter ce contrat ? Cette action est irréversible.',
      )
    )
      return
    setBusy(id)
    setMenuOpen(null)
    try {
      await retracterContrat(id)
      setExpandedId(null)
      setForm(null)
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function handleInstance(id: string) {
    const motif = window.prompt("Motif de l'instance (optionnel) :")
    if (motif === null) return
    setBusy(id)
    setMenuOpen(null)
    try {
      await passerInstance(id, motif || undefined)
      setExpandedId(null)
      setForm(null)
      await load()
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = () => setMenuOpen(null)
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

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            background: '#00C18B',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast}
        </div>
      )}

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
          style={searchInput}
        />
        <div style={{ flex: 1 }} />
        <span style={countBadge}>
          {visible.length} contrat{visible.length > 1 ? 's' : ''} à valider
        </span>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={btnPrimary}
        >
          + Nouveau contrat
        </button>
      </div>

      {/* Modal Nouveau contrat */}
      {showAdd && (
        <AddContratModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false)
            void load()
          }}
        />
      )}

      {/* Table */}
      <div style={cardStyle}>
        {visible.length === 0 ? (
          <div style={emptyStyle}>Aucun contrat en zone tampon.</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={trHead}>
                <th style={th}>Client</th>
                <th style={th}>Commercial</th>
                <th style={th}>Compagnie</th>
                <th style={th}>Cotis.</th>
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
                    <tr
                      style={{
                        borderTop: '1px solid #f1f5f9',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleExpand(r)}
                    >
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpand(r)}
                            style={btnGray}
                            title="Détail"
                          >
                            {isExpanded ? '▾' : '✎'}
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpen(isMenuOpen ? null : r.id)
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
                                style={menuDropdown}
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
                                    borderBottom: 'none',
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

                    {/* Drill-down — editable form */}
                    {isExpanded && form && (
                      <tr>
                        <td
                          colSpan={9}
                          style={{ padding: 0, background: '#f8fafc' }}
                        >
                          <div style={drilldownStyle}>
                            {/* Section 1: Données contrat */}
                            <Section title="Données contrat">
                              <div style={fieldGrid}>
                                <Field label="Type commission">
                                  <select
                                    value={form.type_commission}
                                    onChange={(e) =>
                                      updateForm(
                                        'type_commission',
                                        e.target.value,
                                      )
                                    }
                                    style={inputStyle}
                                  >
                                    <option value="">—</option>
                                    {TYPE_COMMISSION_OPTIONS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <Field label="Date signature">
                                  <input
                                    type="date"
                                    value={form.date_signature}
                                    onChange={(e) =>
                                      updateForm(
                                        'date_signature',
                                        e.target.value,
                                      )
                                    }
                                    style={inputStyle}
                                  />
                                </Field>
                                <Field label="Date effet">
                                  <input
                                    type="date"
                                    value={form.date_effet}
                                    onChange={(e) =>
                                      updateForm(
                                        'date_effet',
                                        e.target.value,
                                      )
                                    }
                                    style={inputStyle}
                                  />
                                </Field>
                                <Field label="Statut compagnie">
                                  <select
                                    value={form.statut_compagnie}
                                    onChange={(e) =>
                                      updateForm(
                                        'statut_compagnie',
                                        e.target.value,
                                      )
                                    }
                                    style={inputStyle}
                                  >
                                    {STATUT_CIE_OPTIONS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                              </div>
                            </Section>

                            {/* Section 2: Saisie compagnie */}
                            <Section title="Saisie compagnie">
                              <div style={fieldGrid}>
                                <Field label="Statut saisie">
                                  <select
                                    value={form.statut_saisie}
                                    onChange={(e) =>
                                      updateForm(
                                        'statut_saisie',
                                        e.target.value,
                                      )
                                    }
                                    style={inputStyle}
                                  >
                                    <option value="">—</option>
                                    {SAISIE_OPTIONS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <Field label="Date de transmission">
                                  <input
                                    type="date"
                                    value={form.date_transmission}
                                    onChange={(e) =>
                                      updateForm(
                                        'date_transmission',
                                        e.target.value,
                                      )
                                    }
                                    style={inputStyle}
                                  />
                                </Field>
                              </div>
                            </Section>

                            {/* Section 3: Résiliation ancienne mutuelle */}
                            <Section title="Résiliation ancienne mutuelle">
                              <div style={fieldGrid}>
                                <Field label="Type résiliation">
                                  <select
                                    value={form.type_resiliation}
                                    onChange={(e) =>
                                      updateForm(
                                        'type_resiliation',
                                        e.target.value,
                                      )
                                    }
                                    style={inputStyle}
                                  >
                                    {RESIL_TYPES.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                {form.type_resiliation !== '— Aucune —' &&
                                  RESIL_AVEC_ACTION.includes(form.type_resiliation) && (
                                    <Field label="Statut">
                                      <select
                                        value={form.resil_statut}
                                        onChange={(e) =>
                                          updateForm(
                                            'resil_statut',
                                            e.target.value,
                                          )
                                        }
                                        style={inputStyle}
                                      >
                                        {RESIL_STATUTS.map((o) => (
                                          <option key={o} value={o}>
                                            {o}
                                          </option>
                                        ))}
                                      </select>
                                    </Field>
                                  )}
                              </div>
                            </Section>

                            {/* Enregistrer */}
                            <div style={{ marginTop: 4 }}>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => {
                                  void handleSave(r.id)
                                }}
                                style={btnPrimary}
                              >
                                {saving ? '…' : 'Enregistrer'}
                              </button>
                            </div>

                            {/* Workflow actions */}
                            <div
                              style={{
                                display: 'flex',
                                gap: 8,
                                borderTop: '1px solid #e5e7eb',
                                paddingTop: 12,
                                marginTop: 4,
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
                                ✓ Valider le contrat
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

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
        {title}
      </h4>
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
    <div style={{ minWidth: 160, flex: '1 1 160px' }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Modal Nouveau contrat ────────────────────────────────────

function AddContratModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [client, setClient] = useState('')
  const [commercial, setCommercial] = useState<string>(COMMERCIAUX[0])
  const [compagnie, setCompagnie] = useState<string>(COMPAGNIES[0])
  const [cotisation, setCotisation] = useState<number>(0)
  const [typeCommission, setTypeCommission] = useState<string>(TYPE_COMMISSION_OPTIONS[0])
  const [dateSignature, setDateSignature] = useState('')
  const [dateEffet, setDateEffet] = useState('')
  const [typeContrat, setTypeContrat] = useState('Mutuelle')
  const [origine, setOrigine] = useState('Mapapp')
  const [fraisService, setFraisService] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [statutSaisie, setStatutSaisie] = useState('')
  const [typeResiliation, setTypeResiliation] = useState('— Aucune —')
  const [resilStatut, setResilStatut] = useState('A faire')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!client.trim()) { alert('Client requis'); return }
    if (!dateSignature) { alert('Date signature requise'); return }
    setSubmitting(true)
    try {
      await insertContrat({
        client: client.trim(),
        type_contrat: typeContrat,
        origine,
        commercial_prenom: commercial,
        date_signature: dateSignature,
        compagnie_assureur: compagnie,
        cotisation_mensuelle: cotisation,
        recurrent: true,
        date_effet: dateEffet || null,
        type_commission: typeCommission,
        frais_service: fraisService,
      })
      // Save saisie + résiliation if set
      // Note: insertContrat creates the contrat, updateSaisie needs the ID
      // For now the RPC handles type_resiliation via p_type_resiliation param
      // Additional saisie fields can be set after creation
      onSuccess()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Nouveau contrat</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Obligatoires */}
          <div style={fieldGrid}>
            <Field label="Client *">
              <input value={client} onChange={(e) => setClient(e.target.value)} style={inputStyle} placeholder="Nom du client" />
            </Field>
            <Field label="Commercial *">
              <select value={commercial} onChange={(e) => setCommercial(e.target.value)} style={inputStyle}>
                {COMMERCIAUX.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div style={fieldGrid}>
            <Field label="Compagnie *">
              <select value={compagnie} onChange={(e) => setCompagnie(e.target.value)} style={inputStyle}>
                {COMPAGNIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Cotisation mensuelle *">
              <input type="number" step="0.01" value={cotisation} onChange={(e) => setCotisation(parseFloat(e.target.value) || 0)} style={inputStyle} />
            </Field>
          </div>
          <div style={fieldGrid}>
            <Field label="Type commission *">
              <select value={typeCommission} onChange={(e) => setTypeCommission(e.target.value)} style={inputStyle}>
                {TYPE_COMMISSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Date signature *">
              <input type="date" value={dateSignature} onChange={(e) => setDateSignature(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Date effet">
              <input type="date" value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {/* Optionnels */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>OPTIONNEL</div>
            <div style={fieldGrid}>
              <Field label="Type contrat">
                <select value={typeContrat} onChange={(e) => setTypeContrat(e.target.value)} style={inputStyle}>
                  {TYPE_CONTRAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Origine">
                <select value={origine} onChange={(e) => setOrigine(e.target.value)} style={inputStyle}>
                  {ORIGINE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Frais de service">
                <input type="number" step="0.01" value={fraisService} onChange={(e) => setFraisService(parseFloat(e.target.value) || 0)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ ...fieldGrid, marginTop: 10 }}>
              <Field label="Statut saisie">
                <select value={statutSaisie} onChange={(e) => setStatutSaisie(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  {SAISIE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Type résiliation">
                <select value={typeResiliation} onChange={(e) => setTypeResiliation(e.target.value)} style={inputStyle}>
                  {RESIL_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              {typeResiliation !== '— Aucune —' && RESIL_AVEC_ACTION.includes(typeResiliation) && (
                <Field label="Statut résiliation">
                  <select value={resilStatut} onChange={(e) => setResilStatut(e.target.value)} style={inputStyle}>
                    {RESIL_STATUTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnGray}>Annuler</button>
            <button type="button" disabled={submitting} onClick={() => { void handleSubmit() }} style={btnPrimary}>
              {submitting ? '…' : 'Créer le contrat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}
const trHead: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 600,
}
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }
const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 18,
  overflowX: 'auto',
}
const emptyStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 13,
  fontStyle: 'italic',
  textAlign: 'center',
  padding: 24,
}
const searchInput: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#f9fafb',
  color: '#374151',
  flex: 1,
  maxWidth: 280,
}
const countBadge: React.CSSProperties = {
  background: '#f0f9ff',
  color: '#1e40af',
  padding: '4px 12px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
}
const drilldownStyle: React.CSSProperties = {
  borderTop: '1px solid #e2e8f0',
  padding: '14px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}
const fieldGrid: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
}
const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  width: '100%',
  background: '#fff',
}
const btnPrimary: React.CSSProperties = {
  background: '#00C18B',
  border: 'none',
  color: '#fff',
  borderRadius: 6,
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
const btnGreen: React.CSSProperties = {
  background: '#ecfdf5',
  border: '1px solid #00C18B40',
  color: '#00A876',
  borderRadius: 5,
  padding: '6px 14px',
  fontSize: 12,
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
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}
const menuDropdown: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: '100%',
  marginTop: 4,
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  zIndex: 50,
  minWidth: 160,
  overflow: 'hidden',
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
