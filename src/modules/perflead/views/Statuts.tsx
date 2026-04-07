import { useMemo, useState, type ChangeEvent } from 'react'
import { useLeads } from '../hooks/useLeads'

const CAT_COLORS: Record<string, string> = {
  Contrat: '#1D9E75',
  'En cours': '#378ADD',
  NRP: '#BA7517',
  Perdu: '#A32D2D',
  Inexploitable: '#888780',
  Rétracté: '#5F5E5A',
}

const CAT_BG: Record<string, string> = {
  Contrat: 'rgba(29,158,117,0.1)',
  'En cours': 'rgba(55,138,221,0.1)',
  NRP: 'rgba(186,117,23,0.1)',
  Perdu: 'rgba(163,45,45,0.1)',
  Inexploitable: 'rgba(136,135,128,0.1)',
  Rétracté: 'rgba(95,94,90,0.1)',
}

const CATEGORIES = [
  'Contrat',
  'En cours',
  'NRP',
  'Perdu',
  'Inexploitable',
  'Rétracté',
] as const

interface StatutRow {
  statut: string
  categorie: string
  count: number
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function Statuts() {
  const { leads, loading, error } = useLeads()
  const [filterCat, setFilterCat] = useState<string>('')

  const rows = useMemo<StatutRow[]>(() => {
    const counts = new Map<string, { count: number; categorie: string }>()
    for (const l of leads) {
      const key = l.statut || 'Inconnu'
      const cur = counts.get(key)
      if (cur) {
        cur.count += 1
      } else {
        counts.set(key, { count: 1, categorie: l.categorie })
      }
    }
    return Array.from(counts.entries())
      .map<StatutRow>(([statut, v]) => ({
        statut,
        categorie: v.categorie,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [leads])

  const filtered = useMemo(
    () => (filterCat ? rows.filter((r) => r.categorie === filterCat) : rows),
    [rows, filterCat],
  )

  const total = useMemo(() => filtered.reduce((a, r) => a + r.count, 0), [
    filtered,
  ])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Statuts détaillés</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Tableau exhaustif de tous les statuts CRM rencontrés dans les leads.
        </p>
      </div>

      <div
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
            justifyContent: 'space-between',
            marginBottom: 12,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <select
            value={filterCat}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setFilterCat(e.target.value)
            }
            style={{
              padding: '6px 12px',
              fontSize: 13,
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              background: '#fff',
              color: '#0f172a',
            }}
          >
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {fmt(filtered.length)} statuts · {fmt(total)} leads
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Statut CRM</th>
              <th style={th}>Catégorie</th>
              <th style={{ ...th, textAlign: 'right' }}>Leads</th>
              <th style={{ ...th, textAlign: 'right' }}>% du filtre</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 13,
                    fontStyle: 'italic',
                  }}
                >
                  Aucun statut.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const col = CAT_COLORS[r.categorie] ?? '#888780'
                const bg = CAT_BG[r.categorie] ?? 'rgba(128,128,128,0.08)'
                const pct = total > 0 ? (r.count / total) * 100 : 0
                return (
                  <tr key={r.statut} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, color: '#475569' }}>{r.statut}</td>
                    <td style={td}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: bg,
                          color: col,
                        }}
                      >
                        {r.categorie}
                      </span>
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        color: col,
                        fontWeight: 700,
                      }}
                    >
                      {fmt(r.count)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        color: '#94a3b8',
                        fontSize: 11,
                      }}
                    >
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })
            )}
            {filtered.length > 0 && (
              <tr
                style={{
                  background: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 700,
                }}
              >
                <td style={{ ...td, color: '#0f172a' }}>Total</td>
                <td style={td}></td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    color: '#0f172a',
                  }}
                >
                  {fmt(total)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    color: '#94a3b8',
                  }}
                >
                  100%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

export default Statuts
