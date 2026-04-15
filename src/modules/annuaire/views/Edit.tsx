import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '@/shared/ui'
import {
  deleteFormule,
  deleteRegle,
  fetchFicheEdit,
  setFormuleReference,
  toggleRegleActif,
  updateMutuelle,
  upsertFormule,
  upsertRegle,
  upsertStatut,
  type FicheEditResult,
} from '../api'
import { StatutBadge } from '../components/StatutBadge'
import { PartenaireBadge } from '../components/PartenaireBadge'
import { NiveauPill } from '../components/NiveauPill'
import { ScoreBar } from '../components/ScoreBar'
import {
  NIVEAUX,
  SITUATIONS,
  VERTICALES_ANNUAIRE,
  type FormuleNiveau,
  type MutuelleEditableFields,
  type NiveauTessoria,
  type RecommandationRule,
  type SituationReco,
  type StatutPage,
  type StatutPartenaire,
  type TarifParAge,
} from '../types'

type TabId = 'identite' | 'garanties' | 'tarifs' | 'recommandation'

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'identite', label: 'Identité' },
  { id: 'garanties', label: 'Garanties' },
  { id: 'tarifs', label: 'Tarifs' },
  { id: 'recommandation', label: 'Recommandation' },
] as const

interface Toast {
  message: string
  level: 'success' | 'error'
}

