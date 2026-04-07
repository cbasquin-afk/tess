import { useStats } from '../hooks/useStats'

const CATEGORIE_COLORS: { key: string; hex: string }[] = [
  { key: 'Contrat', hex: '#1D9E75' },
  { key: 'En cours', hex: '#378ADD' },
  { key: 'NRP', hex: '#BA7517' },
  { key: 'Perdu', hex: '#A32D2D' },
  { key: 'Inexploitable', hex: '#888780' },
  { key: 'Rétracté', hex: '#5F5E5A' },
]

const HEX_BY_CAT: Record<string, string> = Object.fromEntries(
  CATEGORIE_COLORS.map((c) => [c.key, c.hex]),
)

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  color?: string
}

function KpiCard({ label, value, hint, color }: KpiCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
        }}
      >
        {value}
      </div>
      {hint && <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>}
    </div>
  )
}

function Dashboard() {
  const { stats, loading, error } = useStats()

  if (loading) {
    return <div style={{ color: '#64748b' }}>Chargement des stats…</div>
  }
  if (error) {
    return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>
  }

  const txOK = stats.txTransformation >= 12
  const pmOK = stats.pmMoyen >= 100
  const maxCategorieCount = Math.max(
    ...CATEGORIE_COLORS.map((c) => stats.byCategorie[c.key] ?? 0),
    1,
  )

  const topStatuts = Object.entries(stats.byStatut)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const maxStatutCount = topStatuts[0]?.[1] ?? 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>PerfLead — Vue générale</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Synthèse leads & contrats sur l'ensemble de la base.
        </p>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <KpiCard label="Leads totaux" value={fmt(stats.total)} />
        <KpiCard
          label="Contrats"
          value={fmt(stats.totalContrats)}
          hint="catégorie « Contrat »"
          color="#1D9E75"
        />
        <KpiCard
          label="Tx transformation"
          value={`${stats.txTransformation.toFixed(1)}% ${txOK ? '✓' : '✗'}`}
          hint="cible ≥ 12%"
          color={txOK ? '#1D9E75' : '#E24B4A'}
        />
        <KpiCard
          label="PM moyen"
          value={`${stats.pmMoyen.toFixed(0)}€`}
          hint={pmOK ? '✓ seuil 100€' : '✗ sous le seuil 100€'}
          color={pmOK ? '#1D9E75' : '#E24B4A'}
        />
        <KpiCard
          label="CA mensuel"
          value={`${stats.totalMensuel.toFixed(0)}€`}
          color="#378ADD"
        />
        <KpiCard
          label="En cours"
          value={fmt(stats.totalEnCours)}
          color="#378ADD"
        />
      </div>

      {/* Funnel + Statuts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 18,
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>
            Répartition par catégorie
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {CATEGORIE_COLORS.map(({ key, hex }) => {
                const n = stats.byCategorie[key] ?? 0
                const pct =
                  stats.total > 0 ? ((n / stats.total) * 100).toFixed(1) : '0.0'
                const bar = Math.round((n / maxCategorieCount) * 100)
                return (
                  <tr key={key}>
                    <td style={{ padding: '8px 0', width: 110 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: hex,
                          marginRight: 8,
                        }}
                      />
                      <span style={{ fontSize: 13, color: '#475569' }}>
                        {key}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div
                        style={{
                          height: 4,
                          background: '#f1f5f9',
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            height: 4,
                            width: `${bar}%`,
                            background: hex,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '8px 0',
                        textAlign: 'right',
                        width: 50,
                        fontSize: 13,
                        fontWeight: 600,
                        color: hex,
                      }}
                    >
                      {fmt(n)}
                    </td>
                    <td
                      style={{
                        padding: '8px 0 8px 10px',
                        textAlign: 'right',
                        width: 50,
                        fontSize: 11,
                        color: '#94a3b8',
                      }}
                    >
                      {pct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 18,
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Top statuts</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {topStatuts.map(([statut, n]) => {
                const cat = stats.byStatutCategorie[statut]
                const hex = cat ? HEX_BY_CAT[cat] ?? '#888780' : '#888780'
                const bar = Math.round((n / maxStatutCount) * 100)
                const pct =
                  stats.total > 0 ? ((n / stats.total) * 100).toFixed(1) : '0'
                return (
                  <tr key={statut}>
                    <td style={{ padding: '8px 0', width: 6 }}>
                      <div
                        style={{
                          width: 3,
                          height: 16,
                          background: hex,
                          borderRadius: 2,
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 240,
                        }}
                      >
                        {statut}
                      </div>
                      <div
                        style={{
                          height: 2,
                          background: '#f1f5f9',
                          borderRadius: 1,
                        }}
                      >
                        <div
                          style={{
                            height: 2,
                            width: `${bar}%`,
                            background: hex,
                            borderRadius: 1,
                          }}
                        />
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '8px 0',
                        textAlign: 'right',
                        width: 40,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {n}
                    </td>
                    <td
                      style={{
                        padding: '8px 0 8px 10px',
                        textAlign: 'right',
                        width: 44,
                        fontSize: 10,
                        color: '#94a3b8',
                      }}
                    >
                      {pct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
