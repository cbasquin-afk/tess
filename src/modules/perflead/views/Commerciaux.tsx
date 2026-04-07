import { useMemo } from 'react'
import { useLeads } from '../hooks/useLeads'
import type { CommercialStats, Lead } from '../types'

const COMMERCIAUX = [
  'Christopher BASQUIN',
  'Charlotte BOCOGNANO',
  'Cheyenne DEBENATH',
] as const

function calcStats(leadsComm: Lead[], nom: string): CommercialStats {
  const c = leadsComm.filter((l) => l.categorie === 'Contrat').length
  const ec = leadsComm.filter((l) => l.categorie === 'En cours').length
  const p = leadsComm.filter(
    (l) => l.categorie === 'Perdu' || l.categorie === 'Rétracté',
  ).length
  const pipe = c + ec + p
  return {
    nom,
    prenom: nom.split(' ')[0] ?? nom,
    total: leadsComm.length,
    contrats: c,
    enCours: ec,
    perdu: p,
    pipe,
    txConversion: pipe > 0 ? (c / pipe) * 100 : 0,
  }
}

function tcColor(tc: number): string {
  if (tc >= 40) return '#1D9E75'
  if (tc >= 25) return '#BA7517'
  return '#E24B4A'
}

function Commerciaux() {
  const { leads, loading, error } = useLeads()

  const rows = useMemo<CommercialStats[]>(() => {
    return COMMERCIAUX.map((nom) =>
      calcStats(
        leads.filter((l) => l.attribution === nom),
        nom,
      ),
    )
  }, [leads])

  const allComm = useMemo(
    () =>
      leads.filter((l) =>
        (COMMERCIAUX as readonly string[]).includes(l.attribution ?? ''),
      ),
    [leads],
  )
  const global = useMemo(
    () => calcStats(allComm, 'Global'),
    [allComm],
  )

  const maxTc = Math.max(...rows.map((r) => r.txConversion), 1)

  if (loading) {
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  }
  if (error) {
    return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Commerciaux</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Pipe travaillé hors pioche · taux de conversion sur leads exploitables.
        </p>
      </div>

      {/* KPIs globaux */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi label="Pipe global" value={global.pipe.toString()} />
        <Kpi
          label="Contrats"
          value={global.contrats.toString()}
          color="#1D9E75"
        />
        <Kpi
          label="Tx conversion"
          value={`${global.txConversion.toFixed(1)}%`}
          color={global.txConversion >= 30 ? '#1D9E75' : '#BA7517'}
        />
      </div>

      {/* Tableau */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}
        >
          <thead>
            <tr style={{ color: '#64748b', fontWeight: 600 }}>
              <th style={th}>Commercial</th>
              <th style={th}>Pipe</th>
              <th style={th}>Contrats</th>
              <th style={th}>En cours</th>
              <th style={th}>Perdu</th>
              <th style={th}>Tx conversion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const col = tcColor(r.txConversion)
              const barW = Math.round((r.txConversion / maxTc) * 100)
              return (
                <tr
                  key={r.nom}
                  style={{ borderTop: '1px solid #f1f5f9' }}
                >
                  <td
                    style={{
                      ...td,
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {r.prenom}
                  </td>
                  <td style={td}>{r.pipe}</td>
                  <td style={{ ...td, color: '#1D9E75', fontWeight: 600 }}>
                    {r.contrats}
                  </td>
                  <td style={{ ...td, color: '#378ADD' }}>{r.enCours}</td>
                  <td style={{ ...td, color: '#A32D2D' }}>{r.perdu}</td>
                  <td style={{ ...td, minWidth: 220 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: '#f1f5f9',
                          borderRadius: 3,
                        }}
                      >
                        <div
                          style={{
                            height: 6,
                            width: `${barW}%`,
                            background: col,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: col,
                          minWidth: 50,
                          textAlign: 'right',
                        }}
                      >
                        {r.txConversion.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px 10px 0',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 12,
}
const td: React.CSSProperties = {
  padding: '14px 12px 14px 0',
  color: '#475569',
}

interface KpiProps {
  label: string
  value: string
  color?: string
}
function Kpi({ label, value, color }: KpiProps) {
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
    </div>
  )
}

export default Commerciaux
