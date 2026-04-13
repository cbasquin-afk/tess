import { useMemo } from 'react'
import { Badge, Table } from '@/shared/ui'
import type { TableColumn } from '@/shared/ui'
import type { Compagnie, Protocole } from '../types'

interface Props {
  compagnies: Compagnie[]
  protocoles: Protocole[]
}

function fmtDate(v: string | null): string {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleDateString('fr-FR')
  } catch {
    return v
  }
}

function fmtEur(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function TabProtocoles({ compagnies, protocoles }: Props) {
  const protoByComp = useMemo(() => {
    const m = new Map<string, Protocole[]>()
    for (const p of protocoles) {
      const arr = m.get(p.compagnie_id) ?? []
      arr.push(p)
      m.set(p.compagnie_id, arr)
    }
    return m
  }, [protocoles])

  const coverageRows = useMemo(() => {
    return compagnies.map((c) => ({
      ...c,
      protocoleCount: protoByComp.get(c.id)?.length ?? 0,
    }))
  }, [compagnies, protoByComp])

  const coverageCols: TableColumn<(typeof coverageRows)[0]>[] = [
    {
      key: 'nom',
      header: 'Compagnie',
      render: (r) => <span style={{ fontWeight: 500 }}>{r.nom_court}</span>,
    },
    {
      key: 'statut_protocole',
      header: 'Statut',
      render: (r) => {
        const tone = r.statut_protocole === 'actif' ? 'success'
          : r.statut_protocole === 'manquant' ? 'danger'
          : r.statut_protocole === 'en_cours' ? 'info'
          : 'warning'
        return <Badge tone={tone}>{r.statut_protocole}</Badge>
      },
    },
    {
      key: 'nb_proto',
      header: 'Protocoles',
      render: (r) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {r.protocoleCount || <span style={{ color: '#dc2626' }}>0</span>}
        </span>
      ),
    },
  ]

  const compMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of compagnies) m.set(c.id, c.nom_court)
    return m
  }, [compagnies])

  const detailCols: TableColumn<Protocole>[] = [
    {
      key: 'compagnie',
      header: 'Compagnie',
      render: (r) => compMap.get(r.compagnie_id) ?? r.compagnie_id,
    },
    { key: 'nom_fichier', header: 'Document', render: (r) => r.nom_fichier ?? '—' },
    { key: 'date_signature', header: 'Signature', render: (r) => fmtDate(r.date_signature) },
    { key: 'date_effet', header: 'Effet', render: (r) => fmtDate(r.date_effet) },
    { key: 'date_renouvellement', header: 'Renouvellement', render: (r) => fmtDate(r.date_renouvellement) },
    { key: 'enveloppe_annuelle', header: 'Enveloppe', render: (r) => fmtEur(r.enveloppe_annuelle) },
    {
      key: 'statut',
      header: 'Statut',
      render: (r) => r.statut ? <Badge tone="neutral">{r.statut}</Badge> : '—',
    },
  ]

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Vue couverture</h3>
      <Table columns={coverageCols} rows={coverageRows} rowKey={(r) => r.id} />

      <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Détail protocoles</h3>
      <Table columns={detailCols} rows={protocoles} rowKey={(r) => r.id} empty="Aucun protocole enregistré." />
    </div>
  )
}
