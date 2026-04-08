import { useMemo } from 'react'
import { useStats } from '../hooks/useStats'

const CATEGORIES_ORDER = [
  { key: 'Contrat', hex: '#1D9E75' },
  { key: 'En cours', hex: '#378ADD' },
  { key: 'NRP', hex: '#BA7517' },
  { key: 'Perdu', hex: '#A32D2D' },
  { key: 'Inexploitable', hex: '#888780' },
  { key: 'Rétracté', hex: '#5F5E5A' },
] as const

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function Entonnoir() {
  const { leads, stats, loading, error } = useStats()

  // Statuts groupés par catégorie
  const grouped = useMemo(() => {
    const m = new Map<string, { statut: string; count: number }[]>()
    for (const cat of CATEGORIES_ORDER) m.set(cat.key, [])
    const counts = new Map<string, number>()
    for (const l of leads) {
      const k = `${l.categorie}|${l.statut}`
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    for (const [k, count] of counts.entries()) {
      const [cat, statut] = k.split('|')
      if (!cat || !statut) continue
      const arr = m.get(cat) ?? []
      arr.push({ statut, count })
      m.set(cat, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => b.count - a.count)
    return m
  }, [leads])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  const pipe = stats.totalContrats + stats.totalEnCours
  const txTraite = stats.total > 0 ? (pipe / stats.total) * 100 : 0
  const txPipe =
    pipe > 0 ? (stats.totalContrats / pipe) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Entonnoir de conversion</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Vue agrégée par catégorie et détail des statuts.
        </p>
      </div>

      {/* Entonnoir */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 22,
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Entonnoir global</h3>
        <FunnelStep
          label="Leads totaux"
          value={stats.total}
          width={100}
          color="#378ADD"
        />
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#94a3b8',
            margin: '6px 0',
          }}
        >
          ↓ {txTraite.toFixed(1)}% travaillés
        </div>
        <FunnelStep
          label="Pipe travaillé"
          value={pipe}
          width={Math.max(stats.total > 0 ? (pipe / stats.total) * 100 : 0, 25)}
          color="#BA7517"
        />
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#94a3b8',
            margin: '6px 0',
          }}
        >
          ↓ {txPipe.toFixed(1)}% conversion
        </div>
        <FunnelStep
          label="Contrats signés"
          value={stats.totalContrats}
          width={Math.max(stats.total > 0 ? (stats.totalContrats / stats.total) * 100 : 0, 12)}
          color="#1D9E75"
        />
      </div>

      {/* Détail par catégorie */}
      {CATEGORIES_ORDER.map((cat) => {
        const rows = grouped.get(cat.key) ?? []
        const totalCat = rows.reduce((a, b) => a + b.count, 0)
        if (rows.length === 0) return null
        return (
          <div
            key={cat.key}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: cat.hex,
                }}
              />
              <h3 style={{ margin: 0, fontSize: 14 }}>{cat.key}</h3>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>
                {fmt(totalCat)} leads
              </span>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <tbody>
                {rows.map((r) => {
                  const pct =
                    stats.total > 0 ? (r.count / stats.total) * 100 : 0
                  return (
                    <tr key={r.statut}>
                      <td
                        style={{
                          padding: '6px 12px 6px 0',
                          color: '#475569',
                        }}
                      >
                        {r.statut}
                      </td>
                      <td
                        style={{
                          padding: '6px 12px',
                          textAlign: 'right',
                          width: 60,
                          color: cat.hex,
                          fontWeight: 600,
                        }}
                      >
                        {r.count}
                      </td>
                      <td
                        style={{
                          padding: '6px 0',
                          textAlign: 'right',
                          width: 60,
                          color: '#94a3b8',
                          fontSize: 11,
                        }}
                      >
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

interface FunnelStepProps {
  label: string
  value: number
  width: number
  color: string
}
function FunnelStep({ label, value, width, color }: FunnelStepProps) {
  return (
    <div
      style={{
        margin: '0 auto',
        width: `${width}%`,
        minWidth: 200,
        background: color,
        color: '#fff',
        padding: '14px 20px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700 }}>{fmt(value)}</span>
    </div>
  )
}

export default Entonnoir
