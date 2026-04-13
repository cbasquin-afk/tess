import { useMemo, useState } from 'react'
import { Badge, Table } from '@/shared/ui'
import type { TableColumn } from '@/shared/ui'
import type { Compagnie, OffreRemuneration, TypeRelation } from '../types'

interface Props {
  compagnies: Compagnie[]
  offres: OffreRemuneration[]
}

const RELATION_LABELS: Record<TypeRelation, string> = {
  '360_courtage': '360 Courtage',
  direct_tessoria: 'Direct Tessoria',
}

const STATUT_TONES: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  actif: 'success',
  en_cours: 'info',
  manquant: 'danger',
  expire: 'warning',
}

export function TabCompagnies({ compagnies, offres }: Props) {
  const [filtre, setFiltre] = useState<TypeRelation | ''>('')

  const offreCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of offres) {
      map.set(o.compagnie_id, (map.get(o.compagnie_id) ?? 0) + 1)
    }
    return map
  }, [offres])

  const rows = useMemo(() => {
    if (!filtre) return compagnies
    return compagnies.filter((c) => c.type_relation === filtre)
  }, [compagnies, filtre])

  const columns: TableColumn<Compagnie>[] = [
    {
      key: 'nom',
      header: 'Compagnie',
      render: (r) => (
        <span style={{ fontWeight: 600 }}>{r.nom}</span>
      ),
    },
    {
      key: 'nom_court',
      header: 'Abrégé',
      render: (r) => r.nom_court,
    },
    {
      key: 'type_relation',
      header: 'Relation',
      render: (r) => (
        <Badge tone="info">{RELATION_LABELS[r.type_relation] ?? r.type_relation}</Badge>
      ),
    },
    {
      key: 'statut_protocole',
      header: 'Statut protocole',
      render: (r) => (
        <Badge tone={STATUT_TONES[r.statut_protocole] ?? 'neutral'}>
          {r.statut_protocole}
        </Badge>
      ),
    },
    {
      key: 'code_courtier',
      header: 'Code courtier',
      render: (r) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          {r.code_courtier ?? '—'}
        </span>
      ),
    },
    {
      key: 'nb_offres',
      header: 'Offres',
      render: (r) => {
        const n = offreCount.get(r.id) ?? 0
        if (n === 0) {
          return (
            <span style={{ color: '#dc2626', fontWeight: 600 }}>
              ⚠ 0
            </span>
          )
        }
        return n
      },
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (r) => (
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {r.notes ?? ''}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: '#64748b' }}>Filtre relation :</label>
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value as TypeRelation | '')}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            fontSize: 13,
          }}
        >
          <option value="">Toutes</option>
          <option value="360_courtage">360 Courtage</option>
          <option value="direct_tessoria">Direct Tessoria</option>
        </select>
        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
          {rows.length} compagnie{rows.length > 1 ? 's' : ''}
        </span>
      </div>

      <Table columns={columns} rows={rows} rowKey={(r) => r.id} empty="Aucune compagnie." />
    </div>
  )
}
