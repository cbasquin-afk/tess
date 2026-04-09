import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchMargeMensuelle,
  fetchCharges,
  upsertCharge,
  deleteCharge,
} from '../api'
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
import type { MargeMensuelle, ChargeMensuelle } from '../types'

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

function fmtEur(n: number): string {
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

const CATEGORIES = [
  'OGGO',
  'Téléphonie',
  'Communication',
  'Site',
  'Autre',
] as const

const FOURNISSEURS_PAR_CATEGORIE: Record<string, string[] | null> = {
  OGGO: ['Oggo', 'Gocardless OGGO'],
  Téléphonie: ['Ringover'],
  Communication: ['JRMC', 'ON OFF', 'Autre'],
  Site: ['Supabase', 'Netlify', 'GitHub', 'Anthropic', 'Stackblitz', 'Autre'],
  Autre: null, // free text
}

const CARD_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 18,
}

// ── Sub-components ─────────────────────────────────────────

interface KpiProps {
  label: string
  value: string
  hint?: string
  color?: string
}

function Kpi({ label, value, hint, color }: KpiProps) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
          fontFamily: MONO,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>
      )}
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={CARD_STYLE}>
      <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
      {label}
    </div>
  )
}

// ── Charge form state ──────────────────────────────────────

interface ChargeFormState {
  id?: string
  categorie: string
  fournisseur: string
  libelle: string
  montant: number
  notes: string
}

const EMPTY_FORM: ChargeFormState = {
  categorie: CATEGORIES[0],
  fournisseur: 'Oggo',
  libelle: '',
  montant: 0,
  notes: '',
}

// ── Main component ─────────────────────────────────────────

