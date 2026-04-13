import { useMemo } from 'react'
import { Badge } from '@/shared/ui'
import type { Compagnie, ConditionReprise } from '../types'

interface Props {
  compagnies: Compagnie[]
  reprises: ConditionReprise[]
}

function pct(v: number | null): string {
  if (v == null) return '—'
  return `${v}%`
}

export function TabReprises({ compagnies, reprises }: Props) {
  const compMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of compagnies) m.set(c.id, c.nom_court)
    return m
  }, [compagnies])

  const grouped = useMemo(() => {
    const m = new Map<string, ConditionReprise[]>()
    for (const r of reprises) {
      const arr = m.get(r.compagnie_id) ?? []
      arr.push(r)
      m.set(r.compagnie_id, arr)
    }
    return m
  }, [reprises])

  const sortedCompIds = useMemo(() => {
    return Array.from(grouped.keys()).sort((a, b) => {
      const na = compMap.get(a) ?? ''
      const nb = compMap.get(b) ?? ''
      return na.localeCompare(nb)
    })
  }, [grouped, compMap])

  if (reprises.length === 0) {
    return <div style={{ padding: 24, color: '#6b7280', fontSize: 14 }}>Aucune condition de reprise enregistrée.</div>
  }

  const cellStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: 13,
    fontFamily: 'JetBrains Mono, monospace',
  }
  const headerStyle: React.CSSProperties = {
    ...cellStyle,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    color: '#6b7280',
    borderBottom: '1px solid #e5e7eb',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {sortedCompIds.map((compId) => {
        const items = grouped.get(compId)!
        const compName = compMap.get(compId) ?? compId
        const first = items[0]

        return (
          <div key={compId}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{compName}</h3>

            {(first.seuil_rejet_pct != null || first.seuil_reclamation_pct != null || first.seuil_resil_pct != null) && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                {first.seuil_rejet_pct != null && (
                  <Badge tone="warning">Rejet &lt; {pct(first.seuil_rejet_pct)}</Badge>
                )}
                {first.seuil_reclamation_pct != null && (
                  <Badge tone="warning">Réclamation &lt; {pct(first.seuil_reclamation_pct)}</Badge>
                )}
                {first.seuil_resil_pct != null && (
                  <Badge tone="warning">Résiliation &lt; {pct(first.seuil_resil_pct)}</Badge>
                )}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={headerStyle}>Produit</th>
                    <th style={headerStyle}>0–3 mois</th>
                    <th style={headerStyle}>4–12 mois</th>
                    <th style={headerStyle}>4–18 mois</th>
                    <th style={headerStyle}>4–24 mois</th>
                    <th style={headerStyle}>12–24 mois</th>
                    <th style={{ ...headerStyle, fontFamily: 'Inter, sans-serif' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td style={{ ...cellStyle, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>{r.produit_nom}</td>
                      <td style={cellStyle}>{r.reprise_0_3_mois ?? '—'}</td>
                      <td style={cellStyle}>{r.reprise_4_12_mois ?? '—'}</td>
                      <td style={cellStyle}>{r.reprise_4_18_mois ?? '—'}</td>
                      <td style={cellStyle}>{r.reprise_4_24_mois ?? '—'}</td>
                      <td style={cellStyle}>{r.reprise_12_24_mois ?? '—'}</td>
                      <td style={{ ...cellStyle, fontFamily: 'Inter, sans-serif', color: '#64748b', fontSize: 12 }}>
                        {r.notes ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
