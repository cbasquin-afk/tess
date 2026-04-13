import { useMemo, useState } from 'react'
import { Badge } from '@/shared/ui'
import type { Compagnie, OffreRemuneration, Verticale } from '../types'

interface Props {
  compagnies: Compagnie[]
  offres: OffreRemuneration[]
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

export function TabSimulateur({ compagnies, offres }: Props) {
  const [verticale, setVerticale] = useState<Verticale | ''>('')
  const [precompteReqis, setPrecompteRequis] = useState(false)

  const compMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of compagnies) m.set(c.id, c.nom_court)
    return m
  }, [compagnies])

  const results = useMemo(() => {
    if (!verticale) return []
    return offres
      .filter((o) => {
        if (o.verticale !== verticale) return false
        if (precompteReqis && !o.precompte_disponible) return false
        if (o.statut_data === 'a_verifier') return false
        return true
      })
      .sort((a, b) => (b.taux_acq_pct ?? 0) - (a.taux_acq_pct ?? 0))
  }, [offres, verticale, precompteReqis])

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    fontSize: 14,
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 4 }}>
            Verticale
          </label>
          <select
            value={verticale}
            onChange={(e) => setVerticale(e.target.value as Verticale | '')}
            style={selectStyle}
          >
            <option value="">— Choisir —</option>
            {Object.entries(VERTICALE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div style={{ paddingTop: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={precompteReqis}
              onChange={(e) => setPrecompteRequis(e.target.checked)}
            />
            Précompte requis
          </label>
        </div>
      </div>

      {!verticale && (
        <div style={{ padding: 32, color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
          Sélectionnez une verticale pour lancer la simulation.
        </div>
      )}

      {verticale && results.length === 0 && (
        <div style={{ padding: 32, color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
          Aucune offre trouvée pour ces critères.
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((o, i) => {
            const isTop = i === 0
            return (
              <div
                key={o.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: isTop ? '#dcfce7' : '#f8fafc',
                  border: isTop ? '2px solid #16a34a' : '1px solid #e5e7eb',
                }}
              >
                <div style={{ minWidth: 28, textAlign: 'center' }}>
                  {isTop ? (
                    <span style={{ fontSize: 18 }}>🏆</span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>#{i + 1}</span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {compMap.get(o.compagnie_id) ?? '?'} — {o.produit_nom}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {o.type_commission}
                    {o.effet_differe_max_mois ? ` · différé ${o.effet_differe_max_mois} mois` : ''}
                    {o.surcom_actif ? ' · surcom.' : ''}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 18 }}>
                    {o.taux_acq_pct != null ? `${o.taux_acq_pct}%` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    récur. {o.taux_rec_pct != null ? `${o.taux_rec_pct}%` : '—'}
                  </div>
                </div>

                <Badge tone={o.precompte_disponible ? 'success' : 'neutral'}>
                  {o.precompte_disponible ? 'précompte' : 'linéaire'}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
