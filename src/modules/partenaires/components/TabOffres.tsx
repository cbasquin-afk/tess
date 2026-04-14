import { useMemo, useState } from 'react'
import { Badge, Table } from '@/shared/ui'
import type { TableColumn } from '@/shared/ui'
import { supabase } from '@/shared/supabase'
import type {
  Compagnie,
  OffreRemuneration,
  Verticale,
  StatutData,
  TypeCommission,
} from '../types'

interface Props {
  compagnies: Compagnie[]
  offres: OffreRemuneration[]
  onReload: () => Promise<void>
}

const VERTICALE_LABELS: Record<Verticale, string> = {
  sante_senior: 'Santé Senior',
  sante_tns: 'Santé TNS',
  sante_frontalier: 'Santé Frontalier',
  sante_collective: 'Santé Collective',
  prevoyance: 'Prévoyance',
  homme_cle: 'Homme Clé',
  emprunteur: 'Emprunteur',
  obseques: 'Obsèques',
  animal: 'Animal',
  dependance: 'Dépendance',
  autre: 'Autre',
}

const TYPE_COM_LABELS: Record<TypeCommission, string> = {
  LR: 'Linéaire classique',
  LE: 'Linéaire escompté',
  PA: 'Précompte avancé',
  PS: 'Précompte standard',
  PA_LR: 'Précompte + Linéaire',
}

const TYPE_COM_TOOLTIPS: Record<TypeCommission, string> = {
  LR: 'Versé chaque mois, taux identique sur toute la durée',
  LE: 'Taux renforcé la 1ère année, réduit ensuite',
  PA: 'Versé le mois suivant la signature du contrat',
  PS: "Versé le mois suivant la prise d'effet",
  PA_LR: 'Précompte 1ère année puis linéaire',
}

const TYPE_COM_OPTIONS: TypeCommission[] = ['LR', 'LE', 'PA', 'PS', 'PA_LR']

const STATUT_DATA_TONES: Record<StatutData, 'success' | 'warning' | 'danger'> = {
  complet: 'success',
  incomplet: 'warning',
  a_verifier: 'danger',
}

function pct(v: number | null): string {
  if (v == null) return '—'
  return `${v}%`
}

// ── Cellule éditable type_commission ─────────────────────────
interface TypeCommissionCellProps {
  offre: OffreRemuneration
  onReload: () => Promise<void>
}

function TypeCommissionCell({ offre, onReload }: TypeCommissionCellProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = async (newVal: TypeCommission) => {
    if (newVal === offre.type_commission) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .schema('partenaires')
        .from('offres_remuneration')
        .update({ type_commission: newVal })
        .eq('id', offre.id)
      if (error) throw new Error(error.message)
      await onReload()
    } catch (e: unknown) {
      alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <select
        autoFocus
        disabled={saving}
        defaultValue={offre.type_commission}
        onChange={(e) => void handleChange(e.target.value as TypeCommission)}
        onBlur={() => setEditing(false)}
        style={{
          padding: '4px 6px',
          borderRadius: 4,
          border: '1px solid #1f3a8a',
          fontSize: 12,
          background: '#fff',
        }}
      >
        {TYPE_COM_OPTIONS.map((k) => (
          <option key={k} value={k}>
            {TYPE_COM_LABELS[k]}
          </option>
        ))}
      </select>
    )
  }

  const label = TYPE_COM_LABELS[offre.type_commission] ?? offre.type_commission
  const tooltip = TYPE_COM_TOOLTIPS[offre.type_commission] ?? ''

  return (
    <span
      title={tooltip}
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer',
        display: 'inline-block',
      }}
    >
      <Badge tone="neutral">{label}</Badge>
    </span>
  )
}

export function TabOffres({ compagnies, offres, onReload }: Props) {
  const [verticale, setVerticale] = useState<Verticale | ''>('')
  const [compagnieId, setCompagnieId] = useState('')
  const [statutData, setStatutData] = useState<StatutData | ''>('')

  const compMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of compagnies) m.set(c.id, c.nom_court)
    return m
  }, [compagnies])

  const filtered = useMemo(() => {
    return offres.filter((o) => {
      if (verticale && o.verticale !== verticale) return false
      if (compagnieId && o.compagnie_id !== compagnieId) return false
      if (statutData && o.statut_data !== statutData) return false
      return true
    })
  }, [offres, verticale, compagnieId, statutData])

  const questionsOuvertes = useMemo(() => {
    return filtered.filter((o) => o.questions_ouvertes)
  }, [filtered])

  const columns: TableColumn<OffreRemuneration>[] = [
    {
      key: 'compagnie',
      header: 'Compagnie',
      render: (r) => compMap.get(r.compagnie_id) ?? r.compagnie_id,
    },
    {
      key: 'produit_nom',
      header: 'Produit',
      render: (r) => <span style={{ fontWeight: 500 }}>{r.produit_nom}</span>,
    },
    {
      key: 'verticale',
      header: 'Verticale',
      render: (r) => (
        <span style={{ fontSize: 12 }}>{VERTICALE_LABELS[r.verticale] ?? r.verticale}</span>
      ),
    },
    {
      key: 'type_commission',
      header: 'Structure',
      render: (r) => <TypeCommissionCell offre={r} onReload={onReload} />,
    },
    {
      key: 'taux_acq_pct',
      header: 'Acq. an1',
      render: (r) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {pct(r.taux_acq_pct)}
        </span>
      ),
    },
    {
      key: 'taux_rec_pct',
      header: 'Récurrent',
      render: (r) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {pct(r.taux_rec_pct)}
        </span>
      ),
    },
    {
      key: 'precompte_disponible',
      header: 'Précompte',
      render: (r) => r.precompte_disponible ? '✓' : '—',
    },
    {
      key: 'statut_data',
      header: 'Statut',
      render: (r) => (
        <Badge tone={STATUT_DATA_TONES[r.statut_data] ?? 'neutral'}>
          {r.statut_data}
        </Badge>
      ),
    },
  ]

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    fontSize: 13,
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={verticale} onChange={(e) => setVerticale(e.target.value as Verticale | '')} style={selectStyle}>
          <option value="">Toutes verticales</option>
          {Object.entries(VERTICALE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select value={compagnieId} onChange={(e) => setCompagnieId(e.target.value)} style={selectStyle}>
          <option value="">Toutes compagnies</option>
          {compagnies.map((c) => (
            <option key={c.id} value={c.id}>{c.nom_court}</option>
          ))}
        </select>

        <select value={statutData} onChange={(e) => setStatutData(e.target.value as StatutData | '')} style={selectStyle}>
          <option value="">Tous statuts</option>
          <option value="complet">Complet</option>
          <option value="incomplet">Incomplet</option>
          <option value="a_verifier">À vérifier</option>
        </select>

        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {filtered.length} offre{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      <Table columns={columns} rows={filtered} rowKey={(r) => r.id} empty="Aucune offre." />

      {questionsOuvertes.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#92400e' }}>
            Questions ouvertes ({questionsOuvertes.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {questionsOuvertes.map((o) => (
              <div
                key={o.id}
                style={{
                  padding: '8px 12px',
                  background: '#fef3c7',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <strong>{compMap.get(o.compagnie_id)}</strong> — {o.produit_nom} :{' '}
                {o.questions_ouvertes}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
