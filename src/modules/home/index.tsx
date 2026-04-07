import { Link } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { MODULES } from '../../shell/modules.config'
import { hasRole } from '../../shared/types'
import { Badge } from '../../shared/ui'

interface Kpi {
  label: string
  value: string
  hint: string
}

const KPIS: Kpi[] = [
  { label: 'Leads actifs', value: '128', hint: '+12 cette semaine' },
  { label: 'Contrats en cours', value: '47', hint: '3 à signer' },
  { label: 'Encaissements (mois)', value: '92 340 €', hint: '+8% vs M-1' },
  { label: 'Sinistres ouverts', value: '6', hint: '2 prioritaires' },
]

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {children}
    </div>
  )
}

function Home() {
  const { user, role } = useAuth()
  const accessible = MODULES.filter(
    (m) => m.id !== 'home' && hasRole(role, m.minRole),
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          Bonjour {user?.prenom ?? 'à toi'} 👋
        </h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Voici un aperçu de l’activité Tessoria.
        </p>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {KPIS.map((k) => (
          <Card key={k.label}>
            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>
              {k.label.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                margin: '6px 0 2px',
              }}
            >
              {k.value}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{k.hint}</div>
          </Card>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Accès rapides</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {accessible.map((m) => (
            <Link
              key={m.id}
              to={m.path}
              style={{
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Card>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <span style={{ fontWeight: 600 }}>{m.label}</span>
                  {m.soon && <Badge tone="warning">soon</Badge>}
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  Ouvrir le module {m.label}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