function Marge() {
  const [margeData, setMargeData] = useState<MargeMensuelle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drill-down state
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [chargesCache, setChargesCache] = useState<Map<string, ChargeMensuelle[]>>(new Map())

  // Section 3: charge entry
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  const [selYear, setSelYear] = useState(curYear)
  const [selMonth, setSelMonth] = useState(curMonth)
  const [saisieCharges, setSaisieCharges] = useState<ChargeMensuelle[]>([])
  const [saisieLoading, setSaisieLoading] = useState(false)

  // Inline form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ChargeFormState>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  // ── Data fetching ──────────────────────────────────────

  const loadMarge = useCallback(async () => {
    try {
      const data = await fetchMargeMensuelle()
      setMargeData(data)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const loadSaisieCharges = useCallback(async () => {
    setSaisieLoading(true)
    try {
      const data = await fetchCharges(selYear, selMonth)
      setSaisieCharges(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaisieLoading(false)
    }
  }, [selYear, selMonth])

  useEffect(() => {
    setLoading(true)
    loadMarge().finally(() => setLoading(false))
  }, [loadMarge])

  useEffect(() => {
    loadSaisieCharges()
  }, [loadSaisieCharges])

  // ── Derived data ───────────────────────────────────────

  const currentMonth = useMemo(() => {
    return (
      margeData.find((r) => r.annee === curYear && r.mois === curMonth) ?? null
    )
  }, [margeData, curYear, curMonth])

  // Sorted ASC (oldest first) — API already returns ASC
  const sortedRows = useMemo(() => [...margeData], [margeData])

  const totals = useMemo(() => {
    return sortedRows.reduce(
      (acc, r) => ({
        com_societe: acc.com_societe + r.com_societe,
        frais_service: acc.frais_service + r.frais_service,
        nb_leads: acc.nb_leads + r.nb_leads,
        cout_leads: acc.cout_leads + r.cout_leads,
        reprises: acc.reprises + r.reprises,
        total_charges: acc.total_charges + r.total_charges,
        marge_nette: acc.marge_nette + r.marge_nette,
      }),
      {
        com_societe: 0,
        frais_service: 0,
        nb_leads: 0,
        cout_leads: 0,
        reprises: 0,
        total_charges: 0,
        marge_nette: 0,
      },
    )
  }, [sortedRows])

  // ── Drill-down toggle ──────────────────────────────────

  const toggleRow = useCallback(
    async (annee: number, mois: number) => {
      const key = `${annee}-${mois}`
      if (expandedRow === key) {
        setExpandedRow(null)
        return
      }
      setExpandedRow(key)
      if (!chargesCache.has(key)) {
        try {
          const charges = await fetchCharges(annee, mois)
          setChargesCache((prev) => new Map(prev).set(key, charges))
        } catch (e) {
          console.error('Erreur chargement charges:', e)
        }
      }
    },
    [expandedRow, chargesCache],
  )

  // ── Charge CRUD ────────────────────────────────────────

  const refreshAll = useCallback(async () => {
    await Promise.all([loadMarge(), loadSaisieCharges()])
    // Invalidate drill-down cache
    setChargesCache(new Map())
  }, [loadMarge, loadSaisieCharges])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await upsertCharge({
        id: form.id,
        annee: selYear,
        mois: selMonth,
        categorie: form.categorie,
        fournisseur: form.fournisseur,
        libelle: form.libelle || null,
        montant: form.montant,
        notes: form.notes || null,
      })
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      await refreshAll()
    } catch (e) {
      alert(`Erreur : ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }, [form, selYear, selMonth, refreshAll])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Supprimer cette charge ?')) return
      try {
        await deleteCharge(id)
        await refreshAll()
      } catch (e) {
        alert(`Erreur : ${(e as Error).message}`)
      }
    },
    [refreshAll],
  )

  const handleEdit = useCallback((charge: ChargeMensuelle) => {
    setForm({
      id: charge.id,
      categorie: charge.categorie,
      fournisseur: charge.fournisseur,
      libelle: charge.libelle ?? '',
      montant: charge.montant,
      notes: charge.notes ?? '',
    })
    setShowForm(true)
  }, [])

  // ── Form helpers ───────────────────────────────────────

  const updateCategorie = useCallback((cat: string) => {
    const fournisseurs = FOURNISSEURS_PAR_CATEGORIE[cat]
    setForm((prev) => ({
      ...prev,
      categorie: cat,
      fournisseur: fournisseurs ? fournisseurs[0] : '',
    }))
  }, [])

  // ── Render ─────────────────────────────────────────────

  if (loading) return <div style={{ color: '#64748b' }}>Chargement...</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  const margeColor = (v: number) => (v >= 0 ? '#00C18B' : '#E24B4A')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Finances — Marge mensuelle</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Suivi de la marge nette : commissions, charges et rentabilité par mois.
        </p>
      </div>

      {/* Section 1: 3 KPI cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi
          label={`Com' Tessoria ${MOIS_NOMS[curMonth]}`}
          value={fmtEur(currentMonth?.com_societe ?? 0)}
          color="#00C18B"
          hint="Marge brute société"
        />
        <Kpi
          label="Total charges"
          value={fmtEur(currentMonth?.total_charges ?? 0)}
          color="#BA7517"
          hint="Mois courant"
        />
        <Kpi
          label="Marge nette"
          value={fmtEur(currentMonth?.marge_nette ?? 0)}
          color={margeColor(currentMonth?.marge_nette ?? 0)}
          hint="Mois courant"
        />
      </div>

      {/* Section 2: Main table */}
      <Card title="Marge mensuelle — historique">
        {sortedRows.length === 0 ? (
          <Empty label="Aucune donnée disponible." />
        ) : (
          <table style={tableStyle}>
            <colgroup>
              <col style={{ width: 30 }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr style={trHead}>
                <th style={th} />
                <th style={th}>Période</th>
                <th style={thRight}>Com&apos; Tessoria</th>
                <th style={thRight}>Frais serv.</th>
                <th style={thRight}>Leads</th>
                <th style={thRight}>Coût leads</th>
                <th style={thRight}>Autres charges</th>
                <th style={thRight}>Total charges</th>
                <th style={thRight}>Marge nette</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const key = `${r.annee}-${r.mois}`
                const isExpanded = expandedRow === key
                const charges = chargesCache.get(key)
                return (
                  <>
                    <tr
                      key={key}
                      style={{ ...trBody, cursor: 'pointer' }}
                      onClick={() => toggleRow(r.annee, r.mois)}
                    >
                      <td style={{ ...td, padding: '10px 4px 10px 10px', fontSize: 12 }}>
                        {isExpanded ? '▾' : '▸'}
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {fmtMois(r.annee, r.mois)}
                      </td>
                      <td style={{ ...tdMontant, color: '#0f172a', fontWeight: 600 }}>
                        {fmtEur(r.com_societe)}
                      </td>
                      <td style={{ ...tdMontant, color: '#64748b' }}>
                        {fmtEur(r.frais_service)}
                      </td>
                      <td style={tdMontant}>
                        {r.nb_leads}
                        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>leads</span>
                      </td>
                      <td style={{ ...tdMontant, color: '#64748b' }}>
                        {fmtEur(r.cout_leads)}
                        <span style={{ fontSize: 9, color: '#cbd5e1', marginLeft: 3 }}>(auto)</span>
                      </td>
                      <td style={{ ...tdMontant, color: '#BA7517' }}>
                        {fmtEur(r.total_charges - r.cout_leads)}
                      </td>
                      <td style={{ ...tdMontant, color: '#BA7517' }}>
                        {fmtEur(r.total_charges)}
                      </td>
                      <td
                        style={{
                          ...tdMontant,
                          color: margeColor(r.marge_nette),
                          fontWeight: 700,
                        }}
                      >
                        {fmtEur(r.marge_nette)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${key}-detail`} style={{ background: '#f8fafc' }}>
                        <td colSpan={9} style={{ padding: '10px 20px 14px 40px' }}>
                          {!charges ? (
                            <div style={{ color: '#64748b', fontSize: 12 }}>
                              Chargement...
                            </div>
                          ) : charges.length === 0 ? (
                            <Empty label="Aucune charge saisie pour ce mois." />
                          ) : (
                            <table style={{ ...tableStyle, fontSize: 12 }}>
                              <thead>
                                <tr style={trHead}>
                                  <th style={th}>Catégorie</th>
                                  <th style={th}>Fournisseur</th>
                                  <th style={th}>Libellé</th>
                                  <th style={thRight}>Montant</th>
                                </tr>
                              </thead>
                              <tbody>
                                {charges.map((c) => (
                                  <tr key={c.id} style={trBody}>
                                    <td style={td}>{c.categorie}</td>
                                    <td style={td}>{c.fournisseur}</td>
                                    <td style={{ ...td, color: '#64748b' }}>
                                      {c.libelle ?? '—'}
                                    </td>
                                    <td style={tdMontant}>{fmtEur(c.montant)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              <tr style={trFooter}>
                <td style={tdFooterLabel} />
                <td style={tdFooterLabel}>Total</td>
                <td style={tdFooterMontant}>{fmtEur(totals.com_societe)}</td>
                <td style={{ ...tdFooterMontant, color: '#64748b' }}>
                  {fmtEur(totals.frais_service)}
                </td>
                <td style={{ ...tdFooterMontant, color: '#0f172a' }}>
                  {totals.nb_leads}
                </td>
                <td style={{ ...tdFooterMontant, color: '#64748b' }}>
                  {fmtEur(totals.cout_leads)}
                </td>
                <td style={{ ...tdFooterMontant, color: '#BA7517' }}>
                  {fmtEur(totals.total_charges - totals.cout_leads)}
                </td>
                <td style={{ ...tdFooterMontant, color: '#BA7517' }}>
                  {fmtEur(totals.total_charges)}
                </td>
                <td
                  style={{
                    ...tdFooterMontant,
                    color: margeColor(totals.marge_nette),
                  }}
                >
                  {fmtEur(totals.marge_nette)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>
          Coût leads = nb leads Mapapp × 14,50 € × 1,20 — mis à jour automatiquement depuis PerfLead
        </p>
      </Card>

      {/* Section 3: Saisie des charges */}
      <Card title="Saisir les charges du mois">
        {/* Month/year selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(Number(e.target.value))}
            style={selectStyle}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {MOIS_NOMS[m]}
              </option>
            ))}
          </select>
          <select
            value={selYear}
            onChange={(e) => setSelYear(Number(e.target.value))}
            style={selectStyle}
          >
            {Array.from({ length: 5 }, (_, i) => curYear - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Charges list */}
        {saisieLoading ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>Chargement...</div>
        ) : saisieCharges.length === 0 && !showForm ? (
          <Empty label="Aucune charge saisie pour ce mois." />
        ) : (
          saisieCharges.length > 0 && (
            <table style={{ ...tableStyle, marginBottom: 14 }}>
              <thead>
                <tr style={trHead}>
                  <th style={th}>Catégorie</th>
                  <th style={th}>Fournisseur</th>
                  <th style={th}>Libellé</th>
                  <th style={thRight}>Montant</th>
                  <th style={{ ...th, width: 70, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {saisieCharges.map((c) => {
                  const isLegacyLead =
                    c.categorie.toLowerCase().includes('lead') ||
                    c.fournisseur.toLowerCase() === 'mapapp'
                  return (
                    <tr key={c.id} style={trBody}>
                      <td style={td}>
                        {c.categorie}
                        {isLegacyLead && (
                          <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>
                            (calculé automatiquement)
                          </span>
                        )}
                      </td>
                      <td style={td}>{c.fournisseur}</td>
                      <td style={{ ...td, color: '#64748b' }}>{c.libelle ?? '—'}</td>
                      <td style={tdMontant}>{fmtEur(c.montant)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {isLegacyLead ? (
                          <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(c)}
                              style={iconBtnStyle}
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              style={iconBtnStyle}
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}

        {/* Inline form */}
        {showForm && (
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 14,
              marginBottom: 14,
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Catégorie */}
              <label style={labelStyle}>
                Catégorie
                <select
                  value={form.categorie}
                  onChange={(e) => updateCategorie(e.target.value)}
                  style={inputStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {/* Fournisseur */}
              <label style={labelStyle}>
                Fournisseur
                {FOURNISSEURS_PAR_CATEGORIE[form.categorie] ? (
                  <select
                    value={form.fournisseur}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fournisseur: e.target.value }))
                    }
                    style={inputStyle}
                  >
                    {FOURNISSEURS_PAR_CATEGORIE[form.categorie]!.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.fournisseur}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fournisseur: e.target.value }))
                    }
                    placeholder="Fournisseur"
                    style={inputStyle}
                  />
                )}
              </label>

              {/* Libellé */}
              <label style={labelStyle}>
                Libellé
                <input
                  value={form.libelle}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, libelle: e.target.value }))
                  }
                  placeholder="Libellé"
                  style={inputStyle}
                />
              </label>

              {/* Montant */}
              <label style={labelStyle}>
                Montant
                <input
                  type="number"
                  step="0.01"
                  value={form.montant}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, montant: Number(e.target.value) }))
                  }
                  style={{ ...inputStyle, width: 100 }}
                />
              </label>

              {/* Notes */}
              <label style={labelStyle}>
                Notes
                <input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Notes"
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.fournisseur}
                style={btnPrimary}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setForm({ ...EMPTY_FORM })
                }}
                style={btnSecondary}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => {
              setForm({ ...EMPTY_FORM })
              setShowForm(true)
            }}
            style={btnPrimary}
          >
            + Ajouter une charge
          </button>
        )}
      </Card>
    </div>
  )
}

// ── Shared inline styles ──────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  background: '#fff',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  marginTop: 2,
  width: 150,
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  gap: 2,
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 4px',
  fontSize: 14,
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#00C18B',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#fff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

export default Marge
