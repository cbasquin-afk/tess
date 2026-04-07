import { useLeads } from '../hooks/useLeads'
import { useAlertes } from '../hooks/useAlertes'
import type { AlerteLead } from '../types'

function joursColor(j: number): string {
  if (j > 14) return '#E24B4A'
  if (j >= 7) return '#BA7517'
  return '#1D9E75'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return iso
  }
}

interface SectionProps {
  title: string
  emoji: string
  rows: AlerteLead[]
  accentColor: string
}

function Section({ title, emoji, rows, accentColor }: SectionProps) {
  return (
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
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        <span
          style={{
            background: `${accentColor}15`,
            color: accentColor,
            padding: '2px 10px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
          Rien à signaler.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Nom</th>
              <th style={th}>Tél</th>
              <th style={th}>Statut</th>
              <th style={th}>Commercial</th>
              <th style={th}>Dernière modif</th>
              <th style={{ ...th, textAlign: 'right' }}>Jours</th>
              <th style={{ ...th, textAlign: 'right' }}>Lien</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const nom =
                [r.prenom, r.nom].filter(Boolean).join(' ').trim() || '—'
              const commercial = r.attribution?.split(' ')[0] ?? '—'
              const col = joursColor(r.joursDepuisModif)
              return (
                <tr
                  key={r.identifiant_projet ?? Math.random()}
                  style={{ borderTop: '1px solid #f1f5f9' }}
                >
                  <td
                    style={{
                      ...td,
                      fontWeight: 500,
                      color: '#0f172a',
                    }}
                  >
                    {nom}
                  </td>
                  <td style={{ ...td, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                    {r.telephone ?? '—'}
                  </td>
                  <td style={{ ...td, color: '#475569' }}>{r.statut}</td>
                  <td style={{ ...td, color: '#64748b' }}>{commercial}</td>
                  <td style={{ ...td, color: '#94a3b8' }}>
                    {fmtDate(r.derniere_modification)}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: 'right',
                      color: col,
                      fontWeight: 700,
                    }}
                  >
                    {r.joursDepuisModif}j
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {r.url_projet ? (
                      <a
                        href={r.url_projet}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#378ADD',
                          textDecoration: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ↗ ouvrir
                      </a>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Alertes() {
  const { leads, loading, error } = useLeads()
  const { nrp, bloque, froid } = useAlertes(leads)

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>🔔 Alertes</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Leads nécessitant une action rapide.
        </p>
      </div>

      <Section
        title="NRP à relancer (modifié il y a > 7j)"
        emoji="📞"
        rows={nrp}
        accentColor="#BA7517"
      />
      <Section
        title="En cours bloqués (modifié il y a > 14j)"
        emoji="🚧"
        rows={bloque}
        accentColor="#E24B4A"
      />
      <Section
        title="Leads froids (créés > 30j, sans contact récent)"
        emoji="🧊"
        rows={froid}
        accentColor="#378ADD"
      />
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

export default Alertes