function Edit() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<FicheEditResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('identite')
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((t: Toast) => {
    setToast(t)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchFicheEdit(slug))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  if (!slug) return <div style={{ padding: 24 }}>Slug manquant.</div>
  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ padding: 24, color: '#dc2626' }}>Erreur : {error}</div>
  if (!data || !data.mutuelle) {
    return <div style={{ padding: 24 }}>Fiche introuvable pour « {slug} ».</div>
  }

  const { mutuelle, statut, formules, regles } = data
  const effectiveStatut: { statut_page: StatutPage; statut_partenaire: StatutPartenaire } =
    statut
      ? { statut_page: statut.statut_page, statut_partenaire: statut.statut_partenaire }
      : { statut_page: 'brouillon', statut_partenaire: 'non_partenaire' }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Link
        to="/annuaire"
        style={{
          display: 'inline-block',
          fontSize: 12,
          color: '#64748b',
          textDecoration: 'none',
          marginBottom: 10,
        }}
      >
        ← Retour à la liste
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          {mutuelle.seo_title_override || slug}
        </h1>
        <StatutBadge value={effectiveStatut.statut_page} />
        <PartenaireBadge value={effectiveStatut.statut_partenaire} />
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20, fontFamily: 'JetBrains Mono, monospace' }}>
        {slug}
      </p>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: 24,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? '#1f3a8a' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom:
                activeTab === t.id ? '2px solid #1f3a8a' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'identite' && (
        <TabIdentite
          slug={slug}
          mutuelle={mutuelle}
          statut={statut}
          onReload={load}
          onToast={showToast}
        />
      )}
      {activeTab === 'garanties' && (
        <TabGaranties
          slug={slug}
          formules={formules}
          onReload={load}
          onToast={showToast}
        />
      )}
      {activeTab === 'tarifs' && (
        <TabTarifs slug={slug} mutuelle={mutuelle} onReload={load} onToast={showToast} />
      )}
      {activeTab === 'recommandation' && (
        <TabRecommandation
          slug={slug}
          regles={regles}
          onReload={load}
          onToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            padding: '10px 16px',
            borderRadius: 8,
            background: toast.level === 'success' ? '#10b981' : '#ef4444',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ══════════════ Tab 1 — Identité ══════════════════════════════

interface TabIdentiteProps {
  slug: string
  mutuelle: MutuelleEditableFields
  statut: FicheEditResult['statut']
  onReload: () => Promise<void>
  onToast: (t: Toast) => void
}

function TabIdentite({ slug, mutuelle, statut, onReload, onToast }: TabIdentiteProps) {
  const [form, setForm] = useState({
    statut_page: (statut?.statut_page ?? 'brouillon') as StatutPage,
    statut_partenaire: (statut?.statut_partenaire ?? 'non_partenaire') as StatutPartenaire,
    verticales: statut?.verticales ?? [],
    alerte_verif: statut?.alerte_verif ?? false,
    note_interne: statut?.note_interne ?? '',
    prix_entree_marche: mutuelle.prix_entree_marche,
    prix_entree_age_label: mutuelle.prix_entree_age_label ?? '',
    note_courtier: mutuelle.note_courtier,
    age_min_verifie: mutuelle.age_min_verifie,
    age_max_verifie: mutuelle.age_max_verifie,
    age_min_adhesion: mutuelle.age_min_adhesion,
    age_max_adhesion: mutuelle.age_max_adhesion,
    noindex: mutuelle.noindex,
    seo_title_override: mutuelle.seo_title_override ?? '',
    seo_meta_override: mutuelle.seo_meta_override ?? '',
    analyse_courtier: mutuelle.analyse_courtier ?? '',
    ce_que_tessoria_en_pense: mutuelle.ce_que_tessoria_en_pense ?? '',
    points_forts: mutuelle.points_forts ?? [],
    points_vigilance: mutuelle.points_vigilance ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const originalStatut = statut?.statut_page ?? 'brouillon'

  const toggleVerticale = (v: string) => {
    setForm((prev) => ({
      ...prev,
      verticales: prev.verticales.includes(v)
        ? prev.verticales.filter((x) => x !== v)
        : [...prev.verticales, v],
    }))
  }

  const updatePointsArray = (
    key: 'points_forts' | 'points_vigilance',
    index: number,
    value: string,
  ) => {
    setForm((prev) => {
      const arr = [...(prev[key] ?? [])]
      arr[index] = value
      return { ...prev, [key]: arr }
    })
  }

  const addPoint = (key: 'points_forts' | 'points_vigilance') => {
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ''] }))
  }

  const removePoint = (key: 'points_forts' | 'points_vigilance', index: number) => {
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== index),
    }))
  }

  const doSave = useCallback(async () => {
    setSaving(true)
    try {
      await Promise.all([
        upsertStatut({
          slug,
          statut_page: form.statut_page,
          statut_partenaire: form.statut_partenaire,
          verticales: form.verticales,
          alerte_verif: form.alerte_verif,
          note_interne: form.note_interne || null,
        }),
        updateMutuelle(slug, {
          prix_entree_marche: form.prix_entree_marche,
          prix_entree_age_label: form.prix_entree_age_label || null,
          note_courtier: form.note_courtier,
          age_min_verifie: form.age_min_verifie,
          age_max_verifie: form.age_max_verifie,
          age_min_adhesion: form.age_min_adhesion,
          age_max_adhesion: form.age_max_adhesion,
          noindex: form.noindex,
          seo_title_override: form.seo_title_override || null,
          seo_meta_override: form.seo_meta_override || null,
          analyse_courtier: form.analyse_courtier || null,
          ce_que_tessoria_en_pense: form.ce_que_tessoria_en_pense || null,
          points_forts: form.points_forts.filter((p) => p.trim().length > 0),
          points_vigilance: form.points_vigilance.filter((p) => p.trim().length > 0),
        }),
      ])
      onToast({ message: 'Identité sauvegardée', level: 'success' })
      await onReload()
    } catch (e: unknown) {
      onToast({
        message: e instanceof Error ? e.message : String(e),
        level: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [slug, form, onReload, onToast])

  const handleSave = () => {
    if (form.statut_page === 'archivee' && originalStatut === 'publiee') {
      setConfirmArchive(true)
      return
    }
    void doSave()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Section title="Statut & visibilité">
        <Field label="Statut page">
          <select
            value={form.statut_page}
            onChange={(e) =>
              setForm({ ...form, statut_page: e.target.value as StatutPage })
            }
            style={inputStyle}
          >
            <option value="publiee">Publiée</option>
            <option value="brouillon">Brouillon</option>
            <option value="archivee">Archivée</option>
          </select>
        </Field>
        <Field label="Statut partenaire">
          <select
            value={form.statut_partenaire}
            onChange={(e) =>
              setForm({
                ...form,
                statut_partenaire: e.target.value as StatutPartenaire,
              })
            }
            style={inputStyle}
          >
            <option value="partenaire_direct">Partenaire direct</option>
            <option value="partenaire_indirect">Partenaire indirect</option>
            <option value="non_partenaire">Non partenaire</option>
          </select>
        </Field>
        <Field label="Verticales">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {VERTICALES_ANNUAIRE.map((v) => (
              <label
                key={v}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
              >
                <input
                  type="checkbox"
                  checked={form.verticales.includes(v)}
                  onChange={() => toggleVerticale(v)}
                />
                {v}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Alerte vérification">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={form.alerte_verif}
              onChange={(e) => setForm({ ...form, alerte_verif: e.target.checked })}
            />
            <span style={{ fontSize: 13 }}>À revoir</span>
          </label>
        </Field>
        <Field label="Note interne" full>
          <textarea
            value={form.note_interne}
            onChange={(e) => setForm({ ...form, note_interne: e.target.value })}
            rows={3}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
          />
        </Field>
      </Section>

      <Section title="Données compagnie">
        <Field label="Prix entrée marché (€)">
          <input
            type="number"
            value={form.prix_entree_marche ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                prix_entree_marche: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Libellé âge prix entrée">
          <input
            type="text"
            value={form.prix_entree_age_label}
            onChange={(e) =>
              setForm({ ...form, prix_entree_age_label: e.target.value })
            }
            placeholder="ex: pour 65 ans"
            style={inputStyle}
          />
        </Field>
        <Field label="Note courtier (0–5)">
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={form.note_courtier ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                note_courtier: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Âge min vérifié">
          <input
            type="number"
            value={form.age_min_verifie ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                age_min_verifie: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Âge max vérifié">
          <input
            type="number"
            value={form.age_max_verifie ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                age_max_verifie: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Âge min adhésion">
          <input
            type="number"
            value={form.age_min_adhesion ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                age_min_adhesion: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Âge max adhésion">
          <input
            type="number"
            value={form.age_max_adhesion ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                age_max_adhesion: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={inputStyle}
          />
        </Field>
        <Field label="noindex">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={form.noindex}
              onChange={(e) => setForm({ ...form, noindex: e.target.checked })}
            />
            <span style={{ fontSize: 13 }}>Exclure des moteurs</span>
          </label>
        </Field>
      </Section>

      <Section title="SEO">
        <Field label="Title override" full>
          <input
            type="text"
            value={form.seo_title_override}
            onChange={(e) => setForm({ ...form, seo_title_override: e.target.value })}
            style={{ ...inputStyle, width: '100%' }}
          />
        </Field>
        <Field label="Meta description override" full>
          <textarea
            value={form.seo_meta_override}
            onChange={(e) => setForm({ ...form, seo_meta_override: e.target.value })}
            rows={3}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
          />
        </Field>
      </Section>

      <Section title="Contenu courtier">
        <Field label="Analyse courtier" full>
          <textarea
            value={form.analyse_courtier}
            onChange={(e) => setForm({ ...form, analyse_courtier: e.target.value })}
            rows={4}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
          />
        </Field>
        <Field label="Ce que Tessoria en pense" full>
          <textarea
            value={form.ce_que_tessoria_en_pense}
            onChange={(e) =>
              setForm({ ...form, ce_que_tessoria_en_pense: e.target.value })
            }
            rows={3}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
          />
        </Field>
        <Field label="Points forts" full>
          <PointsArray
            values={form.points_forts}
            color="#10b981"
            onChange={(i, v) => updatePointsArray('points_forts', i, v)}
            onAdd={() => addPoint('points_forts')}
            onRemove={(i) => removePoint('points_forts', i)}
          />
        </Field>
        <Field label="Points vigilance" full>
          <PointsArray
            values={form.points_vigilance}
            color="#f59e0b"
            onChange={(i, v) => updatePointsArray('points_vigilance', i, v)}
            onAdd={() => addPoint('points_vigilance')}
            onRemove={(i) => removePoint('points_vigilance', i)}
          />
        </Field>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button onClick={handleSave} disabled={saving} style={btnPrimary}>
          {saving ? 'Enregistrement…' : 'Sauvegarder'}
        </button>
      </div>

      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Confirmer l'archivage"
      >
        <p style={{ fontSize: 13, color: '#475569' }}>
          Cette fiche est actuellement publiée. L'archiver la retirera de
          l'annuaire public. Confirmer ?
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={() => setConfirmArchive(false)} style={btnSecondary}>
            Annuler
          </button>
          <button
            onClick={() => {
              setConfirmArchive(false)
              void doSave()
            }}
            style={{ ...btnPrimary, background: '#ef4444' }}
          >
            Archiver
          </button>
        </div>
      </Modal>
    </div>
  )
}

function PointsArray({
  values,
  color,
  onChange,
  onAdd,
  onRemove,
}: {
  values: string[]
  color: string
  onChange: (i: number, v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 6 }}>
          <span style={{ color, fontWeight: 700, minWidth: 16 }}>•</span>
          <input
            type="text"
            value={v}
            onChange={(e) => onChange(i, e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => onRemove(i)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: 14,
            }}
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        style={{
          ...btnSecondary,
          alignSelf: 'flex-start',
          padding: '4px 10px',
          fontSize: 12,
        }}
      >
        + Ajouter
      </button>
    </div>
  )
}

// ══════════════ Tab 2 — Garanties ═════════════════════════════

interface TabGarantiesProps {
  slug: string
  formules: FormuleNiveau[]
  onReload: () => Promise<void>
  onToast: (t: Toast) => void
}

interface NewFormuleState {
  gamme: string
  formule_ref: string
  niveau_tessoria: NiveauTessoria
  est_formule_reference: boolean
  ordre_affichage: number
}

function TabGaranties({ slug, formules, onReload, onToast }: TabGarantiesProps) {
  const [local, setLocal] = useState<FormuleNiveau[]>(formules)
  const [dirty, setDirty] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newF, setNewF] = useState<NewFormuleState>({
    gamme: '',
    formule_ref: '',
    niveau_tessoria: 'essentiel',
    est_formule_reference: false,
    ordre_affichage: 0,
  })

  useEffect(() => {
    setLocal(formules)
    setDirty(new Set())
  }, [formules])

  const updateLocal = (id: number, patch: Partial<FormuleNiveau>) => {
    setLocal((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    setDirty((prev) => new Set(prev).add(id))
  }

  const handleSaveAll = useCallback(async () => {
    if (dirty.size === 0) return
    setSaving(true)
    try {
      const toSave = local.filter((f) => dirty.has(f.id))
      for (const f of toSave) {
        await upsertFormule(f)
      }
      onToast({ message: `${toSave.length} formule(s) sauvegardée(s)`, level: 'success' })
      setDirty(new Set())
      await onReload()
    } catch (e: unknown) {
      onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
    } finally {
      setSaving(false)
    }
  }, [dirty, local, onReload, onToast])

  const handleToggleRef = useCallback(
    async (f: FormuleNiveau) => {
      // Optimistic
      setLocal((prev) =>
        prev.map((x) =>
          x.niveau_tessoria === f.niveau_tessoria
            ? { ...x, est_formule_reference: x.id === f.id }
            : x,
        ),
      )
      try {
        await setFormuleReference(slug, f.id, f.niveau_tessoria)
        onToast({ message: 'Référence mise à jour', level: 'success' })
      } catch (e: unknown) {
        onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
        await onReload()
      }
    },
    [slug, onReload, onToast],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      setDeleteId(null)
      try {
        await deleteFormule(id)
        onToast({ message: 'Formule supprimée', level: 'success' })
        await onReload()
      } catch (e: unknown) {
        onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
      }
    },
    [onReload, onToast],
  )

  const handleAdd = useCallback(async () => {
    if (!newF.gamme.trim() || !newF.formule_ref.trim()) {
      onToast({ message: 'Gamme et formule requises', level: 'error' })
      return
    }
    try {
      await upsertFormule({
        slug,
        gamme: newF.gamme.trim(),
        formule_ref: newF.formule_ref.trim(),
        niveau_tessoria: newF.niveau_tessoria,
        est_formule_reference: newF.est_formule_reference,
        ordre_affichage: newF.ordre_affichage,
        valide_depuis: new Date().toISOString().split('T')[0] ?? null,
      })
      onToast({ message: 'Formule ajoutée', level: 'success' })
      setShowAdd(false)
      setNewF({
        gamme: '',
        formule_ref: '',
        niveau_tessoria: 'essentiel',
        est_formule_reference: false,
        ordre_affichage: 0,
      })
      await onReload()
    } catch (e: unknown) {
      onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
    }
  }, [newF, slug, onReload, onToast])

  const niveauxDetectes = Array.from(new Set(local.map((f) => f.niveau_tessoria)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <div>
          <strong>Mappage formules → niveaux Tessoria</strong>{' '}
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {local.length} formule(s)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {dirty.size > 0 && (
            <button onClick={() => void handleSaveAll()} disabled={saving} style={btnPrimary}>
              {saving ? 'Sauvegarde…' : `Sauvegarder (${dirty.size})`}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} style={btnSecondary}>
            + Ajouter formule
          </button>
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Gamme</th>
              <th style={th}>Formule ref</th>
              <th style={th}>Niveau Tessoria</th>
              <th style={{ ...th, textAlign: 'center' }}>⭐ Référence</th>
              <th style={th}>Ordre</th>
              <th style={th}>Depuis</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {local.map((f) => (
              <tr
                key={f.id}
                style={{
                  borderTop: '1px solid #f1f5f9',
                  background: dirty.has(f.id) ? '#fffbeb' : 'transparent',
                }}
              >
                <td style={td}>{f.gamme}</td>
                <td style={{ ...td, fontWeight: 500 }}>{f.formule_ref}</td>
                <td style={td}>
                  <select
                    value={f.niveau_tessoria}
                    onChange={(e) =>
                      updateLocal(f.id, {
                        niveau_tessoria: e.target.value as NiveauTessoria,
                      })
                    }
                    style={{ ...inputStyle, width: 140 }}
                  >
                    {NIVEAUX.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button
                    onClick={() => void handleToggleRef(f)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 18,
                      opacity: f.est_formule_reference ? 1 : 0.25,
                    }}
                    title={
                      f.est_formule_reference
                        ? 'Référence'
                        : 'Définir comme référence'
                    }
                  >
                    ⭐
                  </button>
                </td>
                <td style={td}>
                  <input
                    type="number"
                    value={f.ordre_affichage ?? 0}
                    onChange={(e) =>
                      updateLocal(f.id, { ordre_affichage: Number(e.target.value) })
                    }
                    style={{ ...inputStyle, width: 60 }}
                  />
                </td>
                <td style={{ ...td, fontSize: 11, color: '#94a3b8' }}>
                  {f.valide_depuis ?? '—'}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button
                    onClick={() => setDeleteId(f.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {local.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                  }}
                >
                  Aucune formule mappée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {niveauxDetectes.length > 0 && (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: '#475569',
          }}
        >
          Niveaux calculés : {niveauxDetectes.map((n) => <NiveauPill key={n} value={n} />)}
        </div>
      )}

      {/* Modal delete */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Supprimer la formule"
      >
        <p style={{ fontSize: 13 }}>Confirmer la suppression de cette formule ?</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={() => setDeleteId(null)} style={btnSecondary}>
            Annuler
          </button>
          <button
            onClick={() => deleteId !== null && void handleDelete(deleteId)}
            style={{ ...btnPrimary, background: '#ef4444' }}
          >
            Supprimer
          </button>
        </div>
      </Modal>

      {/* Modal add */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Ajouter une formule"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Gamme" full>
            <input
              type="text"
              value={newF.gamme}
              onChange={(e) => setNewF({ ...newF, gamme: e.target.value })}
              style={{ ...inputStyle, width: '100%' }}
            />
          </Field>
          <Field label="Formule de référence" full>
            <input
              type="text"
              list="formule-suggestions"
              value={newF.formule_ref}
              onChange={(e) => setNewF({ ...newF, formule_ref: e.target.value })}
              style={{ ...inputStyle, width: '100%' }}
            />
            <datalist id="formule-suggestions">
              {formules.map((f) => (
                <option key={f.id} value={f.formule_ref} />
              ))}
            </datalist>
          </Field>
          <Field label="Niveau Tessoria" full>
            <select
              value={newF.niveau_tessoria}
              onChange={(e) =>
                setNewF({ ...newF, niveau_tessoria: e.target.value as NiveauTessoria })
              }
              style={{ ...inputStyle, width: '100%' }}
            >
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Ordre d'affichage" full>
            <input
              type="number"
              value={newF.ordre_affichage}
              onChange={(e) =>
                setNewF({ ...newF, ordre_affichage: Number(e.target.value) })
              }
              style={{ ...inputStyle, width: '100%' }}
            />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={newF.est_formule_reference}
              onChange={(e) =>
                setNewF({ ...newF, est_formule_reference: e.target.checked })
              }
            />
            Définir comme référence pour ce niveau
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowAdd(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={() => void handleAdd()} style={btnPrimary}>
              Ajouter
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════ Tab 3 — Tarifs ═══════════════════════════════

interface TabTarifsProps {
  slug: string
  mutuelle: MutuelleEditableFields
  onReload: () => Promise<void>
  onToast: (t: Toast) => void
}

function TabTarifs({ slug, mutuelle, onReload, onToast }: TabTarifsProps) {
  const [tarifs, setTarifs] = useState<TarifParAge[]>(mutuelle.tarifs_par_age ?? [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTarifs(mutuelle.tarifs_par_age ?? [])
  }, [mutuelle.tarifs_par_age])

  const updateRow = (idx: number, patch: Partial<TarifParAge>) => {
    setTarifs((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }
  const removeRow = (idx: number) => {
    setTarifs((prev) => prev.filter((_, i) => i !== idx))
  }
  const addRow = () => {
    const maxAge = tarifs.reduce((m, t) => Math.max(m, t.age), 0)
    setTarifs((prev) => [...prev, { age: maxAge + 1, prix_min: 0, prix_max: 0 }])
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const sorted = [...tarifs].sort((a, b) => a.age - b.age)
      await updateMutuelle(slug, { tarifs_par_age: sorted })
      onToast({ message: 'Tarifs sauvegardés', level: 'success' })
      await onReload()
    } catch (e: unknown) {
      onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
    } finally {
      setSaving(false)
    }
  }, [slug, tarifs, onReload, onToast])

  const sortedForDisplay = [...tarifs].sort((a, b) => a.age - b.age)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 8,
          padding: 14,
          fontSize: 13,
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <strong>Source :</strong>{' '}
            {mutuelle.source_tarifs ?? '—'}
            {mutuelle.source_tarifs_url && (
              <a
                href={mutuelle.source_tarifs_url}
                target="_blank"
                rel="noreferrer"
                style={{ marginLeft: 6, fontSize: 12, color: '#1f3a8a' }}
              >
                🔗 lien
              </a>
            )}
          </div>
          <div>
            <strong>Date :</strong> {mutuelle.source_tarifs_date ?? '—'}
          </div>
          <div>
            {mutuelle.source_tarifs_validee ? (
              <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Validée</span>
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Non validée
              </span>
            )}
          </div>
        </div>
        {mutuelle.source_tarifs_note && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
            Note : {mutuelle.source_tarifs_note}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Âge</th>
              <th style={th}>Prix min (€)</th>
              <th style={th}>Prix max (€)</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedForDisplay.map((t, idx) => {
              // Find the original index in unsorted tarifs
              const originalIdx = tarifs.findIndex(
                (x) => x.age === t.age && x.prix_min === t.prix_min && x.prix_max === t.prix_max,
              )
              return (
                <tr key={`${t.age}-${idx}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <input
                      type="number"
                      value={t.age}
                      onChange={(e) =>
                        updateRow(originalIdx, { age: Number(e.target.value) })
                      }
                      style={{ ...inputStyle, width: 80 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      step="0.01"
                      value={t.prix_min}
                      onChange={(e) =>
                        updateRow(originalIdx, { prix_min: Number(e.target.value) })
                      }
                      style={{ ...inputStyle, width: 100 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      step="0.01"
                      value={t.prix_max}
                      onChange={(e) =>
                        updateRow(originalIdx, { prix_max: Number(e.target.value) })
                      }
                      style={{ ...inputStyle, width: 100 }}
                    />
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button
                      onClick={() => removeRow(originalIdx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              )
            })}
            {sortedForDisplay.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                  }}
                >
                  Aucun tarif. Cliquer « Ajouter tranche » pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <button onClick={addRow} style={btnSecondary}>
          + Ajouter tranche
        </button>
        <button onClick={() => void handleSave()} disabled={saving} style={btnPrimary}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder tarifs'}
        </button>
      </div>
    </div>
  )
}

// ══════════════ Tab 4 — Recommandation ═══════════════════════

interface TabRecommandationProps {
  slug: string
  regles: RecommandationRule[]
  onReload: () => Promise<void>
  onToast: (t: Toast) => void
}

const SITUATION_LABELS: Record<SituationReco, { label: string; bg: string; color: string }> = {
  fin_collectif: { label: 'Fin collectif', bg: '#dbeafe', color: '#1e40af' },
  trop_cher: { label: 'Trop cher', bg: '#fed7aa', color: '#c2410c' },
  gros_soin: { label: 'Gros soin', bg: '#fee2e2', color: '#991b1b' },
  couple: { label: 'Couple', bg: '#dcfce7', color: '#166534' },
  independant: { label: 'Indépendant', bg: '#ede9fe', color: '#6d28d9' },
}

function SituationBadge({ value }: { value: SituationReco | null }) {
  if (!value) {
    return <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
  }
  const s = SITUATION_LABELS[value]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  )
}

type RegleForm = Omit<RecommandationRule, 'id' | 'updated_at'> & { id?: number }

function emptyRegle(slug: string): RegleForm {
  return {
    slug,
    situation: null,
    age_band: null,
    besoin_prioritaire: null,
    niveau_cible: null,
    score: 50,
    argument_pour: null,
    argument_contre: null,
    alternative_slug: null,
    alternative_argument: null,
    actif: true,
  }
}

function TabRecommandation({
  slug,
  regles,
  onReload,
  onToast,
}: TabRecommandationProps) {
  const [local, setLocal] = useState(regles)
  const [editing, setEditing] = useState<RegleForm | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    setLocal(regles)
  }, [regles])

  const handleToggle = useCallback(
    async (r: RecommandationRule) => {
      const newActif = !r.actif
      setLocal((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, actif: newActif } : x)),
      )
      try {
        await toggleRegleActif(r.id, newActif)
      } catch (e: unknown) {
        onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
        await onReload()
      }
    },
    [onReload, onToast],
  )

  const handleSave = useCallback(async () => {
    if (!editing) return
    try {
      await upsertRegle(editing)
      onToast({ message: 'Règle sauvegardée', level: 'success' })
      setEditing(null)
      await onReload()
    } catch (e: unknown) {
      onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
    }
  }, [editing, onReload, onToast])

  const handleDelete = useCallback(
    async (id: number) => {
      setDeleteId(null)
      try {
        await deleteRegle(id)
        onToast({ message: 'Règle supprimée', level: 'success' })
        await onReload()
      } catch (e: unknown) {
        onToast({ message: e instanceof Error ? e.message : String(e), level: 'error' })
      }
    },
    [onReload, onToast],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{local.length} règle(s) de recommandation</strong>
        <button onClick={() => setEditing(emptyRegle(slug))} style={btnPrimary}>
          + Ajouter règle
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Situation</th>
              <th style={th}>Âge</th>
              <th style={th}>Besoin</th>
              <th style={th}>Niveau cible</th>
              <th style={th}>Score</th>
              <th style={{ ...th, textAlign: 'center' }}>Actif</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {local.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={td}><SituationBadge value={r.situation} /></td>
                <td style={{ ...td, fontSize: 12 }}>{r.age_band ?? '—'}</td>
                <td style={{ ...td, fontSize: 12, color: '#475569' }}>
                  {r.besoin_prioritaire ?? '—'}
                </td>
                <td style={td}>
                  {r.niveau_cible ? <NiveauPill value={r.niveau_cible} /> : '—'}
                </td>
                <td style={td}><ScoreBar value={r.score} /></td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={r.actif}
                    onChange={() => void handleToggle(r)}
                  />
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button
                    onClick={() => setEditing(r)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      marginRight: 6,
                    }}
                    title="Éditer"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteId(r.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {local.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                  }}
                >
                  Aucune règle. Cliquer « Ajouter règle » pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal edit */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Modifier la règle' : 'Nouvelle règle'}
      >
        {editing && (
          <RegleForm
            value={editing}
            onChange={setEditing}
            onSave={() => void handleSave()}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* Modal delete */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Supprimer la règle"
      >
        <p style={{ fontSize: 13 }}>Confirmer la suppression de cette règle ?</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={() => setDeleteId(null)} style={btnSecondary}>
            Annuler
          </button>
          <button
            onClick={() => deleteId !== null && void handleDelete(deleteId)}
            style={{ ...btnPrimary, background: '#ef4444' }}
          >
            Supprimer
          </button>
        </div>
      </Modal>
    </div>
  )
}

function RegleForm({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: RegleForm
  onChange: (v: RegleForm) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Field label="Situation" full>
        <select
          value={value.situation ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              situation: (e.target.value || null) as SituationReco | null,
            })
          }
          style={{ ...inputStyle, width: '100%' }}
        >
          <option value="">— Aucune —</option>
          {SITUATIONS.map((s) => (
            <option key={s} value={s}>{SITUATION_LABELS[s].label}</option>
          ))}
        </select>
      </Field>
      <Field label="Tranche d'âge" full>
        <input
          type="text"
          value={value.age_band ?? ''}
          onChange={(e) => onChange({ ...value, age_band: e.target.value || null })}
          placeholder="ex: 55-65"
          style={{ ...inputStyle, width: '100%' }}
        />
      </Field>
      <Field label="Besoin prioritaire" full>
        <input
          type="text"
          value={value.besoin_prioritaire ?? ''}
          onChange={(e) =>
            onChange({ ...value, besoin_prioritaire: e.target.value || null })
          }
          style={{ ...inputStyle, width: '100%' }}
        />
      </Field>
      <Field label="Niveau cible" full>
        <select
          value={value.niveau_cible ?? ''}
          onChange={(e) =>
            onChange({ ...value, niveau_cible: e.target.value || null })
          }
          style={{ ...inputStyle, width: '100%' }}
        >
          <option value="">— Aucun —</option>
          {NIVEAUX.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </Field>
      <Field label={`Score : ${value.score}`} full>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max="100"
            value={value.score}
            onChange={(e) => onChange({ ...value, score: Number(e.target.value) })}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={value.score}
            onChange={(e) => onChange({ ...value, score: Number(e.target.value) })}
            style={{ ...inputStyle, width: 70 }}
          />
        </div>
      </Field>
      <Field label="Argument pour" full>
        <textarea
          value={value.argument_pour ?? ''}
          onChange={(e) =>
            onChange({ ...value, argument_pour: e.target.value || null })
          }
          rows={2}
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </Field>
      <Field label="Argument contre" full>
        <textarea
          value={value.argument_contre ?? ''}
          onChange={(e) =>
            onChange({ ...value, argument_contre: e.target.value || null })
          }
          rows={2}
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </Field>
      <Field label="Alternative (slug compagnie)" full>
        <input
          type="text"
          value={value.alternative_slug ?? ''}
          onChange={(e) =>
            onChange({ ...value, alternative_slug: e.target.value || null })
          }
          style={{ ...inputStyle, width: '100%' }}
        />
      </Field>
      <Field label="Argument alternative" full>
        <textarea
          value={value.alternative_argument ?? ''}
          onChange={(e) =>
            onChange({ ...value, alternative_argument: e.target.value || null })
          }
          rows={2}
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={value.actif}
          onChange={(e) => onChange({ ...value, actif: e.target.checked })}
        />
        Actif
      </label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onCancel} style={btnSecondary}>Annuler</button>
        <button onClick={onSave} style={btnPrimary}>Sauvegarder</button>
      </div>
    </div>
  )
}

// ══════════════ Helpers UI ═══════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#0f172a' }}>
        {title}
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
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
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
}
const td: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
}
const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  background: '#fff',
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#1f3a8a',
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

export default Edit
