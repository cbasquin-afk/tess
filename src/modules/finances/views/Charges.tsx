import { useCallback, useEffect, useState } from 'react'
import { fetchCharges, upsertCharge, deleteCharge } from '../api'
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
import type { ChargeMensuelle } from '../types'

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

const CATEGORIES = ['OGGO', 'Téléphonie', 'Communication', 'Site', 'Autre'] as const

const FOURNISSEURS_PAR_CATEGORIE: Record<string, string[] | null> = {
  OGGO: ['Oggo', 'Gocardless OGGO'],
  Téléphonie: ['Ringover'],
  Communication: ['JRMC', 'ON OFF', 'Autre'],
  Site: ['Supabase', 'Netlify', 'GitHub', 'Anthropic', 'Stackblitz', 'Autre'],
  Autre: null,
}

function fmtEur(n: number): string {
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

interface ChargeFormState {
  id?: string
  categorie: string
  fournisseur: string
  libelle: string
  montant: number
  nb_leads: number | null
  notes: string
}

const EMPTY_FORM: ChargeFormState = {
  categorie: CATEGORIES[0],
  fournisseur: 'Oggo',
  libelle: '',
  montant: 0,
  nb_leads: null,
  notes: '',
}

function Charges() {
  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [charges, setCharges] = useState<ChargeMensuelle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ChargeFormState>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCharges(await fetchCharges(selYear, selMonth))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [selYear, selMonth])

  useEffect(() => {
    void reload()
  }, [reload])

  const total = charges.reduce((s, c) => s + c.montant, 0)
  const totalLeads = charges.reduce((s, c) => s + (c.nb_leads ?? 0), 0)

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
        nb_leads: form.nb_leads,
        notes: form.notes || null,
      })
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      await reload()
    } catch (e: unknown) {
      alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }, [form, selYear, selMonth, reload])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Supprimer cette charge ?')) return
      try {
        await deleteCharge(id)
        await reload()
      } catch (e: unknown) {
        alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [reload],
  )

  const handleEdit = useCallback((c: ChargeMensuelle) => {
    setForm({
      id: c.id,
      categorie: c.categorie,
      fournisseur: c.fournisseur,
      libelle: c.libelle ?? '',
      montant: c.montant,
      nb_leads: c.nb_leads,
      notes: c.notes ?? '',
    })
    setShowForm(true)
  }, [])

  const updateCategorie = useCallback((cat: string) => {
    const fournisseurs = FOURNISSEURS_PAR_CATEGORIE[cat]
    setForm((prev) => ({
      ...prev,
      categorie: cat,
      fournisseur: fournisseurs ? fournisseurs[0] : '',
    }))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Finances — Charges mensuelles</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Saisie et suivi des charges par mois.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <select
          value={selMonth}
          onChange={(e) => setSelMonth(Number(e.target.value))}
          style={selectStyle}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{MOIS_NOMS[m]}</option>
          ))}
        </select>
        <select
          value={selYear}
          onChange={(e) => setSelYear(Number(e.target.value))}
          style={selectStyle}
        >
          {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading && <div style={{ color: '#64748b', fontSize: 14 }}>Chargement…</div>}
      {error && (
        <div style={{ padding: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 14 }}>
          Erreur : {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
          {charges.length === 0 && !showForm ? (
            <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
              Aucune charge saisie pour {MOIS_NOMS[selMonth]} {selYear}.
            </div>
          ) : (
            charges.length > 0 && (
              <table style={{ ...tableStyle, marginBottom: 14 }}>
                <thead>
                  <tr style={trHead}>
                    <th style={th}>Catégorie</th>
                    <th style={th}>Fournisseur</th>
                    <th style={th}>Libellé</th>
                    <th style={thRight}>Nb leads</th>
                    <th style={thRight}>Montant</th>
                    <th style={{ ...th, width: 70, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => {
                    const isAutoLead =
                      c.categorie.toLowerCase().includes('lead') ||
                      c.fournisseur.toLowerCase() === 'mapapp'
                    return (
                      <tr key={c.id} style={trBody}>
                        <td style={td}>
                          {c.categorie}
                          {isAutoLead && (
                            <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>
                              (auto)
                            </span>
                          )}
                        </td>
                        <td style={td}>{c.fournisseur}</td>
                        <td style={{ ...td, color: '#64748b' }}>{c.libelle ?? '—'}</td>
                        <td style={{ ...tdMontant, color: '#64748b' }}>
                          {c.nb_leads ?? '—'}
                        </td>
                        <td style={tdMontant}>{fmtEur(c.montant)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {isAutoLead ? (
                            <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(c)} style={iconBtn} title="Modifier">
                                ✏️
                              </button>
                              <button onClick={() => handleDelete(c.id)} style={iconBtn} title="Supprimer">
                                🗑️
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={trFooter}>
                    <td style={tdFooterLabel} colSpan={3}>Total</td>
                    <td style={{ ...tdFooterMontant, fontFamily: MONO }}>
                      {totalLeads || '—'}
                    </td>
                    <td style={tdFooterMontant}>{fmtEur(total)}</td>
                    <td style={td} />
                  </tr>
                </tbody>
              </table>
            )
          )}

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
                <label style={labelStyle}>
                  Catégorie
                  <select
                    value={form.categorie}
                    onChange={(e) => updateCategorie(e.target.value)}
                    style={inputStyle}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>
                  Fournisseur
                  {FOURNISSEURS_PAR_CATEGORIE[form.categorie] ? (
                    <select
                      value={form.fournisseur}
                      onChange={(e) => setForm((p) => ({ ...p, fournisseur: e.target.value }))}
                      style={inputStyle}
                    >
                      {FOURNISSEURS_PAR_CATEGORIE[form.categorie]!.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.fournisseur}
                      onChange={(e) => setForm((p) => ({ ...p, fournisseur: e.target.value }))}
                      placeholder="Fournisseur"
                      style={inputStyle}
                    />
                  )}
                </label>
                <label style={labelStyle}>
                  Libellé
                  <input
                    value={form.libelle}
                    onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Montant
                  <input
                    type="number"
                    step="0.01"
                    value={form.montant}
                    onChange={(e) => setForm((p) => ({ ...p, montant: Number(e.target.value) }))}
                    style={{ ...inputStyle, width: 100 }}
                  />
                </label>
                <label style={labelStyle}>
                  Nb leads
                  <input
                    type="number"
                    value={form.nb_leads ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        nb_leads: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    style={{ ...inputStyle, width: 80 }}
                  />
                </label>
                <label style={labelStyle}>
                  Notes
                  <input
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} disabled={saving || !form.fournisseur} style={btnPrimary}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }) }}
                  style={btnSecondary}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {!showForm && (
            <button
              onClick={() => { setForm({ ...EMPTY_FORM }); setShowForm(true) }}
              style={btnPrimary}
            >
              + Ajouter une charge
            </button>
          )}
        </div>
      )}
    </div>
  )
}

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

const iconBtn: React.CSSProperties = {
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

export default Charges
